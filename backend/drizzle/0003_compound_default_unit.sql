-- Adds compounds.default_unit (CLAIMS_COMPLIANCE §4b): the unit a compound is dosed in
-- throughout the human-reviewed literature, used to resolve a bare number a user types.
-- Nullable, and an unbackfilled row is a valid state — where it is NULL, no unit is inferred.
--
-- `IF NOT EXISTS` added by hand: drizzle-kit emits a bare ADD COLUMN, but every migration in
-- this folder from 0001 on is re-runnable and this one must match. Additive only — no data is
-- read, moved, or destroyed, and nothing is backfilled here (see src/db/corrections/).
ALTER TABLE "compounds" ADD COLUMN IF NOT EXISTS "default_unit" text;
