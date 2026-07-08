# Migrations

Generated SQL migrations live here and are committed so deploys (Render) can apply
them with `npm run db:migrate`. Review migration SQL before applying — the schema is
meant to stay auditable (TECH_DOCS §1).

## ⚠️ Before creating your first NEW migration: regenerate the initial snapshot

The initial migration `0000_initial.sql` was **hand-authored** to match
`src/db/schema.ts` exactly, and it applies correctly. However, its companion
`meta/0000_snapshot.json` is a **minimal placeholder**, not a full column-level
snapshot of the schema.

Drizzle-kit diffs new migrations against that snapshot. Because the placeholder is
empty, the next `npm run db:generate` would otherwise try to re-create every table
in a spurious `0001` migration.

**One-time fix (do this before adding any new migration):**

```bash
cd backend
npm install
npm run db:generate    # lets drizzle-kit overwrite 0000_* from the real schema
```

This rewrites `0000_initial.sql` (should match the committed SQL) and, importantly,
replaces `meta/0000_snapshot.json` with a complete snapshot. Commit the result. After
that, `db:generate` will diff correctly and future migrations will be incremental.

> If a fresh, empty database has already had `0000_initial.sql` applied, regenerating
> the snapshot does not change the applied SQL — it only fixes the local diff baseline.
