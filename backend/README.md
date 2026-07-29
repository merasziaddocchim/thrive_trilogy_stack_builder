# stackoptimizer-backend

Node.js + Express API for the Thrive Trilogy Stack Optimizer. Drizzle ORM against
Postgres (Neon). Implements the data architecture (`Docs/TECH_DOCS.md` §1) and API
contract (§6). Deployed live on Render and scoring against the seeded Neon database —
the scoring formula, intake parsing, affiliate and article selection, and the claim
guard are all implemented. See `STATUS.md` for what is built and what is still open.

## Why Drizzle (not Prisma)
Thin query builder, no separate engine binary or heavy cold-start footprint - matters
for the Render + Neon scale-to-zero double cold-start risk (TECH_DOCS §5). First-class
Neon serverless driver support. Migrations are plain committed SQL, which suits the
auditability requirement in §1.

## Local development
```bash
cp .env.example .env      # fill in your Neon pooled DATABASE_URL
npm install
npm run db:generate       # generate SQL migrations from src/db/schema
npm run db:migrate        # apply them
npm run dev               # http://localhost:8080/health
```

## Build & run (what Render runs)
```bash
npm run build
npm start
```

## Tests and checks
```bash
npm test          # 93 tests (node:test via tsx) - requires Node 22, see below
npm run lint      # ESLint + the firewall check
npm run typecheck # tsc --noEmit
npm run firewall  # the firewall check on its own
```
All four run in CI (`.github/workflows/ci.yml`) on every PR and push to `main`, and
branch protection on `main` means a failure blocks the merge.

**Node 22 is required for `npm test`**, even though `engines` says `>=20`: the test
script globs (`tsx --test "src/**/*.test.ts"`) and `node --test` only expands glob
patterns from Node 22 on. On Node 20 it exits immediately with `Could not find
'.../src/**/*.test.ts'`. Fixing `engines`, or the glob, is still open.

## Structure
- `src/db/schema.ts` - three-layer model (source / compound / scoring) + user tables;
  `src/db/seed-data.ts` is evidence batch 1, `src/db/corrections/` holds the idempotent
  batch-1 correction and sign-off scripts
- `src/scoring-engine/` - composite score (SEI), TECH_DOCS §2 in full. FIREWALLED.
- `src/intake-parser/` - free-text -> confidence-gated compound/dose extraction.
  Heuristic extractor is the default; an LLM extractor is an injectable interface that
  is not wired in.
- `src/affiliate-engine/` - "Start" recommendations. Separate by hard constraint.
- `src/article-engine/` - thrivetrilogy.com article cross-links. Firewalled the same way.
- `src/shared/blog-url.ts` - the ONE utility that builds outbound links to the root
  domain. Never write a bare `/go/...` or `/slug/` string as an href.
- `src/compliance/` - claim guard enforcing evidence_tier + source_ids at the API layer,
  plus the CLAIMS_COMPLIANCE §9 claim-template bank
- `src/api/routes/` - endpoints matching TECH_DOCS §6
- `scripts/check-firewall.mjs` - exits non-zero on a forbidden import between the
  guarded modules; run in `npm run lint` and again standalone in CI
