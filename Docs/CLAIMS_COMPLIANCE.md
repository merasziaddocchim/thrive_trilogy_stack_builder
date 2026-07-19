# CLAIMS_COMPLIANCE.md
**Project:** Thrive Trilogy — Stack Optimizer / Diagnosis Score
**Owner:** Ziad Meras, Founder, Thrive Trilogy
**Purpose:** Single source of truth for what claims this product is allowed to make, in what language, and why. `TECH_DOCS.md` and `BRAND_GUIDELINES.md` both derive from this file — they should reference it, not restate it.

> **This is not legal advice.** This document is an internal engineering/content reference compiled from public regulatory guidance, current as of the "last verified" dates below. It is not a substitute for review by a qualified FTC/FDA-side attorney before launch, before any paid marketing spend, and before any material change to the scoring methodology or claim templates. Regulatory posture, especially around AI, is moving fast — see §7.

---

## 0. The one rule that generates all the others

**This product compares a user's stack against published research parameters. It does not diagnose, treat, or prescribe.**

Every claim the app renders must be phrasable as a *factual comparison* ("your dose of X is Y% below the range studied in [source]") and never as a *clinical recommendation* ("you should take more X" / "X will improve your Y"). This single distinction is what keeps the product on the safe side of DSHEA's disease-claim boundary, FTC's health-claim substantiation standard, and Google's YMYL quality bar simultaneously. When in doubt about any specific sentence the app might generate, this is the test to apply first.

---

## 1. Regulatory landscape summary

Four separate authorities apply to this product, each with a different failure mode. They are not interchangeable and a fix for one does not automatically fix another.

| Authority | What it governs | Failure mode | Teeth |
|---|---|---|---|
| Google Search Quality Rater Guidelines (YMYL / E-E-A-T) | Content quality/trust signals for anything that could affect health, financial stability, or safety | Loss of organic visibility, not a legal penalty | None directly — but ranking is the whole SEO strategy |
| FTC Health Products Compliance Guidance + FTC Act §5 | Truthfulness and substantiation of health-related claims in advertising, incl. apps | "Unfair or deceptive act or practice" | Injunctions, consumer redress, civil penalties |
| FTC Endorsement Guides (16 CFR Part 255) | Affiliate links, material connections, paid-for-rank | Deceptive endorsement | Up to ~$51,744 per violation per day (statutory max, FTC Act §5) |
| FDA — DSHEA / 21 CFR 101.93 | The boundary between permitted structure/function claims and disease claims for dietary supplements | Product/claim gets treated as an unapproved drug | Primarily applies to manufacturers/labeling; relevant to us by extension (see §5) |
| Emerging state AI/ADMT law (Colorado, California, others) | Disclosure obligations for automated decision-making systems | Failure to disclose AI involvement / consequential-decision role | Varies by state; Colorado moving to AG enforcement in 2027 |

**Last verified:** July 3, 2026, against primary sources listed in §9.

---

## 2. Google YMYL / E-E-A-T

- YMYL is not a law — it's Google's internal framework for how strictly a page's quality is scrutinized. A topic is YMYL if "inaccuracies could significantly impact someone's health, financial stability, or safety" (Search Quality Rater Guidelines, Sept. 11, 2025 revision).
- Google is **not anti-AI**. Current guidance: AI-assisted content with genuine editorial oversight, expertise, and added value can rank well; AI content with zero added value gets the lowest possible rating. Raters are specifically trained to look for evidence of editorial review and the absence of typical AI failure modes (invented references, generic filler, inconsistent claims).
- **What this means for us:** every scoring-methodology and claims page needs a named, credentialed author (Ziad Meras, M.Sc.), a visible "last reviewed" date, and citation depth consistent with the rest of the Thrive Trilogy site. This is free, compounding SEO benefit, not just risk mitigation — the E-E-A-T signal and the compliance signal are the same signal.
- Practical minimums: author bio/credentials attached to the methodology page; review-cadence statement; no page that reads as templated/mass-produced without page-specific reasoning.

---

## 3. FTC health-claims substantiation

Source: FTC Health Products Compliance Guidance (Dec. 20, 2022), which superseded the 1998 Dietary Supplements Advertising Guide and **explicitly extends to health-related apps**, not just product ads or labels.

