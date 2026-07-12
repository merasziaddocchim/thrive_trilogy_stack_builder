# STATUS.md — Thrive Trilogy Stack Optimizer
**Master memory file.** Read this first, in any new session, before doing anything else. This is the single source of truth for *where things stand* — not what the product does (that's the three governance docs below) but what's actually built, deployed, and decided so far.

**Owner:** Ziad Meras. **Last updated:** July 12, 2026.

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
- Contains: `Docs/` (all three governing docs + this file), `backend/`, `frontend/`, `README.md`
- **PR #1 merged to `main`, July 12, 2026** — "Build complete marketing & assessment UI with fixtures and design system," commit `6232a9c`, CI green (2/2 checks passed), no conflicts. Full V1 UI/UX build (all 12 screens) is now on `main`, not just committed to a branch.

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
| V1 UI/UX build | Merged to `main`, July 12, 2026 (PR #1, commit `6232a9c`) | Built by Claude Code against the corrected, audited prompt; matches spec closely including the added Confirm-What-We-Found step and the JSON-LD fix from the Gemini audit |

## 8. What's actually built (as of the July 12 merge)

- **Backend:** Express + Drizzle, full three-layer schema (`sources` → `compounds`/`dose_records`/`bioavailability_records`/`interaction_records` → `scoring_parameters`), all enums from `TECH_DOCS.md` §1 implemented verbatim, API route stubs matching `TECH_DOCS.md` §6 (currently return `501`), compliance NOT NULL constraints enforced at DB level, firewall + claim guard scripts in place. **No scoring logic and no `intake-parser/` module yet — both explicitly out of scope for the UI build, still pending.**
- **Frontend — full V1 UI/UX, merged and live at app.thrivetrilogy.com:** design-token system (light mode only), the full 8-section landing page, all 12 journey screens including the added "Confirm What We Found" step, both Preview states (sufficient/insufficient data), the Stack Report dashboard with per-link affiliate disclosure, all 12 legal/utility page routes, `Person`/`Organization`/`Article` JSON-LD, and a mock API (`lib/mock-api.ts` + `lib/fixtures.ts`) shaped exactly to `TECH_DOCS.md` §6 for a clean backend swap later. `npm run build` + `tsc` green; flow verified in-browser at desktop and 375px mobile. Health/stack form data deliberately uses `sessionStorage`, not `localStorage` — Claude Code's own initiative, a genuinely good privacy-conscious call beyond what was explicitly specified.
- **Not yet built:** scoring formula logic, ceiling values finalized, claim template rendering, actual evidence database content (no real compounds/sources entered yet), auth, the `intake-parser/` module (architecture documented in `TECH_DOCS.md` §1a, not implemented), real legal copy for the 12 page routes (routes exist, content is placeholder), backend wiring (frontend currently runs entirely on mock fixtures)

## 9. Open items — needs a decision or action

- [x] ~~**Evidence-tier ceiling values** (100/80/60/40 in `TECH_DOCS.md` §2)~~ — **CONFIRMED/locked 2026-07-12**
- [x] ~~**Overdosing vs. underdosing penalty asymmetry** (50× slope) in the scoring formula~~ — **CONFIRMED/locked 2026-07-12**
- [ ] **Brand design tokens** (`tailwind.config.ts`) are estimates from screenshots, not real CSS values — confirm against live site
- [ ] **Begin evidence data entry** — start with NMN, Resveratrol, Berberine, TMG (highest existing editorial depth per §5)
- [ ] **Build the scoring engine + `intake-parser/` module** — the two backend pieces the merged UI is currently mocked against; wiring them in is a drop-in swap of `lib/mock-api.ts` per Claude Code's own note on the PR
- [ ] **Finalize legal copy** for the 12 routed pages — *draft* copy now exists (adapted from the root site per `CLAIMS_COMPLIANCE.md` §5a; content in `frontend/src/lib/legal-content.ts`, each page shows a "Draft for founder review" banner). Still needs founder facts + attorney review before launch. Specific flags surfaced in-page and to resolve:
  - [ ] **Privacy Policy (highest priority):** (a) which AI/LLM provider processes the free-text stack entry, and whether that provider retains entries or trains on them; (b) whether any assessment data is stored server-side once an email is captured, and for how long (backend not wired, so retention is currently undefined); (c) whether `USER_LAB_RESULT` / `USER_FEEDBACK` (schema-supported per `TECH_DOCS.md` §1 but not collected in V1) will be collected later; (d) the email provider and analytics vendor; (e) legal basis / disclosures for target regions (GDPR/UK if applicable)
  - [ ] **Contact:** confirm the real public contact email (`hello@thrivetrilogy.com` is a placeholder) and whether a mailing address is needed
  - [ ] **Cookie Policy:** confirm the actual analytics provider and any affiliate/attribution cookies actually set — don't claim analytics we don't run
  - [ ] **DMCA Policy:** provide the designated agent's name, email, and mailing address; confirm Copyright Office registration
  - [ ] **Do Not Sell/Share:** confirm whether any current vendor triggers a CCPA/CPRA "sharing" obligation, whether a dedicated opt-out form is needed, and whether GPC is honored yet
  - [ ] **Affiliate Disclosure:** name the specific affiliate programs in use and confirm each program's required disclosure language
  - [ ] **Terms & Conditions:** set governing-law jurisdiction + dispute resolution; attorney to confirm warranty/liability language
  - [ ] **Reviews:** decide what this page hosts on the app subdomain — carried-over brand/product reviews, customer testimonials, or both (testimonials must be genuine and FTC-Endorsement-Guides compliant)
- [x] ~~Formalize article cross-linking rule from §5 into `BRAND_GUIDELINES.md` proper~~ — done; correctly owned by `CLAIMS_COMPLIANCE.md` §6 extension, applied in `BRAND_GUIDELINES.md` §8
- [x] ~~Update `TECH_DOCS.md` frontend page list and `BRAND_GUIDELINES.md` content rules to reflect §5/§6~~ — done, including a doc-ownership correction (see §7 decision log)
- [x] ~~Build and merge V1 UI/UX~~ — done, merged to `main` July 12, 2026 (PR #1)

## 10. Hard-won lessons (don't repeat these)

- Monorepo deploys need an explicit Root Directory set on both Render and Vercel, or the platform tries to build the whole repo as one app.
- Vercel auto-detects every deployable folder in a monorepo — must manually exclude any service (like the backend) that shouldn't deploy there.
- Closing a merge/pull request does not delete the branch or its commits — only an explicit delete does.
- A merge can succeed even while CI is failing — these are independent checks on a personal project, not a gate by default.
- Anthropic has multiple, similarly-named GitHub Apps (e.g. "Claude" vs. "Claude Design Import") — they're easy to confuse, but only "Claude" (the Claude Code app) can be granted write access; "Design Import" is permanently read-only by design. Check the app name carefully before troubleshooting permissions.
- `claude.ai/admin-settings/...` pages are organization-admin-only and won't work on a Pro plan — GitHub App repository access is actually managed on GitHub's side (`github.com/settings/installations`), not through claude.ai.

## 11. Next step right now

**Milestone: the full V1 UI/UX is live on `main` and deployed at app.thrivetrilogy.com** — a real, clickable product, not just docs and scaffolding. The natural next step is the backend: implement the scoring formula (`TECH_DOCS.md` §2, pending the ceiling-value sign-off in §9) and the `intake-parser/` module (`TECH_DOCS.md` §1a), then swap `lib/mock-api.ts` for the real API — Claude Code already confirmed this is a clean, drop-in change. Evidence data entry (NMN/Resveratrol/Berberine/TMG) can happen in parallel, since it doesn't block or get blocked by backend work.
