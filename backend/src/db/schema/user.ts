import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { deliveryFormatEnum } from './enums.js';

// User-side tables (TECH_DOCS §1 - standard shape). Kept intentionally minimal at scaffold stage.
export const userProfile = pgTable('user_profile', {
  userProfileId: uuid('user_profile_id').defaultRandom().primaryKey(),
  email: text('email'),
  // Goals ranked; stored as ordered JSON at scaffold stage.
  goalsRanked: jsonb('goals_ranked'),
  budgetMonthly: real('budget_monthly'),
  riskTolerance: text('risk_tolerance'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userStackItem = pgTable('user_stack_item', {
  userStackItemId: uuid('user_stack_item_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfile.userProfileId),
  compoundId: uuid('compound_id'),
  doseTakenMg: real('dose_taken_mg'),
  deliveryFormat: deliveryFormatEnum('delivery_format'),
  pricePaid: real('price_paid'),
  // 'photo_scan' | 'manual'
  source: text('source'),
});

export const userLabResult = pgTable('user_lab_result', {
  userLabResultId: uuid('user_lab_result_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfile.userProfileId),
  marker: text('marker'),
  value: real('value'),
  unit: text('unit'),
  takenAt: timestamp('taken_at', { mode: 'date' }),
});

// Feeds a separate, clearly-labeled personalization layer only - never alters evidence_tier (TECH_DOCS §3).
export const userFeedback = pgTable('user_feedback', {
  userFeedbackId: uuid('user_feedback_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id')
    .notNull()
    .references(() => userProfile.userProfileId),
  compoundId: uuid('compound_id'),
  outcomeSelfReport: text('outcome_self_report'),
  reportedAt: timestamp('reported_at').notNull().defaultNow(),
});

// Assessment envelope - links a profile + stack snapshot to a computed result (see API §6).
export const assessment = pgTable('assessment', {
  assessmentId: uuid('assessment_id').defaultRandom().primaryKey(),
  userProfileId: uuid('user_profile_id').references(() => userProfile.userProfileId),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
