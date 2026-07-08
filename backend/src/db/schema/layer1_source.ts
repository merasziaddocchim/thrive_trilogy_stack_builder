import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import {
  studyTypeEnum,
  populationMatchEnum,
  journalTierEnum,
  extractionStatusEnum,
} from './enums.js';

// Layer 1 - Source registry: one record per paper, before any extraction (TECH_DOCS §1).
export const source = pgTable('source', {
  sourceId: uuid('source_id').defaultRandom().primaryKey(),
  citation: text('citation').notNull(),
  doiOrUrl: text('doi_or_url'),
  studyType: studyTypeEnum('study_type').notNull(),
  sampleSize: integer('sample_size'),
  populationMatch: populationMatchEnum('population_match').notNull(),
  journalTier: journalTierEnum('journal_tier').notNull(),
  publicationDate: timestamp('publication_date', { mode: 'date' }),
  extractionStatus: extractionStatusEnum('extraction_status')
    .notNull()
    .default('pending_ai_extraction'),
  reviewerId: uuid('reviewer_id'),
  reviewDate: timestamp('review_date', { mode: 'date' }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
