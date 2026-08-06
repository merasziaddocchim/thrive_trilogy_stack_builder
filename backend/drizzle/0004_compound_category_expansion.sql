-- Compound category expansion — batch-2 registry (CLAIMS_COMPLIANCE §4e).
--
-- Adds six values to compound_category. The original four (nad_precursor, methylation,
-- longevity_compound, delivery_modifier) described batch 1, where every compound was an NAD
-- precursor, a methyl donor, or a longevity small-molecule. Of the 36 compounds batch 2 adds,
-- 19 fit none of them — vitamins, minerals, a fatty acid, amino acids, botanical extracts, a
-- hormone and membrane phospholipids — and filing those under longevity_compound would empty
-- that value of meaning.
--
-- ADDS VALUES ONLY. No row here uses a new value, and none can: compound rows are written by
-- the separate founder-run script `npm run db:add-compounds`, in a later transaction.
--
-- That separation is required, not stylistic. Verified on PostgreSQL 16.13:
--   * ALTER TYPE ... ADD VALUE inside a transaction block SUCCEEDS (Postgres 12+).
--   * Using a value added in the SAME transaction FAILS —
--       "ERROR: unsafe use of new value of enum type
--        HINT: New enum values must be committed before they can be used."
--     and because that aborts the transaction, the ADD VALUEs roll back too, so the migration
--     would appear to do nothing and every later insert would fail on a missing value.
-- Drizzle's migrator is stricter than "one transaction per file": pg-core/dialect.js wraps the
-- whole pending set in a SINGLE session.transaction(), so an INSERT using a new value anywhere
-- in this run would abort every pending migration, not just this one. Keep row writes out.
--
-- IF NOT EXISTS makes each statement idempotent, so a re-run is a no-op rather than an error.
-- Existing rows are untouched: adding a value neither rewrites nor revalidates them.

ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'micronutrient';--> statement-breakpoint
ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'fatty_acid';--> statement-breakpoint
ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'amino_acid';--> statement-breakpoint
ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'botanical_extract';--> statement-breakpoint
ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'structural_compound';--> statement-breakpoint
ALTER TYPE "public"."compound_category" ADD VALUE IF NOT EXISTS 'hormone';