Key standard: health benefit claims require **"competent and reliable scientific evidence"** — defined as evidence conducted and evaluated objectively by qualified experts, using procedures generally accepted in the field, sufficient to support the claim in light of the entire body of relevant evidence. As a general rule, this means randomized controlled human clinical trials; the FTC does not require a specific number of RCTs, but quality outweighs quantity, and independently replicated findings carry more weight than a single study.

Other operative rules:
- If an ad has more than one reasonable interpretation, **each** interpretation must be substantiated.
- Implied claims count the same as express claims (FTC's own examples: lab-coat imagery implying clinical proof; a "90% of cardiologists" statistic implying cardiac benefit).
- **Significant limitations must be disclosed.** E.g., a fatigue-reduction claim must be qualified so users understand only people with an actual deficiency are likely to benefit. This is a direct argument for surfacing evidence tier and population-match alongside every score component, not just in a footnote.
- If the literature is mixed, you cannot advertise as though the science is settled — the claim must reflect the actual weight of evidence.

**What this means for us:** the evidence-tier ceiling (§4) exists specifically to satisfy this standard programmatically — a Tier D compound cannot generate language implying proven benefit, regardless of how well-dosed the user's intake is.

---

## 4. Evidence tier → language mapping

This table is the literal contract between the scoring database (`TECH_DOCS.md` §2) and any copy the app renders. No claim about a compound should exceed the phrasing ceiling for its evidence tier.

| Tier | Definition (from `TECH_DOCS.md`) | Permitted phrasing strength | Required hedge |
|---|---|---|---|
| A — Strong | ≥1 meta-analysis or ≥2 independent human RCTs, adequate combined n | May state dose comparison plainly: "studied doses in human trials range from X–Y mg" | None required beyond standard disclaimer |
| B — Moderate | Single human RCT, or multiple consistent cohort studies | Same dose-comparison language, but qualify source count: "a clinical trial found..." (singular, not "studies show") | "based on limited human trial data" |
| C — Limited | Observational/cohort only, or animal studies with mechanistic plausibility | Comparison language must be prefaced: "preliminary research suggests..." | Explicit "not yet confirmed in human trials" where applicable |
| D — Preliminary | In-vitro or animal-only, single small study | No dose-adequacy claim permitted at all — score for this compound is capped (see `TECH_DOCS.md` §2 ceiling logic) regardless of dosing accuracy | "based on early-stage / non-human research only" |

Rule: the app must never render a recommendation string without a linked `evidence_tier` and `contributing_source_ids` — this is a hard technical requirement carried into `TECH_DOCS.md` §4, not a stylistic preference.

---

## 5. DSHEA / FDA structure-function boundary

Source: 21 U.S.C. § 343(r)(6); 21 CFR 101.93(f)–(g); FDA Small Entity Compliance Guide on Structure/Function Claims.

**Important scope note:** DSHEA's notification and disclaimer requirements technically bind **dietary supplement manufacturers** making claims on their own product labeling — not third-party informational tools like ours. We are not required to file FDA notifications. However, the *substantive line* between structure/function claims and disease claims is the best available legal definition of "safe health claim language" in this space, and FTC's advertising standard for health-related apps effectively imports the same logic. We adopt it voluntarily as our own bar, both for legal safety and because it's the same standard the rest of Thrive Trilogy's content already meets.

**Permitted (structure/function):** statements describing a nutrient's role in normal body structure/function, or the documented mechanism by which it acts to maintain that structure/function. Example pattern: "Magnesium contributes to normal muscle function."

**Not permitted (disease claim) — a statement is a disease claim if it explicitly or implicitly claims the product:**
- Has an effect on a specific disease or class of diseases
- Has an effect on the *signs or symptoms* of a specific disease (scientific or lay terminology)
- Has an effect on an abnormal condition associated with a natural process, where that condition is uncommon or can cause significant/permanent harm
- Is a substitute for a drug/treatment, including via citation of disease-use literature in a way that implies treatment
- Uses the word "disease"/"diseased" outside a general, non-specific statement

**The FDA's own required disclaimer language** (for reference/tone-matching, even though we're not required to file it):
> "This statement has not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."

**Our adapted, non-supplement-manufacturer equivalent** (to be finalized with BRAND_GUIDELINES, draft below):
> "This report compares your stack against published research and is for informational purposes only. It is not medical advice, has not been evaluated by the FDA, and is not intended to diagnose, treat, cure, or prevent any disease. Consult a physician before making changes to your regimen, especially if you take medication or have a medical condition."

