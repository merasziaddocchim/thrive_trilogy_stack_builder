# STATUS.md — Thrive Trilogy Stack Optimizer
**Master memory file.** Read this first, in any new session, before doing anything else. This is the single source of truth for *where things stand* — not what the product does (that's the three governance docs below) but what's actually built, deployed, and decided so far.

**Owner:** Ziad Meras. **Last updated:** July 10, 2026.

> Keep this file current. Every time a real decision gets made or infrastructure changes, add a line here before moving on — that's the entire point of this file existing.

---

## 1. What this project is (one paragraph)

A web app that audits a user's supplement/peptide stack against a reviewed evidence database, producing a composite **Spend Efficiency Index (SEI)** score and a Stop/Keep/Start report — showing what's redundant, underdosed, or unsupported by evidence, in dollar terms. Built as an extension of Thrive Trilogy's existing credentialed, citation-first content brand. Full product/technical/legal detail lives in the three governance docs, not repeated here.

## 2. The three governing documents

These are the actual source of truth for *what the product does and how*. This file only tracks status — always defer to these for substance.

| File | Owns | Location |
|---|---|---|
| `TECH_DOCS.md` | Data architecture, scoring formula, tech stack, API contracts, SEO/mobile strategy | `Docs/TECH_DOCS.md` in repo |
| `CLAIMS_COMPLIANCE.md` | What claims are legally/ethically defensible (YMYL, FTC, DSHEA), approved phrasing, evidence-tier language rules | `Docs/CLAIMS_COMPLIANCE.md` in repo |
| `BRAND_GUIDELINES.md` | Voice, naming (SEI, Stack Report, Stop/Keep/Start), visual identity, disclosure placement | `Docs/BRAND_GUIDELINES.md` in repo |

**Locked terminology (do not vary):** Spend Efficiency Index (SEI) · Stack Report · Stop / Keep / Start · Preview · Evidence Tier (A/B/C/D) · Estimated Annual Waste.

## 3. Confirmed tech stack

| Layer | Choice | Status |
|---|---|---|
| Backend | Node.js + Express | Confirmed |
| Backend ORM | Drizzle (against Postgres) | Confirmed — chosen over Prisma for cold-start performance on Render/Neon |
| Frontend | Next.js (App Router) | Confirmed — required for SSR/SSG per SEO strategy in `TECH_DOCS.md` §7 |
| Database | Neon (serverless Postgres) | Confirmed — free tier, no expiration |
| Backend host | Render | Confirmed — free tier initially |
| Frontend host | Vercel | **Confirmed and LIVE** |
| Repo structure | Monorepo, two top-level folders (`backend/`, `frontend/`) | Confirmed, deviates from TECH_DOCS §5's original two-repo suggestion by design |
| Version control | GitHub | Confirmed — sole platform going forward |

## 4. Infrastructure — current live state

**GitHub (source of truth repo):**
- `github.com/merasziaddocchim/thrive_trilogy_stack_builder` — Private
- Contains: `Docs/` (all three governing docs), `backend/`, `frontend/`, `README.md`
- Latest merged commit: `a4192eb` — scaffold (backend + frontend + schema + migration)

**Neon (database):**
- Project live under "Thrive Trilogy" org
- Use the **pooled connection string** (contains `-pooler`) for `DATABASE_URL`

**Render (backend host):**
- Service configured: Root Directory `backend`, Build `yarn install && yarn build`, Start `yarn start`, free tier
- Env vars: `DATABASE_URL` (Neon pooled string), `NODE_ENV=production`
- Expect 30–60s cold start after 15 min inactivity (known, accepted tradeoff)

**Vercel (frontend host): LIVE**
- Frontend-only deploy (Root Directory `frontend`) — backend explicitly excluded from Vercel's auto-detected services
- **Domain attached: `app.thrivetrilogy.com` — done**
- Env var: `NEXT_PUBLIC_API_URL` → Render backend URL

**Namecheap:** hosts the original WordPress content site at `thrivetrilogy.com` root — untouched, not part of this build.

## 5. Content inventory — thrivetrilogy.com (existing blog)

The blog already has 46 published articles and 4 hub/pillar pages. This is real editorial infrastructure the app should both draw evidence from and link back to — not build in a vacuum.

**Hub pages confirm the schema's category taxonomy is correct, not arbitrary:**
| Hub page | Matches `TECH_DOCS.md` compound category enum |
|---|---|
| NAD+ Precursors: The Biochemist's Complete Guide | `nad_precursor` |
| Methylation Supplements: The Biochemist's Analysis | `methylation` |
| Longevity Compounds: Molecular Analysis by a Chemist | `longevity_compound` |
| Supplement Delivery Systems: Bioavailability Decoded | `delivery_modifier` |

**Compounds with existing editorial depth (priority order for evidence database population), by category:**

*NAD+ precursors:* NMN (dosing protocol, bioavailability, stack guide, brand reviews — Renue by Science, DoNotAge, ProHealth, NMNBio), NR, NAD+ salvage pathway (mechanism)

*Methylation:* TMG, Methylfolate, MTHFR-specific protocol

*Longevity compounds:* Urolithin A, Spermidine, Fisetin, Quercetin, AKG (alpha-ketoglutarate), Berberine (incl. vs. Metformin, dihydroberberine), Resveratrol, p-Synephrine; mTOR vs. AMPK (mechanism)

*Delivery/bioavailability:* liposomal vs. sublingual vs. capsule (NMN-specific and general), NMN bioavailability crisis, Resveratrol "brick dust paradox," Spermidine absorption

**Content-linking rule — formalized (`CLAIMS_COMPLIANCE.md` §6 extension owns the rule, `BRAND_GUIDELINES.md` §8 applies it in voice/placement):**
- **Educational/mechanism articles** (dosing protocols, bioavailability guides, "chemist's guide" pieces) → safe to link from anywhere in the Stack Report, including Evidence Tier citations and Stop/Keep explanations. No additional disclosure needed — functionally equivalent to citing a source.
- **"Best X Supplement" roundups and brand reviews** (affiliate-monetized) → link only from the Start section or general marketing pages, subject to the same per-placement disclosure as any affiliate link — never from Stop/Keep or Evidence Tier content.

## 6. Legal/utility pages — required on app.thrivetrilogy.com

Existing pages on the root site to bring onto the app subdomain: About, Affiliate Disclosure, Contact, Cookie Policy, Disclaimer, DMCA Policy, Do Not Sell/Share My Info, FAQ, How We Review Supplements, Privacy Policy, Terms & Conditions, Reviews.

**Requirement and reasoning now formalized in `CLAIMS_COMPLIANCE.md` §5a** (the owning document — this is a disclosure/compliance rule, not a technical or brand one). Short version: adapt from the root site's versions, don't copy verbatim — the app collects meaningfully different data (stack/health inputs) than the blog does, so a verbatim copy would misrepresent what the app actually collects. Implementation/routing detail lives in `TECH_DOCS.md` §7.

## 7. Key decisions log

| Decision | Outcome | Why |
|---|---|---|
| $17 one-time PDF paywall | Dropped for v0 | Focus on scoring engine correctness first |
| Backend language | Node.js + Express | Founder preference, confirmed explicitly |
| ORM | Drizzle over Prisma | Better cold-start fit for Render + Neon |
| Coding agent going forward | Claude Code | Conversational, explains actions in plain English — right fit for a non-technical founder, vs. PR-review-based agents that assume code-reading ability |
| Repo structure | Monorepo, two folders | Simpler to manage solo; independently deployable either way |
| Evidence-tier ceiling logic | Weak evidence caps the score regardless of correct dosing | Prevents a well-dosed but poorly-evidenced compound from scoring as if both correct AND well-supported; enforced at DB level (`scoring_parameters.evidence_tier` + `.contributing_source_ids` both `NOT NULL`) |
| Scoring/affiliate separation | Structural firewall, `scoring-engine/` cannot import `affiliate-engine/` | Required by `CLAIMS_COMPLIANCE.md` §6, enforced via build-failing check script |
| Article cross-linking | Educational articles link freely; affiliate roundups link only from Start/marketing | Rule owned by `CLAIMS_COMPLIANCE.md` §6 extension (endorsement/disclosure logic); applied in `BRAND_GUIDELINES.md` §8 |
| Legal pages | Adapted from root site, not verbatim-copied | Rule owned by `CLAIMS_COMPLIANCE.md` §5a; app collects different data than the blog, verbatim copy risks inaccurate disclosure and drift |
| Stack capture method | Free-text + LLM extraction, confidence-gated with a user confirmation step ("Confirm What We Found") | Chosen over simple fuzzy-match (less accurate) or a stubbed placeholder (defers the hardest UX problem); architecture logged in `TECH_DOCS.md` §1a |
| Claude Code UI prompt — independent audit | Founder ran the finalized prompt through Gemini 3.1 Pro against all four governing docs; it surfaced 3 real gaps (backend scope bleed in intake-parsing instructions, incomplete legal page list in the footer section, missing E-E-A-T structured data requirement) plus 1 self-caught gap (intake-parser architecture existed only in the prompt, not in `TECH_DOCS.md`) | All 4 fixed in the prompt and propagated back into `TECH_DOCS.md` §1a/§8 — same doc-ownership discipline established earlier in this project, holding up under a second, independent review |
| Doc-ownership correction | Moved article-linking and legal-pages *rules* out of `BRAND_GUIDELINES.md`/`TECH_DOCS.md` into `CLAIMS_COMPLIANCE.md` (§6 extension, new §5a) | Both were originally drafted as compliance-level judgments but placed in the wrong file — `BRAND_GUIDELINES.md` and `TECH_DOCS.md` should only *apply* claims/disclosure rules, never originate them |

## 8. What's actually built (as of last scaffold)

- **Backend:** Express + Drizzle, full three-layer schema (`sources` → `compounds`/`dose_records`/`bioavailability_records`/`interaction_records` → `scoring_parameters`), all enums from `TECH_DOCS.md` §1 implemented verbatim, API route stubs matching `TECH_DOCS.md` §6 (currently return `501`), compliance NOT NULL constraints enforced at DB level, firewall + claim guard scripts in place
- **Frontend:** Next.js App Router + Tailwind, SSG/ISR for `/` and `/methodology`, CSR for `/assessment` and `/report/[id]`, own `robots.ts`/`sitemap.ts`, `Person` schema for author attribution, disclaimer component at top of every report — **live at app.thrivetrilogy.com**
- **Frontend UI/UX build (2026-07-11):** full V1 interface built against mock data/fixtures shaped to `TECH_DOCS.md` §6 — design-token system (OKLCH color, fluid `clamp()` type, 4px grid, light-mode only) in `globals.css` + `tailwind.config.ts`; editorial serif (Fraunces) + rounded sans (Nunito) via `next/font`; landing page (all 8 sections, §3 A–H); the 12-screen audit journey (Fast Stack Capture → **Confirm What We Found** → Priority → Routine → Spend → Safety → multi-stage Analysis/cold-start → two-state Preview → email gate → Stack Report dashboard); Stop/Keep/Start with per-link affiliate disclosure and expandable Evidence Tier rows; all 12 legal/utility routes scaffolded (placeholder copy) + `Organization`/`Person`/`Article` JSON-LD; internal `/design-system` proof page. Evidence-tier ceilings live in ONE constant (`frontend/src/lib/constants.ts` → `EVIDENCE_TIER_CEILINGS`), marked provisional. Mock API in `lib/mock-api.ts` + `lib/fixtures.ts` — swap for the real backend is a drop-in. Build + typecheck green.
- **Not yet built:** scoring formula logic, ceiling values finalized, claim template rendering, actual evidence database content (no real compounds/sources entered yet), auth, real legal/utility page copy (routes now scaffolded, text still pending per `CLAIMS_COMPLIANCE.md` §5a), article cross-linking UI, `backend/src/intake-parser/` module (frontend currently wired to a mocked extraction response per `TECH_DOCS.md` §1a)

## 9. Open items — needs a decision or action

- [ ] **Evidence-tier ceiling values** (100/80/60/40 proposed in `TECH_DOCS.md` §2) — need founder sign-off
- [ ] **Overdosing vs. underdosing penalty asymmetry** in the scoring formula — proposed, not yet confirmed
- [ ] **Brand design tokens** (`tailwind.config.ts`) are estimates from screenshots, not real CSS values — confirm against live site
- [ ] **Begin evidence data entry** — start with NMN, Resveratrol, Berberine, TMG (highest existing editorial depth per §5)
- [ ] **Build legal/utility pages** on app subdomain per §6 — requirement now fully specified in `CLAIMS_COMPLIANCE.md` §5a, ready to build
- [x] ~~Formalize article cross-linking rule from §5 into `BRAND_GUIDELINES.md` proper~~ — done; correctly owned by `CLAIMS_COMPLIANCE.md` §6 extension, applied in `BRAND_GUIDELINES.md` §8
- [x] ~~Update `TECH_DOCS.md` frontend page list and `BRAND_GUIDELINES.md` content rules to reflect §5/§6~~ — done, including a doc-ownership correction (see §7 decision log)

## 10. Hard-won lessons (don't repeat these)

- Monorepo deploys need an explicit Root Directory set on both Render and Vercel, or the platform tries to build the whole repo as one app.
- Vercel auto-detects every deployable folder in a monorepo — must manually exclude any service (like the backend) that shouldn't deploy there.
- Closing a merge/pull request does not delete the branch or its commits — only an explicit delete does.
- A merge can succeed even while CI is failing — these are independent checks on a personal project, not a gate by default.

## 11. Next step right now

The UI/UX Claude Code prompt is corrected, independently audited, and ready to paste in as-is — it builds all 12 screens against mock data, with the intake-parser module explicitly deferred (architecture documented in `TECH_DOCS.md` §1a for when it's actually built). The backend scoring-formula prompt is separate and still pending — the two don't block each other and can run in either order.
