# TECH_DOCS.md
**Project:** Thrive Trilogy — Stack Optimizer / Diagnosis Score
**Owner:** Ziad Meras, Founder, Thrive Trilogy
**Companion files:** `CLAIMS_COMPLIANCE.md` (source of truth for what claims are legally/ethically defensible — this file implements those rules technically, it does not restate them) · `BRAND_GUIDELINES.md` (voice/copy layer, references both)

---

## 0. Product summary

A web app that audits a user's supplement/peptide stack against a reviewed evidence database, producing (a) a composite **Stack Score** and dollar-denominated waste estimate, and (b) a Stop/Keep/Start report. Core differentiators: inventory-aware (not just "what to buy"), evidence-tier-gated scoring (can't fake a high score with weak evidence), and a firewall between the score and affiliate monetization. Built as an extension of Thrive Trilogy's existing credentialed, citation-first content identity.

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

*(Exact n-thresholds for "adequate" are a policy decision — proposed defaults to be confirmed with Ziad before the first compound batch ships. Once confirmed, log the decision in §8.)*

**User-side tables** (not detailed here — standard shape): `USER_PROFILE` (goals ranked, budget, risk tolerance), `USER_STACK_ITEM` (compound_id, dose taken, delivery format, price paid, source: photo-scan or manual), `USER_LAB_RESULT`, `USER_FEEDBACK` (outcome self-report, feeds personalization — see §3).

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
    # overdosing is penalized more gently than underdosing by default — overdosing wastes
    # money but underdosing wastes money AND fails to deliver the intended structure/function
    # benefit at all. Revisit this asymmetry with Ziad; it's a judgment call, not a derived fact.

Evidence Ceiling (EC), by tier (proposed defaults — confirm before launch):
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

### Open parameters requiring Ziad's sign-off before launch
- Evidence-tier ceiling values (100/80/60/40 proposed)
- Overdosing penalty slope (currently 50× proposed, asymmetric to underdosing)
- Minimum sample-size threshold for Tier A/B distinction

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
- **Hard constraint:** claim copy generation must draw from the template bank in CLAIMS_COMPLIANCE.md §9 — no freehand LLM-generated claim sentences ship without going through the escalation path (CLAIMS_COMPLIANCE.md §11).
- Disclaimer component (CLAIMS_COMPLIANCE.md §5 language) renders adjacent to every report section, not just once in a footer.

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
      keep: [{compound, evidence_tier, source_ids[]}],
      start: [{compound, reason, evidence_tier, source_ids[], affiliate_link?}],
      total_estimated_annual_waste: {low, high} }
  # every object in stop/keep/start MUST include evidence_tier + source_ids — enforced
  # per §4; API layer rejects/logs any internally-generated object missing these fields
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
| 2026-07-03 | Evidence-tier ceiling values (100/80/60/40) | Proposed — awaiting sign-off |
| 2026-07-03 | Overdosing vs underdosing penalty asymmetry | Proposed — awaiting sign-off |
| 2026-07-03 | Min sample-size threshold for Tier A vs B | Not yet proposed |
| — | Single-repo (monorepo) vs two-repo structure | **Resolved — monorepo**, two top-level folders, confirmed |
| — | Render graduation trigger (when to move off free tier) | Proposed: first week with meaningful live-scoring traffic — define threshold |
| 2026-07-10 | Article cross-linking placement (educational vs. roundup content from thrivetrilogy.com) | **Resolved** — see `related_articles` field in §1 and full rule in `BRAND_GUIDELINES.md` §8 |
| 2026-07-10 | Legal/utility pages: copy verbatim vs. adapt | **Resolved — adapt**, not verbatim copy; see §7 |