Placement rule borrowed from 21 CFR 101.93(d): the disclaimer should sit adjacent to the relevant claim with no intervening material, or be linked via a consistent symbol — a single footer disclaimer on a long report is **not** sufficient by this standard, and also fails FTC's "clear and conspicuous" proximity test (§6).

---

## 5a. Legal and utility pages — required on the app, and why they can't be copy-pasted

The root site (thrivetrilogy.com) already has: About, Affiliate Disclosure, Contact, Cookie Policy, Disclaimer, DMCA Policy, Do Not Sell/Share My Info, FAQ, How We Review, Privacy Policy, Terms & Conditions, Reviews. The app subdomain (`app.thrivetrilogy.com`) needs equivalents — but **these must be adapted, not copied verbatim**, for a compliance reason, not just a style preference:

- **The app collects materially different data than the blog does.** The assessment intake captures stack/health-adjacent inputs (goals, budget, current supplements, potentially lab data) that a content blog's Privacy Policy was never written to disclose. A verbatim copy would be **factually inaccurate about what the app actually collects and does with it** — which is itself a misrepresentation risk under the same FTC framework as any other unsubstantiated claim (§3), independent of anything scoring-related.
- **Affiliate Disclosure needs to explicitly cover the Start section's product links**, using the same "clear and conspicuous" proximity/prominence/presentation/placement test as §6 — a root-site disclosure written for blog content doesn't automatically satisfy per-placement disclosure inside an interactive report.
- **Terms & Conditions needs to reflect the tool's actual function** (a comparison/audit tool, not a content-only site) — including the same "not medical advice" framing established in §5's disclaimer language.

**Rule:** use the root site's existing pages as the legal baseline and starting framework (they already reflect Thrive Trilogy's established positions on liability, disclosure, and disclaimer language), then update each one specifically for what the app collects and does. Treat verbatim duplication as a compliance risk (inaccurate disclosure) and a maintenance risk (drift between two copies), not a shortcut. (Implementation/routing: `TECH_DOCS.md` §7.)

---

## 5b. Confirmed data-practice facts — the source of truth for legal-page disclosures

**Purpose:** the single place where operational facts stated on the legal pages are confirmed and owned. Legal-page copy (`frontend/src/lib/legal-content.ts`) must *state* these facts and reference this section — it must never originate or contradict them. Anything not listed here is still unconfirmed and keeps its founder-review flag on the page. Founder-confirmed 2026-07-19 unless noted.

1. **Assessment data retention (implemented, verified in production).** Assessment data is anonymous — no accounts, no login, no identity attached. It is stored server-side under a random, identity-free token and hard-deleted after 48 hours (enforced by delete-on-read plus sweep-on-create, not merely advisory); the report is derived on read, never stored. Implementation is owned by `TECH_DOCS.md` §1b — this section owns the *disclosure*: legal pages must state the anonymity and the 48-hour cap.
2. **Intake parsing processor (current fact, dated — not a permanent guarantee).** As of 2026-07-19, free-text stack entries are processed by deterministic text-matching software on our own infrastructure. **No LLM/AI provider is used for intake parsing, and no third party receives the user's entry.** Disclosure rule: word this as a statement of current practice, dated, so it does not become false-by-omission if an LLM extractor ships later. **Gate:** enabling any LLM extractor requires updating the Privacy Policy and this section *before* it takes effect. Corollary of §7 (AI-washing cuts both ways): while intake is heuristic, user-facing copy must not describe it as "AI."
3. **Analytics — none currently active; Google Analytics is planned** (founder-corrected 2026-07-19, superseding the earlier "in use" entry). As of 2026-07-19, **no analytics tool is implemented anywhere or collecting data** — consistent with the app codebase, which contains no analytics integration. Disclosure rule: legal pages state current reality (no analytics collecting data) *and* the planned addition of GA, as a dated fact, not a permanent guarantee. **Rules that bind when GA is added:** (a) the Privacy Policy, Cookie Policy, and Do Not Sell page must be updated *before* GA becomes active; (b) a *functional* opt-out that actually stops the GA data flow (not a static disclosure link), plus a GPC-honoring decision, must ship **in the same change** that tags GA in (`TECH_DOCS.md` §8); (c) CCPA/CPRA posture at that point (per the §11 conservative default): treat GA as "sharing" for cross-context behavioral advertising unless its advertising features (Google Signals / ads personalization) are confirmed disabled — that configuration decision is OPEN and must be made at or before tagging.
4. **Email.** No email address is currently collected: the report-unlock screen requests one, but it is not transmitted to or stored on our servers today (client-side only; the capture endpoint is not wired). Collection is **planned near-future** (e.g. emailed report delivery). Disclosure rule: state both honestly — current non-collection as a dated fact, plus the planned use — and update the Privacy Policy *before* actual collection begins.
5. **DMCA designated agent (confirmed):** Ziad Meras, `support@thrivetrilogy.com`. Still open: mailing address and U.S. Copyright Office agent registration.
5a. **Public contact address (confirmed 2026-07-19): `support@thrivetrilogy.com` is the single contact address for everything** — general contact, privacy/data requests, and DMCA. No other address (e.g. a `hello@`) is used anywhere. Still open: whether a mailing address is needed on any page.
6. **Terms & Conditions governing law (confirmed): State of Delaware, USA.** Still open: dispute-resolution mechanism; attorney confirmation of warranty/liability language.
7. **Reviews page scope (confirmed): product/compound/brand reviews only — no app/service customer testimonials.** If testimonials are ever introduced, this item re-opens and they must first be reviewed against the FTC Endorsement Guides (§6).

