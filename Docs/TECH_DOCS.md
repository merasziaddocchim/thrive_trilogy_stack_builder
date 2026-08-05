# TECH_DOCS.md
**Project:** Thrive Trilogy — Stack Optimizer / Diagnosis Score
**Owner:** Ziad Meras, Founder, Thrive Trilogy
**Companion files:** `CLAIMS_COMPLIANCE.md` (source of truth for what claims are legally/ethically defensible — this file implements those rules technically, it does not restate them) · `BRAND_GUIDELINES.md` (voice/copy layer, references both)

---

## 0. Product summary

A web app that audits a user's supplement/peptide stack against a reviewed evidence database, producing (a) a composite **Stack Score** and dollar-denominated waste estimate, and (b) a Stop/Adjust/Keep/Start report. Core differentiators: inventory-aware (not just "what to buy"), evidence-tier-gated scoring (can't fake a high score with weak evidence), and a firewall between the score and affiliate monetization. Built as an extension of Thrive Trilogy's existing credentialed, citation-first content identity.

---

## 1. Data architecture

Three-layer model. Layers are separated so raw literature facts, editorial synthesis, and consumer-facing numbers are never blended in one place — this is what makes the system auditable.

**Layer 1 — Source registry:** one record per paper before any data is extracted from it.
```
SOURCE
- source_id, citation, doi_or_url
- study_type: [meta_analysis | systematic_review | RCT | cohort_observational |
               animal_model | in_vitro | case_report | mechanism_review]
- sample_size, population_match: [general_healthy_adult | older_adult_55plus |
               clinical_condition | animal_model | n/a]
- journal_tier: [tier_1_high_impact | tier_2_peer_reviewed | tier_3_preprint_or_low_impact]
- publication_date
- extraction_status: [pending_ai_extraction | ai_extracted | human_reviewed | rejected]
- reviewer_id, review_date, review_notes
```

**Layer 2 — Compound record:** extracted facts, AI-populated, human-review-gated before use in scoring.
```
COMPOUND
- compound_id, canonical_name, aliases, category
  (category maps to existing site pillars: nad_precursor | methylation |
   longevity_compound | delivery_modifier)
- mechanism_summary  (mechanism-level only — never benefit-level; see CLAIMS_COMPLIANCE.md §5)
- related_articles[]  (optional, each entry: {url, article_type: [educational | roundup]})
  # placement rule owned by CLAIMS_COMPLIANCE.md §6 extension (this is a claims/
  # endorsement rule, not a style choice); voice/placement application in
  # BRAND_GUIDELINES.md §8. Roundup articles are affiliate-adjacent and follow
  # the same disclosure rules as any other affiliate placement.

DOSE_RECORD (many per compound)
- dose_record_id, compound_id (FK), source_id (FK)
- studied_dose_min_mg, studied_dose_max_mg, studied_duration_weeks
- delivery_format: [standard_capsule | liposomal | sublingual | powder | injectable]
- outcome_measured, effect_direction: [positive | null_no_effect | negative]
- effect_size, extraction_method, reviewer_id, review_date

BIOAVAILABILITY_RECORD
- compound_id (FK), delivery_format, relative_bioavailability_pct, source_id (FK)

INTERACTION_RECORD
- compound_id_a (FK), compound_id_b (FK)
- interaction_type: [synergistic | redundant_pathway | antagonistic |
                      contraindicated_with_medication_class]
- mechanism_note, severity: [informational | caution | avoid], source_id (FK)
```

**Layer 3 — Scoring parameters:** the distillation layer the formula (§2) actually reads.
```
SCORING_PARAMETER
- compound_id (FK), goal_tag
- recommended_range_low_mg, recommended_range_high_mg
- evidence_tier: [A_strong | B_moderate | C_limited | D_preliminary]
- evidence_tier_rationale  (auto-generated, human-editable)
- bioavailability_adjustment_factor  (per delivery format)
- last_reviewed_date, contributing_source_ids[]
```

