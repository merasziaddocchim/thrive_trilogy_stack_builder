# STATUS.md — Thrive Trilogy Stack Optimizer
**Master memory file.** Read this first, in any new session, before doing anything else. This is the single source of truth for *where things stand* — not what the product does (that's the three governance docs below) but what's actually built, deployed, and decided so far.

**Owner:** Ziad Meras. **Last updated:** July 20, 2026.

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
- **PRs #1–#7 all merged to `main`** (as of July 19, 2026): #1 V1 UI/UX (`6232a9c`); #2 scoring engine + intake parser + live-data wiring; #3 evidence seed batch 1; #4 live-data env-var fix + scroll/label UX; #5 production CORS fix; #6 recognized-but-doseless Preview fix; #7 durable anonymous assessment-session storage (Postgres `assessment_sessions`, 48h TTL — replaces the in-memory store; architecture in `TECH_DOCS.md` §1b). **`main` is the live source of truth; live scoring works end-to-end (see §8/§9).**

**Neon (database):**
- Project live under "Thrive Trilogy" org
- Use the **pooled connection string** (contains `-pooler`) for `DATABASE_URL`

**Render (backend host): LIVE at `https://thrive-trilogy-stack-builder.onrender.com`**
- Service configured: Root Directory `backend`, Build **`yarn install && yarn build && yarn db:migrate`** (migrations apply on every deploy; changed by the founder 2026-07-19 — note the edit required a manual re-save, see §10), Start `yarn start`, free tier
- **`assessment_sessions` migration VERIFIED APPLIED in production (2026-07-19):** founder triggered a manual redeploy after fixing the Build Command save, then tested the live endpoint directly — `POST /assessment` returned `201` with a real `assessment_id`. Session durability is confirmed working end-to-end in production.
- Env vars: `DATABASE_URL` (Neon pooled string), `NODE_ENV=production`, and **`FRONTEND_ORIGIN=https://app.thrivetrilogy.com,http://localhost:3000`** (comma-separated; required for CORS — see §9/§10)
- Health: `GET /health` (liveness), `GET /health/db` (DB reachability) — use these to diagnose
- Expect 30–60s cold start after 15 min inactivity (known, accepted tradeoff)

**Vercel (frontend host): LIVE**
- Frontend-only deploy (Root Directory `frontend`) — backend explicitly excluded from Vercel's auto-detected services
- **Domain attached: `app.thrivetrilogy.com` — done**
- Env var: the frontend reads the backend URL from `NEXT_PUBLIC_API_BASE_URL` **or** `NEXT_PUBLIC_API_URL` (code accepts either after PR #4 — a name mismatch was the original "always sample data" cause; see §9/§10). **Confirmed working:** the deployed frontend reaches the Render backend. `NEXT_PUBLIC_*` is inlined at build time, so any change needs a redeploy.

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
| Scoring engine + intake parser | Built, merged (PR #2), deployed | `TECH_DOCS.md` §2 implemented in full with confirmed ceilings/slope; intake parser confidence-gated; firewalled + 38 tests |
| Evidence batch 1 to production | Seeded + loaded to Neon (PR #3), row counts verified by founder | 5 compounds / 12 sources; AI-extracted, founder review still pending before it's formally trusted |
| Live scoring milestone | **Working end-to-end at app.thrivetrilogy.com, July 18, 2026** | After fixing env-var name (PR #4), CORS (PR #5 + Render `FRONTEND_ORIGIN`), and the doseless-Preview bug (PR #6) |
| Batch-1 evidence review started (2026-07-20) | Founder review IN PROGRESS: 7/12 sources confirmed accurate, 1 citation correction (McRae 2013 → J Chiropr Med, not Nutr Res) + 1 sample-size fill (Dollerup n=40) applied via idempotent update script, 4 sources still unverified. Nothing flipped to `human_reviewed` yet | Corrections applied to `seed-data.ts` + `backend/src/db/corrections/2026-07-20-batch1.ts`; founder runs `npm run db:correct:batch1` against production. Partial — see §9 top item |
| Batch-1 evidence review COMPLETE (2026-07-20) | All 12 sources founder-verified against primaries; no corrections beyond McRae/Dollerup. All flipped `ai_extracted` → `human_reviewed` (+ `reviewDate`), 7 rationale suffixes stripped (+ `lastReviewedDate`), applied to the live DB via `db:signoff:batch1`. About/How-We-Review review-status notes removed — copy now accurate | Live scoring is now review-backed, not AI-extracted. `seed-data.ts` reflects the reviewed state; §9 top item closed |
| Legal-page facts batch (2026-07-19) | Founder confirmed: 48h anonymous retention disclosure; intake is heuristic-only (no LLM provider — worded as dated fact with an update-before-enabling gate); Google Analytics in use, treated as CCPA/CPRA "sharing" pending the ad-features decision, functional opt-out required before GA is tagged into the app; email not collected yet + planned report-delivery use disclosed; DMCA agent = Ziad Meras / support@thrivetrilogy.com; Terms governing law = Delaware; Reviews page = product/compound reviews only | All owned by `CLAIMS_COMPLIANCE.md` §5b (new section — legal pages reference it, never originate); remaining unknowns stay flagged in-page per §9 |
| Legal facts corrections (2026-07-19, follow-up to the §5b batch) | (1) Analytics corrected: **nothing is active anywhere — Google Analytics is planned, not in use**; legal pages now state current reality (no analytics collecting data) plus the planned addition, and the functional-opt-out/disclosure-first rules bind when GA is tagged in. (2) Contact consolidated: **`support@thrivetrilogy.com` for everything** (general + DMCA); `hello@` placeholder removed | Founder corrections; owned by `CLAIMS_COMPLIANCE.md` §5b (item 3 superseded in place, new item 5a) |
| Durable assessment sessions | Built + merged (PR #7, July 19, 2026): Postgres `assessment_sessions` — anonymous (no accounts/identity), 48h hard TTL, no-cron cleanup (lazy delete-on-read + sweep-on-create), honest 503/404 errors instead of silent sample-data fallback | In-memory store was lost on every Render restart/cold start and unsafe across instances; architecture owned by `TECH_DOCS.md` §1b. Founder added `yarn db:migrate` to Render's Build Command; **migration verified applied in production 2026-07-19** (manual redeploy + live `201` smoke test) |

## 8. What's actually built (updated July 18, 2026 — **LIVE SCORING WORKS END-TO-END**)

- **Backend — implemented, merged (PR #2), deployed live on Render:** Express + Drizzle three-layer schema (unchanged) PLUS the two real engines — **`scoring-engine/`** (implements `TECH_DOCS.md` §2 in full: asymmetric dosing accuracy with the confirmed 50× overdose slope, evidence ceilings 100/80/60/40 as named constants, dollar-weighted composite + safety modifier, separate Estimated-Annual-Waste range) and **`intake-parser/`** (free-text → confidence-gated extraction + fuzzy match against `canonical_name`/`aliases`; heuristic extractor is the default, an injectable LLM extractor is optional). API endpoints now real (`POST /assessment`, `POST /intake`, `GET /assessment/:id/preview|report`) shaped to §6, guarded by the claim-guard; `GET /health` + `GET /health/db`. Firewall extended to protect `intake-parser/` too. **38 backend tests green**, incl. the worked NMN example and a differentiated-sub-scores check over the seeded data.
- **Evidence database — batch 1 seeded, loaded to production Neon, and FOUNDER-REVIEWED.** PR #3 merged; the founder ran `npm run db:seed` against production and **verified row counts: 12 sources, 5 compounds, 11 dose_records, 1 bioavailability_record, 1 interaction_record, 7 scoring_parameters.** Compounds: NMN, NR, Resveratrol, Berberine, TMG. **Founder review COMPLETE (2026-07-20):** all 12 sources personally verified against their primaries (one correction — McRae 2013 citation, PR #11 — no others); all sources now `extractionStatus = 'human_reviewed'` with `reviewDate` set, and the 7 scoring rationales no longer carry the "pending founder review" suffix. Live scoring is now formally review-backed, not AI-extracted. (Sign-off applied to the live DB via `npm run db:signoff:batch1` — see §9.)
- **Frontend — full V1 UI/UX + live data, deployed on Vercel:** everything from PR #1, plus the **live-first data layer** (`lib/data.ts`, replacing `mock-api.ts`) that calls the real backend and only falls back to `lib/fixtures.ts` on failure — the "Preview build — sample data" banner shows ONLY on that fallback. `sessionStorage` for form state (privacy-conscious). Build + typecheck green.
- **LIVE SCORING CONFIRMED WORKING (2026-07-18):** app.thrivetrilogy.com reaches the Render backend, the intake parser matches free-text against the **real seeded DB**, and the app scores against real evidence. Verified in-browser (e.g. "TMG" matched from the live DB with no sample banner). Getting there required, in order: env-var name fix (PR #4), production CORS `FRONTEND_ORIGIN` fix (PR #5) + the Render env var set & redeployed, and the recognized-but-doseless Preview fix (PR #6).
- **Assessment session storage — durable, merged (PR #7, July 19, 2026):** the in-memory assessment store is replaced by a Postgres `assessment_sessions` table (session_id PK reusing the existing `assessment_id`, jsonb intake data, 48h `expires_at`; report derived on read, never stored). Anonymous by design — no accounts, no identity; evidence tables untouched. Cleanup without cron (Render free tier): lazy delete-on-read + opportunistic sweep-on-create, both best-effort. Failure behavior is honest: write failure → `503 session_store_unavailable`, missing/expired → `404 session_not_found`, and the frontend shows a clear retry/expired message instead of silently substituting sample data. Migration `0001_assessment_sessions` is additive with IF-NOT-EXISTS guards (safe to re-run). 47 backend tests green. **Verified applied and working in production (2026-07-19):** founder redeployed with `yarn db:migrate` in the Build Command and confirmed a live `201` + real `assessment_id` from the production endpoint.
- **Not yet built / pending:** more evidence compounds beyond the first 5 (batch 1 is now fully founder-reviewed); the **Start section is intentionally empty** — the recommendation/affiliate engine (firewalled) isn't built; **cross-compound pathway redundancy detection** (NMN+NR) — only same-compound duplicates are flagged today; the **LLM extractor is not the default** (heuristic is) — a founder decision; real legal copy for the 12 routed pages; auth; durable persistence of richer user-side tables (`user_profiles`/`user_stack_items` etc. — anonymous 48h sessions are done via PR #7, accounts/identity are not).

## 9. Open items — needs a decision or action

- [x] ~~**Evidence-tier ceiling values** (100/80/60/40 in `TECH_DOCS.md` §2)~~ — **CONFIRMED/locked 2026-07-12**
- [x] ~~**Overdosing vs. underdosing penalty asymmetry** (50× slope) in the scoring formula~~ — **CONFIRMED/locked 2026-07-12**
- [x] ~~**Does live scoring work on the live app yet?**~~ — **YES, RESOLVED 2026-07-18. Live scoring works end-to-end.** The chain of blockers, all now fixed and deployed: (1) frontend never reached the backend — a `NEXT_PUBLIC_API_BASE_URL` vs `NEXT_PUBLIC_API_URL` **name mismatch** left the URL empty at build time so it silently fell back to fixtures (NOT a cold-start timeout — there's no timeout in the fetch path). Fixed in PR #4 (code reads either name; `lib/data.ts` now logs the real failure reason on fallback). (2) **CORS** — the backend's `FRONTEND_ORIGIN` defaulted to `http://localhost:3000`, so the browser blocked `app.thrivetrilogy.com`. Fixed in PR #5 (comma-separated, production-inclusive list) + the founder set `FRONTEND_ORIGIN=https://app.thrivetrilogy.com,http://localhost:3000` in Render and redeployed. (3) a recognized-but-doseless compound wrongly hit the Preview empty state — fixed in PR #6. **Confirmed in-browser:** TMG matched against the live seeded DB, no sample banner. Diagnostics for the future: `GET /health/db` on the backend, and the `[data] live … failed` console logs.
- [ ] **Brand design tokens** (`tailwind.config.ts`) are estimates from screenshots, not real CSS values — confirm against live site
- [x] **Evidence data entry — batch 1 SEEDED, LOADED TO PRODUCTION, and FULLY FOUNDER-REVIEWED (2026-07-20).** PR #3 merged; the founder ran `npm run db:seed` against the live Neon DB and verified the row counts (12 sources / 5 compounds / 11 dose_records / 1 bioavailability_record / 1 interaction_record / 7 scoring_parameters). Compounds: **NMN, NR, Resveratrol, Berberine, TMG** (covers all three schema categories: nad_precursor, longevity_compound, methylation). Contents: **12 web-verified real sources**; dose_records per compound — NMN 3, NR 2, Resveratrol 2, Berberine 2, TMG 2 (11 total, includes genuine `null_no_effect` results: Dollerup NR, Yoshino-2012 resveratrol); 1 NMN bioavailability_record; 1 **NMN+NR `redundant_pathway`** interaction_record; **7 scoring_parameters**. **Evidence-tier distribution: A×1 (Berberine), B×4 (NMN metabolic + NMN training + NR + TMG methylation), C×2 (Resveratrol, TMG ergogenic)** — genuine spread, not five identical results. The real scoring engine over this data produces differentiated sub-scores (Berberine 100 · NR 80 · TMG 66.7 · NMN 60 · Resveratrol 50), with the evidence ceiling visibly capping well-dosed weak-evidence compounds. **Verification caveat:** existence + metadata confirmed via web search across multiple independent results (PubMed/PMC/publisher); direct DOI resolution was blocked by the environment proxy (403) at extraction time, so DOIs were originally assembled from search-confirmed metadata — since resolved during founder review. **This data is now review-backed:** every source is `extractionStatus = 'human_reviewed'` (`reviewDate` 2026-07-20) and no `evidenceTierRationale` carries a review-pending suffix. (Was AI-extracted 2026-07-12 → 07-19 as a deliberate, disclosed shortcut; founder review completed 2026-07-20.)
  - [x] ~~**TOP OPEN ITEM — founder sign-off on batch-1 evidence.**~~ **DONE, COMPLETE 2026-07-20.** The founder personally verified all 12 sources against their primaries.
    - **All 12 verified accurate.** Only correction needed was the McRae 2013 citation (Nutr Res → **J Chiropr Med 2013;12(1):20–25, doi:10.1016/j.jcm.2012.11.001**, applied earlier in PR #11 via `db:correct:batch1`) plus the Dollerup 2018 n=40 fill. No further corrections.
    - **Sign-off applied:** all 12 sources flipped `extractionStatus` `ai_extracted` → `human_reviewed`, `reviewDate` = 2026-07-20; the 7 scoring rationales had the "— AI-extracted, pending founder review." suffix stripped and `lastReviewedDate` set. Baked into `seed-data.ts` (a fresh re-seed reproduces the reviewed state) and applied to the live DB via the idempotent script `backend/src/db/corrections/2026-07-20-batch1-signoff.ts` (`npm run db:signoff:batch1`) — not a manual edit / re-seed. Row counts unchanged. **Founder runs `npm run db:signoff:batch1` against production once** (after the earlier `db:correct:batch1`); `npm run db:counts` re-verifies read-only.
    - **Copy re-truthed:** the About and How-We-Review "only human-reviewed records feed the score" statement is now accurate, so the two founder-review notes flagging that gap were removed from `frontend/src/lib/legal-content.ts` — the `CLAIMS_COMPLIANCE.md` §7 claim-vs-reality gap is closed.
    - Review packet (per-compound) delivered 2026-07-19, updated 2026-07-20.
- [x] ~~**VERIFY — `assessment_sessions` migration applied in production (PR #7 follow-up).**~~ — **DONE, verified 2026-07-19.** The Build Command edit hadn't actually saved on the first attempt (see §10); the founder re-saved it as `yarn install && yarn build && yarn db:migrate`, triggered a manual redeploy, and smoke-tested the production endpoint directly: `POST /assessment` returned `201` with a real `assessment_id` — new code live, `assessment_sessions` table exists, durability working end-to-end. The migration is additive/guarded and now re-runs harmlessly on every future deploy. (Diagnostic procedure that was here — Render Events / `to_regclass` in Neon / curl smoke test distinguishing old code vs table-missing — retired as resolved; the smoke-test curl remains a good future health check.)
- [x] ~~**Build the scoring engine + `intake-parser/` module**~~ — **DONE, merged (PR #2), deployed, and scoring live against the seeded DB.** Flagged assumptions still worth a founder eye (from the PR): Stop/Keep/Start categorization heuristic, underdosing-waste band (0.6×–1.0×), per-format bioavailability factor (currently 1.0), ~~in-memory assessment store (non-durable)~~ (resolved by PR #7, 2026-07-19 — durable 48h Postgres sessions, see §8). Two known gaps carried forward:
  - [ ] **GAP — cross-compound pathway redundancy is not detected.** The engine only flags duplicate products of the *same* compound; it does NOT catch two *different* compounds on the same pathway (e.g. NMN + NR) — the flagship "paying twice" finding. The seeded NMN+NR `redundant_pathway` interaction record exists and is forward-compatible, but detection needs a shared-ingredient/pathway tag on `compounds` or use of the `redundant_pathway` interactions, wired into redundancy waste + overlap flags.
  - [ ] **DECISION — intake parser defaults to heuristic matching, not LLM extraction.** `POST /intake` uses the deterministic regex/fuzzy extractor unless an `LlmExtractor` is injected. This contradicts the free-text + LLM-extraction method in `TECH_DOCS.md` §1a/§8. Founder decision needed: keep heuristic-by-default for V1 (LLM opt-in) or wire the LLM path as default (also feeds the Privacy Policy "which LLM provider" flag). NOTE: a related UX consequence surfaced live — "TMG 500" (no unit) isn't parsed as a dose (fixed downstream in PR #6 so the compound still shows as recognized); if bare numbers should be assumed `mg`, that's part of this decision.
- [ ] **Finalize legal copy** for the 12 routed pages — draft copy exists (`frontend/src/lib/legal-content.ts`, adapted per `CLAIMS_COMPLIANCE.md` §5a). **2026-07-19: founder confirmed a batch of facts, now owned by `CLAIMS_COMPLIANCE.md` §5b** (the legal pages state them, §5b originates them); the pages were updated accordingly and per-flag notes closed only where a fact was actually confirmed. **Still needs attorney review before launch.** Per-page state:
  - [ ] **Privacy Policy:** ~~(a) LLM provider~~ **resolved — no LLM/AI provider is used for intake (heuristic-only, on our own servers); worded as a dated current fact, with a §5b gate requiring a policy update BEFORE any LLM extractor is enabled**; ~~(b) server-side retention~~ **resolved — anonymous, 48h, disclosed (PR #7 / TECH_DOCS §1b)**; still open: (c) future collection of `USER_LAB_RESULT`/`USER_FEEDBACK`; (d) email delivery provider (once report delivery ships); (e) GDPR/UK legal basis. **Analytics fact CORRECTED 2026-07-19: no analytics is active anywhere (GA is planned, not implemented — earlier "GA in use" entry superseded, §5b); pages now state current reality + planned addition**
  - [x] ~~**Contact:**~~ **email resolved (2026-07-19) — `support@thrivetrilogy.com` is the single confirmed address for everything (general contact + DMCA); `hello@` placeholder removed.** Still open (folded into the DMCA item): whether a mailing address is needed
  - [ ] **Cookie Policy:** analytics status resolved — **none active, GA planned** (corrected from "GA in use"); still open: GA cookie names/retention + ad-features decision when GA is added, and which affiliate/attribution cookies are actually set
  - [ ] **DMCA Policy:** ~~agent name and email~~ **resolved — Ziad Meras, support@thrivetrilogy.com (in-page)**; still open: mailing address + U.S. Copyright Office agent registration
  - [ ] **Do Not Sell/Share:** **corrected (2026-07-19): no analytics/advertising tech is active, so no "sharing" is currently occurring — page now says so.** Email opt-out channel (support@) in the copy, honored if/when sharing-classified tech activates. **Binding at GA tagging (rule in §5b, logged in TECH_DOCS §8): ad-features decision (determines the "sharing" posture) + a functional on-page opt-out + GPC decision must ship in the same change.** Dedicated opt-out form question still open
  - [ ] **Affiliate Disclosure:** still open — name the specific affiliate programs in use and confirm each program's required disclosure language
  - [ ] **Terms & Conditions:** ~~governing law~~ **resolved — Delaware (in-page)**; still open: dispute-resolution terms; attorney to confirm warranty/liability language
  - [x] ~~**Reviews:**~~ **resolved — product/compound/brand reviews only, no app/service testimonials (§5b); page updated, flag closed** (re-opens per §5b if testimonials are ever introduced)
  - [ ] **NEW FLAG — review-claim accuracy gap:** the About and How-We-Review pages state that only human-reviewed records feed the score, but the live batch-1 records are still `ai_extracted` (this section's top open item). Flagged in-page on both; resolves itself when the batch-1 founder review completes — otherwise the copy must be softened (CLAIMS §7)
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
- CORS allowed-origin is read from Render's `FRONTEND_ORIGIN` env var, not hardcoded — but its **default was `http://localhost:3000`**, so if Render didn't set it (or set it to localhost) the browser blocked the live app with an ACAO mismatch. Lesson: default deployment env vars to the **production** value (or a prod-inclusive list), and make origin lists comma-separated so dev + prod coexist. A settings save on Render needs a **redeploy** to take effect.
- A Render **Build Command edit can silently fail to save** — the founder's first attempt at appending `yarn db:migrate` didn't persist, and only surfaced when the migration hadn't run after "changing" the setting. After any Render config edit, re-open the settings page to confirm the value actually stuck, then remember a **redeploy** is still needed for it to take effect (same rule as env vars, §above).
- A `NEXT_PUBLIC_*` env-var **name** mismatch between the code and the Vercel deploy fails **silently**: the value is just `undefined` at build time, so a live-first/fixture-fallback data layer falls back forever and looks like "the backend is down" when the frontend never even tried the right URL. Keep the variable name identical in `lib/api.ts`, `.env.example`, and Vercel — and remember `NEXT_PUBLIC_*` is inlined at **build** time, so changing it needs a **redeploy**, not just a settings save. When a fallback path exists, log the real failure reason (we now do, in `lib/data.ts`) so this is visible in dev tools instead of invisible.

## 11. Next step right now

**Milestone: live scoring works end-to-end at app.thrivetrilogy.com** — the frontend reaches the Render backend, the intake parser matches free-text against the real seeded Neon DB, and the app returns real SEI/Stop-Keep-Start against reviewed evidence. UI, scoring engine, intake parser, evidence data, durable session storage, and deployment are all done and merged (PRs #1–#7).

The highest-value next steps, roughly in order:
1. ~~**Founder review of the batch-1 evidence**~~ — **DONE 2026-07-20.** Live scoring is now review-backed (all 12 sources `human_reviewed`). Remaining batch-1 nicety: fill the 3 still-null sample sizes (Yoshino 2012, McRae, Hoffman) when convenient — not blocking.
2. **Decide the intake-parser default** (heuristic vs LLM) and whether bare numbers like "TMG 500" should be assumed `mg` (§9 decision item).
3. **Cross-compound pathway redundancy detection** (NMN+NR) — the flagship finding, currently undetected (§9 gap).
4. **Expand evidence coverage** beyond the first 5 compounds (batch 2).
5. **Build the Start section** — the recommendation/affiliate engine (firewalled), currently returning empty.
6. **Finalize the 12 legal pages** (§9) with founder facts + attorney review before any paid marketing.