---

## 6. FTC endorsement / affiliate rules — the score/affiliate firewall

Source: 16 CFR Part 255 (Guides Concerning Endorsements and Testimonials); FTC's own worked example is close to a direct blueprint for this product's core risk.

**The precedent that matters most:** FTC describes a hypothetical headphone-ranking website. If the operator accepts payment in exchange for higher rankings, the rankings are deceptive **regardless of any objectivity disclaimer** — disclosing "we receive payments" does not cure it, because the payment determines the rank itself. If the operator does *not* take payment for rank, but does earn affiliate commissions on referrals, the site must **clearly and conspicuously disclose that it receives such payments.**

**Direct implication for this product:** the diagnosis score and the "start" (affiliate) recommendations must be computed by genuinely independent logic — affiliate relationships must never influence `evidence_tier`, `recommended_range`, or the composite score. This has to be true, checkable, and stated, not just asserted. Suggested public claim: *"Your Stack Score is calculated independently of any affiliate relationship. Products we link to may earn us a commission; this never affects your score or evidence ratings."*

**FTC's four-factor "clear and conspicuous" test** — every disclosure on the platform should pass all four:
1. **Proximity** — physically close to the claim/link it qualifies
2. **Prominence** — large/visible enough to notice without effort
3. **Presentation** — plain language, not legal jargon or a platform's built-in badge alone
4. **Placement** — unavoidable before the consumer reaches the endorsement, not buried behind a click or scroll

Additional operative rules:
- Compliant wording example: "This is a paid link that supports this report." Non-compliant: "commissionable link."
- Each individual ad/placement needs its own disclosure — one disclosure at the top of a long report does not cover every affiliate link further down the page.
- A disclosure is required regardless of dollar value — even a small commission or a free product requires disclosure.

**Extension: affiliate-adjacent third-party content.** The firewall isn't limited to direct affiliate links — it applies to any content that functions as a product endorsement, including linking out to the existing thrivetrilogy.com blog. That content splits into two categories with different rules:
- **Educational/mechanism content** (dosing protocols, bioavailability guides, mechanism explainers) makes no product ranking or purchase recommendation — functionally equivalent to citing a source, not an endorsement. **No additional disclosure needed**; may be linked from anywhere in the Stack Report, including Evidence Tier and Stop/Keep content.
- **"Best X Supplement" roundups and single-brand reviews** rank or recommend specific purchasable products and are themselves affiliate-monetized — these carry the *same* endorsement risk as a direct affiliate link, per the headphone-website precedent above. **Linking one from inside a Stop/Keep finding or Evidence Tier explanation would blur the independence claim in the same way a paid ranking would** — these must be treated as Start-section/marketing-only content, subject to the same disclosure rules as any other affiliate placement.

Practical test before linking any article from inside the app: does it rank or recommend specific purchasable products? If yes, it's Start-section-only. If it only explains a mechanism, dose, or delivery format, it's safe anywhere. (Implementation: `TECH_DOCS.md` §1 `related_articles[]` field, tagged `educational`/`roundup`; voice/placement application in `BRAND_GUIDELINES.md` §8.)

