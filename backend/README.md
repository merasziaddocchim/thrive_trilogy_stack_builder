# stackoptimizer-backend

Node.js + Express API for the Thrive Trilogy Stack Optimizer. Drizzle ORM against
Postgres (Neon). Implements the data architecture (`Docs/TECH_DOCS.md` §1) and API
contract (§6). No business logic yet - stubs only.

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

## Structure
- `src/db/schema/` - three-layer model (source / compound / scoring) + user tables
- `src/scoring-engine/` - composite score (SEI). FIREWALLED from affiliate logic.
- `src/affiliate-engine/` - "Start" recommendations. Separate by hard constraint.
- `src/compliance/` - claim guard enforcing evidence_tier + source_ids at the API layer
- `src/api/routes/` - endpoint stubs matching TECH_DOCS §6
- `scripts/check-firewall.mjs` - fails the build if scoring-engine imports affiliate code
