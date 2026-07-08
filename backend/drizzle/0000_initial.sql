-- Initial migration — matches src/db/schema.ts
-- Three-layer model (TECH_DOCS §1). Compliance NOT NULL on scoring_parameters
-- (evidence_tier, contributing_source_ids) per CLAIMS_COMPLIANCE §4 / TECH_DOCS §4.

-- ===== Enums =====
CREATE TYPE "public"."study_type" AS ENUM('meta_analysis', 'systematic_review', 'RCT', 'cohort_observational', 'animal_model', 'in_vitro', 'case_report', 'mechanism_review');--> statement-breakpoint
CREATE TYPE "public"."population_match" AS ENUM('general_healthy_adult', 'older_adult_55plus', 'clinical_condition', 'animal_model', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."journal_tier" AS ENUM('tier_1_high_impact', 'tier_2_peer_reviewed', 'tier_3_preprint_or_low_impact');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending_ai_extraction', 'ai_extracted', 'human_reviewed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."compound_category" AS ENUM('nad_precursor', 'methylation', 'longevity_compound', 'delivery_modifier');--> statement-breakpoint
CREATE TYPE "public"."delivery_format" AS ENUM('standard_capsule', 'liposomal', 'sublingual', 'powder', 'injectable');--> statement-breakpoint
CREATE TYPE "public"."effect_direction" AS ENUM('positive', 'null_no_effect', 'negative');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('synergistic', 'redundant_pathway', 'antagonistic', 'contraindicated_with_medication_class');--> statement-breakpoint
CREATE TYPE "public"."interaction_severity" AS ENUM('informational', 'caution', 'avoid');--> statement-breakpoint
CREATE TYPE "public"."evidence_tier" AS ENUM('A_strong', 'B_moderate', 'C_limited', 'D_preliminary');--> statement-breakpoint

-- ===== Layer 1: sources =====
CREATE TABLE "sources" (
	"source_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"citation" text NOT NULL,
	"doi_or_url" text,
	"study_type" "study_type" NOT NULL,
	"sample_size" integer,
	"population_match" "population_match" NOT NULL,
	"journal_tier" "journal_tier" NOT NULL,
	"publication_date" timestamp,
	"extraction_status" "extraction_status" DEFAULT 'pending_ai_extraction' NOT NULL,
	"reviewer_id" uuid,
	"review_date" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- ===== Layer 2: compounds =====
CREATE TABLE "compounds" (
	"compound_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"aliases" text[],
	"category" "compound_category" NOT NULL,
	"mechanism_summary" text
);--> statement-breakpoint

CREATE TABLE "dose_records" (
	"dose_record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"studied_dose_min_mg" real,
	"studied_dose_max_mg" real,
	"studied_duration_weeks" integer,
	"delivery_format" "delivery_format",
	"outcome_measured" text,
	"effect_direction" "effect_direction",
	"effect_size" text,
	"extraction_method" text,
	"reviewer_id" uuid,
	"review_date" timestamp
);--> statement-breakpoint

CREATE TABLE "bioavailability_records" (
	"bioavailability_record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid NOT NULL,
	"delivery_format" "delivery_format" NOT NULL,
	"relative_bioavailability_pct" real,
	"source_id" uuid NOT NULL
);--> statement-breakpoint

CREATE TABLE "interaction_records" (
	"interaction_record_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id_a" uuid NOT NULL,
	"compound_id_b" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"mechanism_note" text,
	"severity" "interaction_severity" DEFAULT 'informational' NOT NULL,
	"source_id" uuid NOT NULL
);--> statement-breakpoint

-- ===== Layer 3: scoring_parameters (compliance NOT NULL) =====
CREATE TABLE "scoring_parameters" (
	"scoring_parameter_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compound_id" uuid NOT NULL,
	"goal_tag" text NOT NULL,
	"recommended_range_low_mg" real,
	"recommended_range_high_mg" real,
	"evidence_tier" "evidence_tier" NOT NULL,
	"contributing_source_ids" uuid[] NOT NULL,
	"evidence_tier_rationale" text,
	"bioavailability_adjustment_factor" real,
	"last_reviewed_date" timestamp
);--> statement-breakpoint

-- ===== User-side tables =====
CREATE TABLE "user_profiles" (
	"user_profile_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"goals_ranked" jsonb,
	"budget_monthly" real,
	"risk_tolerance" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "user_stack_items" (
	"user_stack_item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"compound_id" uuid,
	"dose_taken_mg" real,
	"delivery_format" "delivery_format",
	"price_paid" real,
	"source" text
);--> statement-breakpoint

CREATE TABLE "user_lab_results" (
	"user_lab_result_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"marker" text,
	"value" real,
	"unit" text,
	"taken_at" timestamp
);--> statement-breakpoint

CREATE TABLE "user_feedback" (
	"user_feedback_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"compound_id" uuid,
	"outcome_self_report" text,
	"reported_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "assessments" (
	"assessment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- ===== Foreign keys =====
ALTER TABLE "dose_records" ADD CONSTRAINT "dose_records_compound_id_compounds_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_records" ADD CONSTRAINT "dose_records_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bioavailability_records" ADD CONSTRAINT "bioavailability_records_compound_id_compounds_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bioavailability_records" ADD CONSTRAINT "bioavailability_records_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_records" ADD CONSTRAINT "interaction_records_compound_id_a_compounds_compound_id_fk" FOREIGN KEY ("compound_id_a") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_records" ADD CONSTRAINT "interaction_records_compound_id_b_compounds_compound_id_fk" FOREIGN KEY ("compound_id_b") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_records" ADD CONSTRAINT "interaction_records_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_parameters" ADD CONSTRAINT "scoring_parameters_compound_id_compounds_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stack_items" ADD CONSTRAINT "user_stack_items_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stack_items" ADD CONSTRAINT "user_stack_items_compound_id_compounds_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lab_results" ADD CONSTRAINT "user_lab_results_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_compound_id_compounds_compound_id_fk" FOREIGN KEY ("compound_id") REFERENCES "public"."compounds"("compound_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_profile_id_user_profiles_user_profile_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("user_profile_id") ON DELETE no action ON UPDATE no action;