---

## 7. FTC AI-capability claims ("AI-washing")

This is a distinct, newer risk category from health-claims substantiation — it concerns claims about **what the AI itself does**, not claims about supplements.

**Governing precedent:**
- *DoNotPay (Jan. 2025 settlement):* FTC found the AI product's marketed legal-expertise claims ("trained in 200+ areas of law," "iron-clad demand letter") were not substantiated by how the system was actually built and tested.
- *IntelliVision (Jan. 2025 settlement):* FTC found bias/accuracy claims about the AI model were false relative to its actual, much smaller training dataset and testing process.

**The pattern in both:** liability attaches to the *gap* between the claimed capability and the verifiable, documented reality of the system. FTC's authority here comes from Section 5's general deceptive-practices prohibition — no AI-specific statute is required, and the agency brought roughly a dozen AI-washing cases in 2025 alone, with the enforcement posture continuing into 2026.

**Rules for this product:**
- Never say "AI-reviewed for accuracy," "AI-verified," or similar unless a real, documented human-review step actually occurred and can be shown.
- Correct framing: "Extracted from primary research by AI, then verified against source by [credentialed reviewer] before being added to our database" — this is both more defensible and, per §2, more E-E-A-T-favorable than a bare "AI-powered" claim.
- Any claim about model training, testing, or accuracy (e.g., "our model is X% accurate") must be backed by an actual, reproducible internal test — do not state precision/accuracy numbers we have not measured and logged.
- Disclose AI involvement in generating any user-facing report. Simple, direct language is sufficient: "This report was generated using AI, based on our reviewed research database, and is not a substitute for professional medical advice."

---

## 8. State AI / automated decision-making law — monitor, do not over-apply

This is the least settled area and the one most likely to change before launch. Treat this section as a watch-list, not a compliance checklist yet.

- **Colorado:** the original Colorado AI Act (SB 24-205) was **repealed before its effective date** and replaced by the Automated Decision-Making Technology Act (SB 26-189), signed May 14, 2026, effective **January 1, 2027**, with enforcement currently stayed pending litigation. The new law requires "clear and conspicuous" notice before a covered automated decision-making technology materially influences a "consequential decision" in specified domains, including health care services — and, on an adverse outcome, a plain-language explanation within 30 days plus a right to request human review.
  - **Applicability to us is genuinely unresolved.** This product doesn't gate access to treatment, insurance, coverage, or care — it's an informational/purchasing-decision tool. That likely places it outside "consequential decision" as the law's core examples (employment, lending, insurance, housing, healthcare *services*) intend, but this has not been tested and the Colorado AG's implementing rules (due by Jan. 1, 2027) may clarify scope either way.
  - **Recommended posture now:** voluntarily adopt the spirit of the disclosure requirement anyway (state plainly that AI is involved in generating the report — see §7) since it costs nothing and pre-empts the risk if scope is later interpreted broadly.
- **California:** SB 942 (AI Transparency Act) requires disclosure of AI interaction, but only applies to generative-AI providers with 1M+ monthly users — not applicable at launch scale, worth revisiting at growth milestones.
- **General trend:** federal policy is currently deregulatory on AI (2025 rescission of the prior AI executive order), while states are filling the gap unevenly. Re-check this section at least quarterly — it is the fastest-moving part of this entire document.

---

## 9. Core claim templates

Parameterized, pre-approved sentence structures. Copy and code should draw from these rather than freehand new claim language; anything not covered here goes through the escalation path (§11).

**Dose comparison (Tier A/B only):**
> "Your current intake of {compound} is {amount} — {percent}% {above/below} the range used in human research ({range_low}–{range_high} {unit}), based on {source_short_name}."

**Dose comparison (Tier C/D — heavily hedged):**
> "Preliminary, non-human research on {compound} has used doses around {amount}. Human clinical data on optimal dosing is not yet available."

**Redundancy flag:**
> "You're taking {n} products that each contain {shared_ingredient}. Combined, you're spending approximately ${amount}/month on overlapping sources."

**Interaction flag (informational, not a warning of harm unless severity = avoid):**
> "{compound_a} and {compound_b} act on related pathways ({mechanism_note}, {source_short_name}). Consider discussing this combination with a physician."

