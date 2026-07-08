import { pgEnum } from 'drizzle-orm/pg-core';

// Enum values taken verbatim from TECH_DOCS §1 so the DB is the enforced source of truth.
export const studyTypeEnum = pgEnum('study_type', [
  'meta_analysis',
  'systematic_review',
  'RCT',
  'cohort_observational',
  'animal_model',
  'in_vitro',
  'case_report',
  'mechanism_review',
]);

export const populationMatchEnum = pgEnum('population_match', [
  'general_healthy_adult',
  'older_adult_55plus',
  'clinical_condition',
  'animal_model',
  'n/a',
]);

export const journalTierEnum = pgEnum('journal_tier', [
  'tier_1_high_impact',
  'tier_2_peer_reviewed',
  'tier_3_preprint_or_low_impact',
]);

export const extractionStatusEnum = pgEnum('extraction_status', [
  'pending_ai_extraction',
  'ai_extracted',
  'human_reviewed',
  'rejected',
]);

export const compoundCategoryEnum = pgEnum('compound_category', [
  'nad_precursor',
  'methylation',
  'longevity_compound',
  'delivery_modifier',
]);

export const deliveryFormatEnum = pgEnum('delivery_format', [
  'standard_capsule',
  'liposomal',
  'sublingual',
  'powder',
  'injectable',
]);

export const effectDirectionEnum = pgEnum('effect_direction', [
  'positive',
  'null_no_effect',
  'negative',
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'synergistic',
  'redundant_pathway',
  'antagonistic',
  'contraindicated_with_medication_class',
]);

export const interactionSeverityEnum = pgEnum('interaction_severity', [
  'informational',
  'caution',
  'avoid',
]);

// Evidence tiers: A_strong | B_moderate | C_limited | D_preliminary (TECH_DOCS §1 / §2).
export const evidenceTierEnum = pgEnum('evidence_tier', [
  'A_strong',
  'B_moderate',
  'C_limited',
  'D_preliminary',
]);
