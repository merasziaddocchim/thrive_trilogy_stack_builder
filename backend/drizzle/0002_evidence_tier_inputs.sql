DO $$ BEGIN
 CREATE TYPE "public"."evidence_direction" AS ENUM('positive', 'null_no_effect', 'negative', 'mixed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."outcome_proximity" AS ENUM('clinical_outcome', 'surrogate_biomarker', 'performance_or_self_report');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "scoring_parameters" ADD COLUMN IF NOT EXISTS "outcome_proximity" "outcome_proximity";--> statement-breakpoint
ALTER TABLE "scoring_parameters" ADD COLUMN IF NOT EXISTS "direction_of_evidence" "evidence_direction";