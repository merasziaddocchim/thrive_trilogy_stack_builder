# Thrive Trilogy — Stack Optimizer

Full-stack scaffold for the Stack Optimizer / Diagnosis Score product. See `Docs/`
for the source-of-truth specs: `TECH_DOCS.md` (data + scoring + API), `CLAIMS_COMPLIANCE.md`
(claim rules), `BRAND_GUIDELINES.md` (voice + naming).

## Layout

Two independently deployable apps in one repo. TECH_DOCS §5 recommends two separate
repos with separate deploy targets; kept as two top-level folders here to preserve that
separation within a single GitHub repository (Render deploys `backend/`, Vercel deploys
`frontend/`).

| Folder | Stack | Deploys to |
|---|---|---|
| `backend/` | Node.js + Express + Drizzle/Postgres (Neon) | Render (`render.yaml`) |
| `frontend/` | Next.js (App Router) + Tailwind | Vercel (`vercel.json`) |

Deploy config is generic (standard `npm run build` / `npm start`) and independent of CI.

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, in two
parallel jobs on Node 22:

- **backend** — `npm run lint` (ESLint + the firewall check), `npm run typecheck`, the
  full test suite, a `git diff --exit-code` tree-cleanliness guard, then the firewall
  check standalone.
- **frontend** — `npm run typecheck`, `npm run build`.

Branch protection is enabled on `main`, so a failing run blocks the merge. Note that
`npm test` needs Node 22: the test script globs (`tsx --test "src/**/*.test.ts"`) and
`node --test` only expands globs from Node 22 on, despite `engines` saying `>=20`.

## Status

**Built and live**, not a scaffold. Live scoring works end-to-end at
`app.thrivetrilogy.com`: the scoring engine (TECH_DOCS §2 in full — evidence ceilings and
the overdose slope confirmed/locked 2026-07-12), the intake parser, the firewalled
affiliate and article engines, the claim guard and claim-template bank, evidence batch 1
(5 compounds / 12 founder-reviewed sources), and durable 48-hour anonymous assessment
sessions are all implemented and merged.

`STATUS.md` is the authoritative record of what is built, deployed and decided — read it
first. Known-open items live there (§9); the main ones are cross-compound pathway
redundancy detection, the intake-extractor default, and attorney review of the legal
pages.

## Structural guarantees carried from the docs

- **Score / affiliate / article firewall** (TECH_DOCS §4, CLAIMS_COMPLIANCE §6):
  `scoring-engine/`, `affiliate-engine/` and `article-engine/` are separate modules, and
  `intake-parser/` is isolated from all three. `backend/scripts/check-firewall.mjs` exits
  non-zero on a forbidden import and runs in CI on every PR and push to `main`, so a
  violation fails the run and blocks the merge. Guarded directions are listed in
  TECH_DOCS §4.
- **Claim guard** (TECH_DOCS §4): `backend/src/compliance/claim-guard.ts` rejects any
  claim object missing `evidence_tier` + `contributing_source_ids`.
- **Disclaimer placement** (CLAIMS_COMPLIANCE §5): disclaimer renders at the top of every
  report, not footer-only.
- **SSG/ISR vs CSR split** (TECH_DOCS §7): marketing/methodology are backend-independent;
  interactive flow is CSR.