**Evidence tier derivation rule (mechanical, not judgment-call, so it's auditable):**
- **A:** ≥1 meta-analysis OR ≥2 independent human RCTs, adequate combined n, general/relevant population
- **B:** single human RCT, or multiple consistent cohort studies
- **C:** observational/cohort only, or animal studies with mechanistic plausibility
- **D:** in-vitro/animal-only, or a single small human study

**SUPERSEDED 2026-07-29 — the four bullets above are no longer the derivation rule.** Tier derivation is now owned by `CLAIMS_COMPLIANCE.md` §4a, which originates it; the list above is retained only as the pre-§4a history and must not be used to assign a tier. The n-threshold that this note previously recorded as unset is settled there too. Do not restate or reinterpret §4a here — this file implements it.

**Implementation status: PART ONE IN CODE, PART TWO OUTSTANDING.** Split deliberately, because only Part Two moves a score.

**Part One — landed 2026-07-30. Records the §4a inputs; moves no score.**
- **Two new `scoring_parameters` columns**, both **NULLABLE**: `outcome_proximity` (enum `outcome_proximity`: `clinical_outcome` · `surrogate_biomarker` · `performance_or_self_report`, the §4a Step 2 buckets) and `direction_of_evidence` (enum `evidence_direction`: the three `effect_direction` values plus `mixed`). `evidence_direction` is a **new** enum, not an extension of `effect_direction`, which is untouched: a single dose record cannot be `mixed`, a parameter aggregating several sources can.
- **Migration `0002_evidence_tier_inputs`** — additive only, `CREATE TYPE` inside `duplicate_object` guards and `ADD COLUMN IF NOT EXISTS`, so it is safe on every Render deploy like `0001`.
- **Backfill script** `src/db/corrections/2026-07-30-tier-inputs.ts` (`npm run db:tier-inputs`), idempotent, absolute-value writes. It also fills the three founder-resolved sample sizes. It reads the tier spread before and after and **aborts if any tier value would move**. Not yet run against production.
- **Direction is derived, never hand-assigned** — `src/db/derive-direction.ts` is the single implementation of §4a's derivation paragraph, used by both the backfill and the test that checks the stored value.
- **Nothing reads either column.** No change to `scoring-engine/`; sub-scores and composite SEI are byte-for-byte what they were.

**Part Two — applied in code 2026-07-30; not yet applied to production.**
- **`src/db/derive-tier.ts` is the single mechanical implementation of §4a Steps 1–3.** It takes a parameter's contributing sources (study type, effect direction, sample size) plus its stored `outcome_proximity` and returns a tier, exposing the intermediate ceiling/demotion/restoration values so the reasoning can be printed and asserted. Same shape and purpose as `derive-direction.ts`. The rule itself is **not** restated here — §4a owns it; if the two disagree, §4a is right and this file is the bug.
- **Nothing hardcodes a tier.** The correction script `src/db/corrections/2026-07-30-apply-tier-rule.ts` (`npm run db:apply-tier-rule`) computes every value through the deriver, and `src/db/derive-tier.test.ts` re-derives all 7 stored tiers on every test run, so tier drift cannot merge.
- **Two implementation points that a shortcut would get wrong**, both covered by tests: Step 3 counts only `RCT` sources and judges agreement **among those trials**, not from the parameter's stored `direction_of_evidence` (that field aggregates non-RCTs too, so it can read `mixed` where the trials themselves agree); and a `meta_analysis` never counts toward the two-or-more trials, because its replication is already in the Step 1 ceiling.
- **Known mapping gap for batch 2:** `study_type` records no field for what a meta-analysis pooled, so `meta_analysis`/`systematic_review` map to an A ceiling on the assumption the pooled studies were RCTs, which is what §4a requires. True for both batch-1 meta-analyses; a pooled *observational* review would need a schema change before it could be tiered correctly.
- **Still owed:** the founder runs `db:apply-tier-rule` against production, and the result is verified in a real report rather than inferred from the script's exit code. Until then `seed-data.ts`/tests hold the §4a spread and production holds the pre-§4a one — `STATUS.md` §9 records both.

**User-side tables** (not detailed here — standard shape): `USER_PROFILE` (goals ranked, budget, risk tolerance), `USER_STACK_ITEM` (compound_id, dose taken, delivery format, price paid, source: photo-scan, manual, or free-text LLM-extraction — see §1a), `USER_LAB_RESULT`, `USER_FEEDBACK` (outcome self-report, feeds personalization — see §3).

---

## 1a. Intake parsing (implemented — built PR #2, live; extractor default is an open decision)

V1 uses a single free-text field (not structured product entry) for initial stack capture — founder decision, 2026-07-11, chosen over a simple fuzzy-match-only approach for better accuracy, and over a stubbed placeholder to avoid deferring the hardest part of the UX. Candidate compound + dose + price matches are extracted against `compounds.canonical_name`/`aliases`, each carrying a confidence level. Below a reasonable threshold, matches are surfaced to the user for confirmation/correction rather than silently accepted — UI: a dedicated "Confirm What We Found" screen, inserted between stack capture and the context questions. Both the extraction step and the confirmation screen are built and live.

**Architecture:** its own module, `backend/src/intake-parser/`, isolated from both `scoring-engine/` and `affiliate-engine/` — it feeds structured output *into* the scoring engine but does not live inside it, consistent with the firewall pattern in §4 (the firewall check covers this module). **Built and merged in PR #2, deployed, and matching free text against the live seeded database in production** (confirmed 2026-07-18). Behavior since built:
- **The default extractor is deterministic, not an LLM.** `POST /intake` uses a heuristic regex/fuzzy extractor; an `LlmExtractor` is an optional injectable interface that is **not** wired in by default. This diverges from the original free-text + LLM-extraction decision above, and **which one ships as the V1 default is still an open founder decision** (§8; also `STATUS.md` §9). Two dependents ride on that decision: whether bare numbers like "TMG 500" are assumed `mg`, and the Privacy Policy's LLM-provider disclosure.
- **Segmentation (PR #13):** input is split on newlines **and** commas/semicolons, parenthesis-aware, with trailing qualifier/commentary fragments merged back into the preceding compound while any fragment containing a real content word still surfaces as its own flagged row — so an unrecognized-but-real compound is never silently dropped.

**Compliance note:** disclosure is owned by `CLAIMS_COMPLIANCE.md` §7 — never "AI-verified" or similar overclaim, only a plain factual description of what happens. **While the heuristic extractor is the default, user-facing copy must not describe intake as "AI" at all** (§7's AI-washing rule cuts both ways; the confirmed fact lives in `CLAIMS_COMPLIANCE.md` §5b item 2, which also gates enabling any LLM extractor on updating the Privacy Policy *first*).

---

## 1b. Assessment session storage (implemented — founder decision, 2026-07-18)

Where an in-progress or completed assessment lives between `POST /assessment` and the later
`GET /assessment/:id/preview|report`. Replaces the original in-memory JS object (lost on every
Render restart/cold start, unsafe across instances). **This is not user data in the account
sense — it is anonymous, ephemeral session state.**

**Table — `assessment_sessions`** (new; added via Drizzle migration `0001_assessment_sessions`,
additive/non-breaking, does not touch the evidence tables):
```
ASSESSMENT_SESSION
- session_id   text PRIMARY KEY   -- a random, identity-free token; the same value returned as
                                     `assessment_id` by POST /assessment. Reuses the existing
                                     session identifier — no second ID system is introduced.
- data         jsonb NOT NULL     -- the assessment intake (stack items + profile). The report is
                                     DERIVED from this on read (single source of truth), not stored.
- created_at   timestamp NOT NULL
- expires_at   timestamp NOT NULL -- created_at + 48 hours; nothing is retained past this
- index on expires_at             -- speeds the expired-row sweep
```

**Anonymity / scope (hard rules):**
- **No accounts, no login, no email, no identity** tied to a session. `session_id` is an opaque
  random token (a UUID). The evidence database (`compounds`/`sources`/`dose_records`/…) is
  completely separate and unaffected.
- **48-hour cap.** Nothing persists beyond `expires_at`. This is the maximum lifetime, enforced two
  ways (below), not merely advisory.

**Expiry + cleanup (Render free tier has no cron/background jobs):**
1. **Lazy delete-on-read:** every session fetch checks `expires_at`; if past, the session behaves
   as *not found* (never an error) and the row is deleted.
2. **Opportunistic sweep-on-create:** each new session creation first deletes all already-expired
   rows. Both steps are best-effort — a cleanup hiccup never blocks a user's save. (Acceptable
   consequence: if the app receives zero new sessions for a long stretch, expired rows may linger
   until the next creation; they are never readable and are swept then.)

**Failure behavior (never silent, never a raw 500):** a write failure returns
`503 session_store_unavailable` (the API never pretends a failed save succeeded); a read DB failure
returns `503`; a missing/expired session returns `404 session_not_found`. The frontend surfaces
these as a clear, retryable message (e.g. "we couldn't save your assessment — nothing you entered
was lost, try again" / "this assessment has expired — sessions are kept 48 hours") rather than
silently substituting sample data.

**Code:** `backend/src/api/services/session-store.ts` (pure logic + `SessionRepository` interface,
unit-tested via an in-memory repo), `session-repository.ts` (Drizzle/Postgres implementation).
Durable persistence of richer user-side tables (`user_profiles`/`user_stack_items`, §1) remains a
separate, later concern; this section only covers anonymous session bridging.

---

## 2. Scoring methodology — the composite formula

This section is the technical implementation of the ceiling principle agreed earlier: **weak evidence caps the achievable score regardless of dosing accuracy; dosing accuracy determines where you land within that cap.**

### Step 1 — Per-compound sub-score

For each compound `C` in the user's stack:

```
effective_dose = user_label_dose × bioavailability_adjustment_factor[user's delivery format]

Dosing Accuracy (DA), 0–100:
  if range_low ≤ effective_dose ≤ range_high:  DA = 100
  if effective_dose < range_low:                DA = 100 × (effective_dose / range_low)
  if effective_dose > range_high:                DA = max(0, 100 − 50 × ((effective_dose − range_high) / range_high))
    # overdosing is penalized more gently than underdosing — overdosing wastes money but
    # underdosing wastes money AND fails to deliver the intended structure/function benefit
    # at all. The 50× slope (asymmetric to underdosing) is CONFIRMED/locked as of 2026-07-12.

Evidence Ceiling (EC), by tier (CONFIRMED/locked 2026-07-12):
  Tier A → 100   Tier B → 80   Tier C → 60   Tier D → 40

Compound Sub-Score = min(DA, EC)
```

**Worked example:** NMN, user takes 150mg standard capsule, studied range 250–500mg, Tier B (single RCT).
`DA = 100 × (150/250) = 60`. `EC = 80`. `Compound Sub-Score = min(60, 80) = 60`.
Now compare: same 150mg dose, but Tier D evidence. `EC = 40`. `Compound Sub-Score = min(60, 40) = 40` — evidence weakness drags the score down below what dosing alone would suggest, which is the entire point of the ceiling design.

### Step 2 — Composite Stack Score

```
Base Score = Σ (Compound Sub-Score_i × $ spent on compound_i) / Σ ($ spent on all compounds)
```
Dollar-weighted, not a flat average — a $200/month underdosed compound should move the score more than a $8/month one. This also keeps the score intuitively tied to spend, which matters for the "this is costing you money" framing.

```
Safety Modifier:
  if any INTERACTION_RECORD with severity = "avoid" applies to the user's stack:
    Composite Score = min(Base Score, 50)
    AND render a separate, prominent safety flag (never buried inside the score number)
  else if severity = "caution" present:
    no score cap, but render an interaction note in the report
```
Safety issues are categorically different from optimization issues and must never be smoothed into a single number that could hide them — hence a hard cap plus a separate visible flag, not a weighted blend.

### Step 3 — Dollar waste figure (kept separate from the 0–100 score, not folded in)

```
Redundancy Waste = Σ (cost of every product beyond the single lowest-cost, best-dosed
                       product per shared active ingredient)
Underdosing Waste = for compounds with DA < 100, an estimated proportion of spend
                     not producing the intended structure/function benefit
                     (methodology: flag as an estimate range, not a false-precision figure)
Total Estimated Annual Waste = (Redundancy Waste + Underdosing Waste) × 12
```
**Why this stays a separate number rather than being baked into the composite score:** the dollar figure is the single most persuasive, concrete thing in the whole product — collapsing it into an abstract 0–100 index would bury the exact number that makes someone feel "this paid for itself." Show both, never merge them.

### Parameter sign-off status
- Evidence-tier ceiling values (100/80/60/40) — **CONFIRMED/locked 2026-07-12**
- Overdosing penalty slope (50×, asymmetric to underdosing) — **CONFIRMED/locked 2026-07-12**
- Minimum sample-size threshold for Tier A/B distinction — **RESOLVED as a written rule 2026-07-29: `CLAIMS_COMPLIANCE.md` §4a now originates tier derivation, including the pooled-n condition.** History, for the record: batch 1's assignments were made per-source and **personally verified against the primary sources by the founder** (all 12 sources, completed 2026-07-20 — `STATUS.md` §9); that review substituted for a formal threshold on that batch but never set one, which is why the derivation rule in §1 was not actually mechanical. §4a closes that. **It is written down but not yet applied** — see the implementation-status note in §1; the live values still come from the 2026-07-20 judgment, and §4a itself records which of them move once it is applied.

---

## 3. Evidence review pipeline

1. **Sourcing:** papers entered into `SOURCE` table (manual addition initially; consider automated literature-monitoring later).
2. **AI extraction:** LLM extracts `DOSE_RECORD`, `BIOAVAILABILITY_RECORD`, `INTERACTION_RECORD` fields from the source text. Status: `ai_extracted`. **Never used in scoring at this stage.**
3. **Human review gate:** a credentialed reviewer (initially Ziad; document the reviewer's qualification per record type for E-E-A-T purposes) checks each AI-extracted record against the primary source, corrects errors, and flips status to `human_reviewed`. Only `human_reviewed` records feed `SCORING_PARAMETER`.
4. **Scoring parameter synthesis:** when enough reviewed dose_records exist for a compound/goal pair, a scoring_parameter row is generated (semi-automated: system proposes a range/tier, reviewer confirms or adjusts).
5. **Outcome feedback loop:** `USER_FEEDBACK` (self-reported outcome) is logged per user per compound over time. This does **not** silently alter evidence_tier (that stays literature-grounded) — it powers a separate, clearly-labeled personalization layer ("users like you reported X") that is never presented as clinical evidence.

This pipeline **is** the claim in CLAIMS_COMPLIANCE.md §7 ("extracted by AI, verified against source by a credentialed reviewer before entering the database") — the claim must never say more than this pipeline actually does.

---

## 4. Compliance enforcement (technical hooks — rules themselves live in CLAIMS_COMPLIANCE.md)

- **Hard constraint:** no UI component may render a compound-specific claim string without a linked `evidence_tier` and `contributing_source_ids`. Enforce at the API layer (§6), not just in frontend discipline — the API should refuse to serve a claim object missing these fields.
- **Hard constraint:** the scoring engine and the affiliate-recommendation engine must be separate services/modules with no shared ranking logic — affiliate data (commission rate, partner status) must not be a queryable input anywhere in `scoring_engine/`. Enforce via code review checklist + a lint rule if feasible (e.g., a CI check that `scoring_engine/` imports contain no affiliate-related modules).
- **Hard constraint (same rule, extended 2026-07-24):** `article-engine/` — which selects thrivetrilogy.com article cross-links for the Report — is firewalled identically. Roundup articles are affiliate-monetized (`CLAIMS_COMPLIANCE.md` §6 extension), so article selection must never influence the score, and the module must not be importable by `scoring-engine/` (nor import it). Its only input is which compounds are in the Report — no score, dose, tier, or dollar figure. Implemented modules under guard, all bidirectional where noted: `scoring-engine/` ✗→ affiliate/article; `affiliate-engine/` ✗→ scoring; `article-engine/` ✗→ scoring; `intake-parser/` ✗→ affiliate/scoring/article. Enforced by `backend/scripts/check-firewall.mjs`, which exits non-zero on a violation and runs in three places: locally via `npm run lint`, and in CI (`.github/workflows/ci.yml`, added 2026-07-29) both inside `npm run lint` and again as a standalone step, on every pull request and every push to `main`. **A violation fails that CI run, and with branch protection enabled on `main` since 2026-07-29 that failure blocks the merge.** Gating comes from the repository's branch-protection settings, not from the workflow — a workflow cannot grant itself that power — so those settings are the authority on exactly which checks are required. Described as "build-gating" here until 2026-07-29; that was inaccurate, because no CI executed at all (the repo's only pipeline config was a `.gitlab-ci.yml` that could not run on GitHub, and neither Render nor Vercel runs this check). **Negative-probe coverage, corrected 2026-07-29:** this line previously said "each direction is proven by a negative probe in the test suite rather than assumed." All seven guarded directions above are enforced by the script, but only **two** are proven by a probe — `article-engine ✗→ scoring-engine` and `scoring-engine ✗→ article-engine`, both in `article-engine.test.ts`. The affiliate and intake-parser directions are enforced but unprobed. Adding the missing probes is open work.
- **Hard constraint:** claim copy generation must draw from the template bank in CLAIMS_COMPLIANCE.md §9 — no freehand LLM-generated claim sentences ship without going through the escalation path (CLAIMS_COMPLIANCE.md §11).
- Disclaimer component (CLAIMS_COMPLIANCE.md §5 language) renders adjacent to every report section, not just once in a footer.
- **Hard constraint (added 2026-07-24 after a production bug):** every outbound link to thrivetrilogy.com — affiliate `/go/` redirects and article links alike — MUST be constructed by the single shared utility `backend/src/shared/blog-url.ts` (`blogUrl()`), never written as a bare relative path. The app is served from `app.thrivetrilogy.com` while the blog and all `/go/` redirects live on the root domain, so a relative href resolves against the app and 404s silently — it is valid TypeScript, valid HTML, and invisible to the build. All 23 affiliate links shipped this way (see `STATUS.md` §7/§10). One utility, not one per engine: the same rule implemented separately in two modules is how affiliate-engine ended up wrong while article-engine was right. Enforced by regression tests in `affiliate-engine.test.ts` and `article-engine.test.ts`.
- The Stack Report renders four action sections in a fixed order: Stop, Adjust, Keep, Start. Section assignment is computed by the routing rule originated in CLAIMS_COMPLIANCE section 4d and implemented as a pure function in backend/src/compliance/finding-routing.ts. It sits under compliance/ rather than scoring-engine/ because section 4d makes the section itself a claim. A section holding no items renders its stated empty-section sentence rather than an empty heading.

---

## 5. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Content/authority site | WordPress on Namecheap shared hosting | `thrivetrilogy.com` root — unchanged, existing SEO equity preserved |
| App frontend | Next.js (App Router) on Vercel | `app.thrivetrilogy.com` subdomain |
| App backend | Node.js (Express) on Render | Scoring engine, extraction pipeline, API — **confirmed** |
| Database | Neon (serverless Postgres) | Free tier: no expiration, 0.5GB/project, 100 CU-hrs/month, scale-to-zero. No credit card required. |
| Version control | GitHub | **Confirmed: monorepo**, two top-level folders (`backend/`, `frontend/`), each independently deployable (Render → `backend/`, Vercel → `frontend/`). Deviates from this doc's original two-repo suggestion — approved, easy to split later if needed. |

**Known constraints to design around:**
- Render free tier: 15-min inactivity spin-down, 30–60s cold start on next request, 750 shared instance-hours/month. **Do not let any SEO-critical or first-impression page depend on a live Render response** — static/marketing/methodology pages must be servable entirely from Vercel (SSG/ISR) with zero backend dependency. The free diagnosis preview (the "holy shit" moment) should either run its computation client-side/edge-side where possible, or the UI must show a designed loading state that gracefully absorbs a cold start rather than looking broken.
- Neon scale-to-zero adds its own reconnect latency on a cold database; stacks with Render's own cold start if both are asleep simultaneously. Mitigate with connection pooling (Neon's pooled endpoint) and by keeping the backend's own idle-to-request path efficient.
- Plan to move off Render's free tier (to its ~$6–7/mo Starter tier) once real users depend on live scoring, to remove cold starts from the product experience — not a launch-blocker, but should be an explicit graduation trigger (e.g., "first week with >X daily active diagnoses run").

**DNS action item:** add a CNAME record for `app` in whatever DNS zone is authoritative for `thrivetrilogy.com` (currently Namecheap), pointing to Vercel, per Vercel's subdomain setup instructions. This does not touch the root domain's WordPress hosting.

---

## 6. API / data contracts (initial shape)

```
POST /assessment
  → { user_profile, stack_items[], labs?[] }
  → { assessment_id }

GET /assessment/{id}/preview   (free tier — no email required)
  → { stack_waste_score: number, headline_finding: string,
      evidence_tier_summary: {A: n, B: n, C: n, D: n} }
  # headline_finding must be built from a §9 template in CLAIMS_COMPLIANCE.md — no freehand text

GET /assessment/{id}/report   (post email-capture)
  → { composite_score: number, safety_flag: boolean|null,
      stop: [{compound, reason, evidence_tier, source_ids[], est_monthly_waste}],
      adjust: [{compound, reason, evidence_tier, source_ids[], monthly_cost}],
      keep: [{compound, evidence_tier, source_ids[]}],
      start: [{compound, reason, evidence_tier, source_ids[], affiliate_link?}],
      total_estimated_annual_waste: {low, high},
      article_links: {
        related_reading: [{compound_id, compound, articles: [{title, href}]}],  # educational
        start_roundups: [{compound_id, compound, articles: [{title, href}]}],   # Start ONLY
        hubs: [{title, href, relevance}],                                       # general only
        learn_more: {compound_id: {title, href}} } }                            # educational
  # every object in stop/adjust/keep/start MUST include evidence_tier + source_ids — enforced
  # per §4; API layer rejects/logs any internally-generated object missing these fields
  # stop/keep rows may also carry an optional `learn_more` educational link (never a roundup).
  # article_links comes from the firewalled article-engine (§4); hrefs are ABSOLUTE on
  # https://thrivetrilogy.com — the blog is a different subdomain from the app, so a relative
  # path would resolve against app.thrivetrilogy.com and 404.
```

Every response object that carries a claim must satisfy the CLAIMS_COMPLIANCE.md §4 requirement (linked evidence tier + sources) at the schema level, not just by convention.

---

## 7. SEO & mobile architecture

- **Rendering strategy:** SSG/ISR (Incremental Static Regeneration) for all marketing, methodology, and "how we review" pages — these are the YMYL/E-E-A-T-critical pages (CLAIMS_COMPLIANCE.md §2) and must be fast, crawlable, and not dependent on Render being warm. Client-side rendering is acceptable for the interactive assessment flow and the post-auth dashboard, which don't need to be indexed.
- **Structured data:** `Person` schema for Ziad on methodology/authorship pages (direct E-E-A-T signal); `Organization` schema site-wide; `Article` schema on any long-form methodology content, mirroring what likely already exists on the WordPress site — keep the schema vocabulary consistent across both properties.
- **Sitemap/robots coordination:** `app.thrivetrilogy.com` needs its own `sitemap.xml` and `robots.txt`, submitted separately in Google Search Console alongside the existing WordPress property. Avoid content duplication between the blog's compound articles and the app's methodology pages — cross-link rather than restate.
- **Canonical tags:** required on any app page that overlaps in topic with an existing WordPress article (e.g., an NMN methodology page on the app vs. an NMN article on the blog) to avoid Google treating them as competing/duplicate content.
- **Core Web Vitals:** directly threatened by the Render/Neon cold-start stacking risk in §5 — treat LCP/TTFB on any page that calls the live backend as a first-class design constraint, not an afterthought.
- **Mobile-first:** Tailwind CSS with mobile breakpoints as the default design target (not desktop-first-then-adapt), touch-friendly assessment flow (large tap targets, minimal typing — favor selects/sliders over free text where the schema allows), test the cabinet-photo-scan flow specifically on mobile camera capture since that's likely the primary device for that interaction.
- **Legal/utility pages required on `app.thrivetrilogy.com`:** About, Affiliate Disclosure, Contact, Cookie Policy, Disclaimer, DMCA Policy, Do Not Sell/Share My Info, FAQ, How We Review, Privacy Policy, Terms & Conditions, Reviews. Requirement and reasoning (why these must be adapted from the root site rather than copied verbatim) owned by `CLAIMS_COMPLIANCE.md` §5a — this line only covers implementation: route as SSG pages alongside `/` and `/methodology` (backend-independent, per this section's rendering strategy).

---

## 8. Open questions / decision log

| Date | Decision needed | Status |
|---|---|---|
| 2026-07-03 | Backend language: Python/FastAPI vs Node/TypeScript | **Resolved — Node.js (Express)** |
| 2026-07-03 | Evidence-tier ceiling values (100/80/60/40) | **Resolved — CONFIRMED/locked 2026-07-12** |
| 2026-07-03 | Overdosing vs underdosing penalty asymmetry (50× slope) | **Resolved — CONFIRMED/locked 2026-07-12** |
| 2026-07-03 | Min sample-size threshold for Tier A vs B | **Resolved 2026-07-29** — subsumed into the Evidence Tier assignment rule originated in `CLAIMS_COMPLIANCE.md` §4a. Written down, **not yet implemented**; see the implementation-status note in §1 |
| 2026-07-11 | Intake extractor default: heuristic (deterministic) vs LLM | **Open.** Built heuristic-by-default in PR #2 and live; the LLM path is an injectable interface, not wired in. Diverges from the 2026-07-11 "free-text + LLM extraction" resolution below — that decision covered the *capture method* (free text), and the extractor question is now separable. Carries two dependents: bare-number unit assumption ("TMG 500" → mg?) and the Privacy Policy LLM-provider disclosure (gated by `CLAIMS_COMPLIANCE.md` §5b item 2) |
| — | Single-repo (monorepo) vs two-repo structure | **Resolved — monorepo**, two top-level folders, confirmed |
| — | Render graduation trigger (when to move off free tier) | Proposed: first week with meaningful live-scoring traffic — define threshold |
| 2026-07-10 | Article cross-linking placement (educational vs. roundup content from thrivetrilogy.com) | **Resolved** — see `related_articles` field in §1 and full rule in `BRAND_GUIDELINES.md` §8 |
| 2026-07-10 | Legal/utility pages: copy verbatim vs. adapt | **Resolved — adapt**, not verbatim copy; see §7 |
| 2026-07-11 | Stack capture method: structured entry/photo-scan vs. free-text + LLM extraction | **Resolved — free-text + LLM extraction**, confidence-gated with user confirmation step; see §1a |
| 2026-07-19 | Google Analytics functional opt-out: GA is **planned but not yet implemented anywhere** (founder-corrected 2026-07-19 — no analytics currently collects data; nothing exists in this repo either). Per `CLAIMS_COMPLIANCE.md` §5b (owning rule), when GA is added it must not be tagged into the app frontend without (a) the Privacy/Cookie/Do-Not-Sell pages updated first, and (b) a functional opt-out (actually stopping the GA data flow, e.g. consent-gated tag loading / `ga-disable-<ID>`) plus a GPC-honoring decision shipping in the same change | **Open — future engineering item**, paired with the founder's GA ad-features decision (Google Signals / ads personalization on or off), due at or before tagging |
| 2026-07-11 | Claude Code UI prompt corrected after independent audit (Gemini 3.1 Pro) surfaced 3 real gaps (scope bleed into backend work, incomplete legal page list, missing structured data requirement) + 1 self-caught gap (this architecture note was undocumented) | All 4 fixed; documentation-ownership pattern (rules belong in the owning doc, not a one-off prompt) reinforced again |
