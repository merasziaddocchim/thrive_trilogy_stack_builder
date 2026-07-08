# Thrive Trilogy — Stack Optimizer

Full-stack scaffold for the Stack Optimizer / Diagnosis Score product. See `Docs/`
for the source-of-truth specs: `TECH_DOCS.md` (data + scoring + API), `CLAIMS_COMPLIANCE.md`
(claim rules), `BRAND_GUIDELINES.md` (voice + naming).

## Layout

Two independently deployable apps in one repo. TECH_DOCS §5 recommends two separate
repos with separate deploy targets; kept as two top-level folders here to preserve that
separation within a single GitLab project (Render deploys `backend/`, Vercel deploys `frontend/`).

| Folder | Stack | Deploys to |
|---|---|---|
| `backend/` | Node.js + Express + Drizzle/Postgres (Neon) | Render (`render.yaml`) |
| `frontend/` | Next.js (App Router) + Tailwind | Vercel (`vercel.json`) |

Deploy config is generic (standard `npm run build` / `npm start`) — no GitLab-CI lock-in.

## Status

Scaffold only. Folder structure, empty route/component stubs, DB schema + migration
tooling, and config so the apps run locally and deploy cleanly. Business logic (scoring
formula, claim templates) is intentionally NOT implemented — several parameters await
sign-off (TECH_DOCS §2 open parameters).

## Structural guarantees carried from the docs

- **Score / affiliate firewall** (TECH_DOCS §4, CLAIMS_COMPLIANCE §6): `scoring-engine/`
  and `affiliate-engine/` are separate modules; `backend/scripts/check-firewall.mjs`
  fails the build if `scoring-engine/` imports affiliate code.
- **Claim guard** (TECH_DOCS §4): `backend/src/compliance/claim-guard.ts` rejects any
  claim object missing `evidence_tier` + `contributing_source_ids`.
- **Disclaimer placement** (CLAIMS_COMPLIANCE §5): disclaimer renders at the top of every
  report, not footer-only.
- **SSG/ISR vs CSR split** (TECH_DOCS §7): marketing/methodology are backend-independent;
  interactive flow is CSR.