**Evidence-tier disclosure (always appended where a tier is shown):**
> "Evidence tier: {tier}. {tier_rationale}. Last reviewed {date} by {reviewer_name}."

---

## 10. Banned words and patterns

Never render, regardless of evidence tier:
- **Disease/clinical verbs directed at the user's body:** cure, treat, heal, reverse (aging/disease), prevent [disease name], diagnose, eliminate [condition]
- **Certainty language not supported by Tier A evidence:** "proven," "guaranteed," "clinically proven" (unless directly citing an RCT that used this exact compound/dose/population), "will," "always works"
- **Implied medical authority:** "doctor recommended" (unless literally true and disclosed), "clinically formulated," any suggestion the tool is practicing medicine
- **Unqualified superlatives on affiliate items:** "best," "#1," "top-rated" without a stated, published ranking methodology
- **AI-capability overclaims:** "AI-verified accurate," "medically validated by AI," "clinically trained AI" — none of these are true claims we can currently substantiate

---

## 11. Escalation path

When a new compound, claim, or user-facing sentence doesn't cleanly map to §4/§9/§10:
1. Default to the **more conservative** language tier — treat as one tier lower than the raw evidence might justify if there's genuine ambiguity.
2. Flag the specific compound/claim for human review (the same reviewer role defined in `TECH_DOCS.md` §3) before it ships.
3. Never let an AI-extraction step auto-publish a claim template that isn't already in §9 — new templates require a human sign-off and get added to this file, versioned (§12).
4. When a user's specific situation (medication interactions, existing conditions) creates any ambiguity about safety, the app defaults to "consult a physician" language rather than attempting a specific recommendation.

---

## 12. Change log

| Date | Change | Source |
|---|---|---|
| 2026-07-03 | Initial version drafted | Compiled from sources in this doc, verified live |
| 2026-07-10 | Extended §6 to cover affiliate-adjacent third-party content (roundup articles vs. educational articles); added §5a (legal/utility pages requirement) | Founder-provided content inventory; both rules were previously mis-sourced into BRAND_GUIDELINES.md/TECH_DOCS.md and are now correctly owned here |
| 2026-07-19 | Added §5b: confirmed data-practice facts for legal-page disclosures (48h anonymous retention, heuristic-only intake with LLM-enablement gate, GA treated as CCPA/CPRA "sharing" pending ad-features confirmation + functional-opt-out rule, email non-collection + planned use, DMCA agent, Delaware governing law, Reviews scope) | Founder confirmations, 2026-07-19; retention facts from `TECH_DOCS.md` §1b (PR #7) |
| 2026-07-19 | §5b corrections: (1) analytics fact corrected — Google Analytics is NOT yet implemented anywhere (planned, not active); disclosure reworded to current-reality + planned addition, with the functional-opt-out/same-change rule now binding at GA's future tagging; (2) added §5b.5a — `support@thrivetrilogy.com` confirmed as the single contact address for everything (general + DMCA), `hello@` placeholder removed | Founder corrections, 2026-07-19 |

*Re-verify §8 (state AI law) at minimum quarterly. Re-verify §3 and §6 (FTC guidance) upon any FTC guidance update or enforcement action involving a comparable health-app/comparison-site business model.*

---

## Sources referenced (primary, verified July 3, 2026)

- Google Search Quality Rater Guidelines (Sept. 11, 2025 revision) — guidelines.raterhub.com
- Google "Creating Helpful, Reliable, People-First Content" — developers.google.com/search
- FTC Health Products Compliance Guidance (Dec. 20, 2022) — ftc.gov/business-guidance/resources/health-products-compliance-guidance
- FTC's Endorsement Guides: What People Are Asking — ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- 16 CFR Part 255 (Endorsement Guides) — ecfr.gov
- 21 CFR 101.93 (Structure/Function claims) — ecfr.gov / law.cornell.edu
- FDA Small Entity Compliance Guide on Structure/Function Claims — fda.gov
- FDA Letter to Dietary Supplement Industry on the DSHEA Disclaimer (Dec. 2025) — fda.gov
- FTC AI-washing enforcement summary (DoNotPay, IntelliVision) — lathropgpm.com
- Colorado SB 26-189 (Automated Decision-Making Technology Act) analysis — ropesgray.com, techtimes.com, troutmanprivacy.com
