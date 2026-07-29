# Migrations

Generated SQL migrations live here and are committed so deploys (Render) can apply
them with `npm run db:migrate`. Review migration SQL before applying — the schema is
meant to stay auditable (TECH_DOCS §1).

## History: the empty `0000` snapshot, and what it caused

The initial migration `0000_initial.sql` was **hand-authored** to match
`src/db/schema.ts` exactly, and it applies correctly. Its companion
`meta/0000_snapshot.json` is a **minimal placeholder** — `"tables": {}` — not a real
column-level snapshot. It is still that placeholder today.

This README used to carry a warning to regenerate that snapshot *before* creating the
first new migration, or drizzle-kit would diff against an empty baseline and re-create
every table in a spurious `0001`. **That warning was not acted on, and exactly that
happened.** `0001_assessment_sessions` (2026-07-19, PR #7) was generated against the
empty snapshot, so despite its name it re-declares all 10 enums, all 12 tables, every
foreign key and the index — not just `assessment_sessions`.

**It is safe, and it stays.** Every statement in it is guarded — `CREATE TABLE IF NOT
EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DO $$ … EXCEPTION WHEN duplicate_object THEN
null` around each enum and constraint — so re-running it against a database that already
has the schema is a no-op. That is the "additive with IF-NOT-EXISTS guards, safe to
re-run" property `STATUS.md` §8 relies on, and why Render can run `db:migrate` on every
deploy.

**Going forward the baseline is correct.** `meta/0001_snapshot.json` is a complete
12-table snapshot, so `npm run db:generate` now diffs against real schema state and
future migrations will be genuinely incremental. No one-time fix is needed. Regenerating
`0000_*` retroactively is optional cleanup only; it would not change any SQL already
applied to a live database.
