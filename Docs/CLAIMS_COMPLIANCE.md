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

| Tier | Definition | Permitted phrasing strength | Required hedge |
|---|---|---|---|
| A — Strong | Pooled randomized human trials measuring a clinical outcome or established clinical marker | May state dose comparison plainly: "studied doses in human trials range from X–Y mg" | None required beyond standard disclaimer |
| B — Moderate | Randomized human trial evidence, one step short of Tier A | Same dose-comparison language, but qualify source count: "a clinical trial found..." (singular, not "studies show") | "based on limited human trial data" |
| C — Limited | Human evidence exists but is unreplicated, uncontrolled, or conflicting | Comparison language must be prefaced: "preliminary research suggests..." | Explicit "not yet confirmed in human trials" where applicable |
| D — Preliminary | No controlled human trial evidence | No dose-adequacy claim permitted at all — score for this compound is capped (see `TECH_DOCS.md` §2 ceiling logic) regardless of dosing accuracy | "based on early-stage / non-human research only" |

### What each Evidence Tier means

These definitions describe how strong the evidence is. They do not describe
a single study design, because a parameter can arrive at the same tier by
more than one route through the assignment rule in section 4a.

Evidence Tier A. Multiple randomized human trials have been pooled and
analysed together, and they measured a clinical outcome or an established
clinical marker rather than an indirect one. This is the strongest tier
available and few compounds reach it.

Evidence Tier B. Randomized controlled human trials support this, one step
short of Tier A. A parameter reaches Tier B by one of three routes: pooled
trials that measured only an indirect marker; independent controlled trials
that agree with each other on an indirect marker; or a controlled trial
measuring a clinical outcome directly. This is genuine controlled evidence,
though not the strongest form of it.

Evidence Tier C. Human evidence exists but has not been independently
confirmed. This covers uncontrolled or observational studies; a single
controlled trial measuring an indirect marker or a physical performance
outcome; and controlled trials that do not agree with each other. A Tier C
rating does NOT mean the evidence is animal-only or poor quality. It means
the evidence has not been replicated in a way that would rule out chance. A
well-run human trial can sit at Tier C.

Evidence Tier D. Either there is no controlled human trial evidence at all,
with support coming from laboratory work, animal studies, or review
articles that do not themselves test the compound in people; or the human
evidence is both uncontrolled and limited to an indirect marker. This is
the weakest tier.

None of these four tiers states whether the compound worked. Tier describes
how strong the evidence is, not what it found. A compound can sit at Tier C
because one good trial found nothing, which is a different situation from
sitting at Tier C because nobody has run a second trial. Direction of
evidence is recorded in its own field, and any user-facing statement about
what the evidence found must draw on that field and never on the tier.

Rule: the app must never render a recommendation string without a linked `evidence_tier` and `contributing_source_ids` — this is a hard technical requirement carried into `TECH_DOCS.md` §4, not a stylistic preference.

---

## 4a. Evidence Tier assignment rule (originated 2026-07-29)

Evidence Tier is a property of a compound-outcome scoring parameter, not of
an individual source. Sources carry no tier. A parameter's tier is derived
from the sources listed in its contributingSourceIds.

This rule replaces per-source founder judgment, which was adequate for
batch 1's twelve sources but does not scale. It applies to batch 2 onward
AND retroactively to batch 1, because the Spend Efficiency Index compares
compounds against one another: a tier derived from judgment and a tier
derived from this rule are not comparable, and mixing them makes the
ranking meaningless.

Three steps, in order.

Step 1 - Design sets the ceiling. The best study design among the
parameter's contributing sources sets the highest tier attainable:
- Meta-analysis or systematic review of human randomized controlled trials
  gives a ceiling of Evidence Tier A
- Human randomized controlled trial gives a ceiling of Evidence Tier B
- Human non-randomized, open-label, or observational study gives a ceiling
  of Evidence Tier C
- Mechanistic, animal, in vitro, or narrative review gives a ceiling of
  Evidence Tier D

Step 2 - Outcome proximity may demote, never promote. Judged on what the
study actually measured:
- Clinical outcome, validated clinical marker, or head-to-head comparison
  against an established therapy: no demotion
- Surrogate biomarker, meaning a measure believed to track a clinical
  outcome but not itself one: demote one tier
- Physical performance or subjective self-report: demote one tier

Step 3 - Replication may restore one tier lost in Step 2. It can never
raise a parameter above its Step 1 ceiling. Restoration requires all of
the following:
- two or more independent human randomized controlled trials
- their findings agree in direction
- a pooled sample size of at least 30 participants across those trials

Only randomized controlled trials can restore. An observational,
single-arm, or open-label study can establish a ceiling in Step 1, but it
cannot confirm a finding in Step 3: replication means an independent test
capable of being wrong, and an uncontrolled study is not that test.

A meta-analysis cannot trigger restoration. Its replication is already
reflected in the Step 1 ceiling, and counting it again would double-count
the same evidence.

Direction of evidence is recorded separately and is never folded into the
tier. A well-conducted trial that finds no effect is strong evidence of
absence, not weak evidence. Evidence Tier expresses the quality of the
evidence; direction expresses what it found. Conflating them would assign
identical scores to "no adequate study exists" and "an adequate study found
this does not work" - opposite conclusions. For a product whose purpose is
telling a user what to stop buying, that distinction is the point.
Direction is a separate field on the scoring parameter, and no user-facing
statement drawn from it may be presented as an Evidence Tier.

Batch-1 assignments under this rule:
- Berberine x metabolic_health: meta-analysis of RCTs, clinical outcome
  measured head-to-head against an established therapy, Evidence Tier A
- TMG x healthy_aging: meta-analysis of RCTs, surrogate biomarker,
  restoration not available to a meta-analysis, Evidence Tier B
- NR x healthy_aging: two human RCTs, surrogate biomarker, findings do not
  agree in direction so restoration is unavailable, Evidence Tier C
- NMN x metabolic_health: human RCT ceiling, surrogate biomarker, only one
  contributing RCT so restoration is unavailable, Evidence Tier C
- NMN x training_and_recovery: human RCT, performance endpoint, single
  study, Evidence Tier C
- Resveratrol x metabolic_health: two human RCTs, surrogate biomarker,
  findings do not agree in direction, Evidence Tier C
- TMG x training_and_recovery: human RCT, performance endpoint, single
  study, Evidence Tier C

Three assignments change when this rule is applied: NR x healthy_aging from
Evidence Tier B to C, NMN x metabolic_health from B to C, and NMN x
training_and_recovery from B to C. Each rested on founder judgment that is
not defensible under a stated rule. The batch-1 distribution moves from one
A, four B and two C to one A, one B and five C. This lowers the NMN and NR
sub-scores and therefore the composite Spend Efficiency Index of any stack
containing either compound. That is a live, user-visible change. It must be
verified in production rather than assumed from a merge, and it is not
applied by the change that introduces this rule.

Known open refinement, to be decided before batch 2 ships: whether
restoration should additionally require that the trials measure the same
outcome. Two trials measuring different endpoints are not strictly in
conflict even when one is null, so "agree in direction" is an imprecise
test for that case. It changes no batch-1 assignment, because every
affected parameter already fails restoration on another condition. It has
not been adopted and must not be applied until it is.

Deriving direction of evidence. A parameter's direction is derived from the
effect directions recorded on the dose records of its contributing sources.
If every contributing source recorded a positive effect, the parameter's
direction is positive. If every contributing source recorded no effect, it
is null. If the contributing sources disagree with one another, it is
mixed, and a mixed direction must never be presented to a user as either a
positive or a null finding. If any contributing source recorded a harmful
effect, that takes precedence over every other value and the direction is
negative regardless of what the other sources found: a harm signal is not
averaged away by findings that did not look for harm.

---

## 4b. Unit inference disclosure (originated 2026-07-31)

The intake parser may infer a dose unit when a user enters a bare number
following a recognized compound. It may do so only from a default unit stored
on that compound's record, derived from the human-reviewed evidence database,
and never from a global constant, a product label, a brand catalogue, or any
affiliate source.

Where no default unit is stored for the compound, no unit is inferred and the
dose remains unparsed.

Every inferred unit must be displayed to the user on the Confirm screen,
stating the value as entered and the unit applied, and must remain editable
before scoring. An inferred unit that is not shown to the user must not be
scored.

Compound-match confidence and dose completeness are separate states and must
be presented separately. The absence of a dose is not evidence of an uncertain
compound match and must not be rendered as one.

---

## 4c. Outcome matching disclosure (originated 2026-08-01)

A user's stated priority goal selects which compound-outcome scoring parameter
is used to score each item in their stack. A compound may carry parameters for
several outcomes, or for none matching the user's stated priority.

Where a parameter exists for the user's stated priority, it is used and no
disclosure is required.

Where no parameter exists for the user's stated priority, the parameter with
the highest Evidence Tier is used, ties broken by outcome name in ascending
alphabetical order, so that the selection is deterministic and reproducible.
The selection must never depend on database row order.

Any finding scored against an outcome other than the user's stated priority
must say so on the surface where it appears, naming both the outcome the user
chose and the outcome the finding was measured against. A finding presented
without that statement asserts a relevance it does not have: an Evidence Tier
earned for metabolic health is not evidence for training and recovery, and the
dose range attached to that parameter is the range studied for that outcome,
not for the user's.

Priority selection determines both the Evidence Tier shown and the dose range
used to compute dosing accuracy. Both derive from the same parameter, and this
disclosure covers both.

---

## 4d. Finding routing (originated 2026-08-01)

Every scored item in a Stack Report is placed in exactly one action section.
The section a finding appears in is a recommendation about the user's
spending and their regimen, and is therefore a claim in its own right,
independent of the sentence rendered inside it.

Sections are evaluated in this order, and the first matching rule places the
item.

Stop. The spend is not buying the user anything. An item is placed here when
it duplicates another item resolving to the same compound and is not the
best-dosed of those duplicates; when its Evidence Tier is D; or when its
recorded direction of evidence is null or negative, meaning an adequate
study looked and found no effect, or found harm. An absent direction of
evidence means the value has not been derived and is never grounds for Stop.

Adjust. The dose needs the user's attention. An item is placed here when its
dose falls outside the range used in human research, or when no studied dose
range exists for it and the dose therefore cannot be checked against
research. Any item placed in Adjust must state the finding that put it
there, regardless of its Evidence Tier: a section that names an action must
show its reason.

Keep. The dose falls inside the studied range and the evidence supports the
compound.

An Evidence Tier of C is not by itself grounds for Stop. Tier C means the
evidence has not been independently confirmed; it does not mean the compound
does not work, and section 4 states so explicitly. The evidence ceiling
already lowers the Spend Efficiency Index for a Tier C item, and routing it
to Stop as well would penalise the same fact twice and tell the user to
abandon a compound the reviewed evidence does not contradict.

No section may render a prescriptive dose. A finding may state the user's
dose, the range used in human research, and the distance between them. It
may not instruct the user to take a specific amount. The section name
carries the action and the sentence carries the evidence. Recommending a
dose is clinical advice and this product does not give it.

A section containing no items must state that plainly rather than rendering
an empty heading. An empty Stop section is a finding in its own right and
must read as one.

---

## 4e. Recognized but unreviewed compounds (originated 2026-08-05)

The compound registry and the evidence database are separate. A compound may
be recognized by name without its evidence having been reviewed. Recognition
means only that the app can identify what the user typed. It carries no
statement about the compound.

A recognized compound with no scoring parameter has no Evidence Tier, no
studied dose range and no direction of evidence. It must not be assigned a
tier, must not be routed to Stop, Adjust or Keep, and must not be given a
default or placeholder grade of any kind. Absence of review is not a finding,
and must never be rendered as one.

Such a compound is listed separately from the action sections, stating plainly
that it has not been reviewed and is not scored.

An unreviewed compound must not carry a purchase link. A link placed beside a
compound the app has not assessed is a recommendation the evidence does not
support.

Where any compound the user entered is excluded from the Spend Efficiency
Index, every surface that presents that score must state how many of the
user's compounds it covers. A composite presented without that statement
asserts a scope it does not have. Naming one surface is not sufficient: this
paragraph originally named the report alone, and the Preview rendered the same
unqualified score for as long as it did.

## 4f. Score interpretation (originated 2026-08-06)

The sentence rendered beside the Spend Efficiency Index is a claim about why
the score is what it is. It must name the constraint that actually bound the
score, and it must not attribute the score to dosing where dosing did not bind
it.

A composite score does not identify its own cause. The same value can arise
from a well-dosed compound with limited evidence or a badly-dosed compound
with strong evidence, and these call for opposite responses from the reader.
An interpretation selected on the score alone therefore asserts something the
score does not establish.

Two facts about the scored items determine the sentence. Dosing is a binding
constraint where any scored item's dosing accuracy is lower than its evidence
ceiling. Evidence is a binding constraint where any scored item's evidence
ceiling is below its maximum. Both may hold, and neither may hold.

The interpretation sentence is claim copy and is held with all other claim
copy, subject to the same guard. It must not be authored in a rendering
component.

The interpretation sentence accompanies the Spend Efficiency Index on every
surface that presents it. A score shown without it leaves the reader to supply
their own explanation for a number that does not explain itself.

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
3. **Analytics — Vercel Web Analytics is active; Google Analytics is not implemented** (corrected 2026-08-05, superseding the 2026-07-19 entry). Vercel Web Analytics was installed in PR #32 on 2026-08-04 and runs on every page of the app. It is the only analytics tool implemented anywhere. Per its vendor documentation it sets no cookies and writes nothing to the visitor's device; visitors are identified by a hash generated server-side from the incoming request, valid for a single day and then reset, so a visitor cannot be recognized across days or across sites. Recorded data points are anonymous, are not tied to an individual or to an IP address, and the service does not collect information that would allow a browsing session to be reconstructed across applications or websites. Data is used for aggregated statistics only. Because no personal information is sold, and none is disclosed for cross-context behavioral advertising, no CCPA or CPRA opt-out is required for this tool and a Global Privacy Control signal has nothing to act on. That conclusion rests on this tool's design as documented by its vendor, and holds for this tool only. **Rules that bind when ANY analytics, advertising, or visitor-tracking technology is added or changed — not only Google Analytics:** (a) the Privacy Policy, Cookie Policy, and Do Not Sell page must be updated *before* the technology becomes active; (b) if the technology sets a cookie, writes any persistent identifier to the visitor's device, or discloses personal information for cross-context behavioral advertising, then a *functional* opt-out that actually stops the data flow, plus a GPC-honoring decision, must ship in the same change; (c) the CCPA/CPRA posture must be re-decided at that point under the §11 conservative default. The 2026-07-19 version of this rule named Google Analytics specifically, and a different vendor was added without triggering it — the rule is vendor-agnostic from this correction forward. **Still open for Google Analytics specifically, if it is ever added:** its advertising-features configuration (Google Signals / ads personalization on or off), which determines whether it counts as "sharing".
4. **Email.** No email address is currently collected: the report-unlock screen requests one, but it is not transmitted to or stored on our servers today (client-side only; the capture endpoint is not wired). Collection is **planned near-future** (e.g. emailed report delivery). Disclosure rule: state both honestly — current non-collection as a dated fact, plus the planned use — and update the Privacy Policy *before* actual collection begins.
5. **DMCA designated agent (confirmed):** Ziad Meras, `legal@thrivetrilogy.com` (changed from `support@` on 2026-08-05). Still open: mailing address and U.S. Copyright Office agent registration. If the agent is ever registered, the registered address must match the address published on the DMCA page — settle any further change before filing, not after.
5a. **Public contact addresses (confirmed 2026-08-05, superseding the 2026-07-19 single-address entry).** Two addresses are published, each with a defined purpose. `support@thrivetrilogy.com` is for general contact and product questions. `legal@thrivetrilogy.com` is for privacy and data requests, the Do Not Sell or Share channel, DMCA notices, and any other legal notice. A third address, `merasziad@thrivetrilogy.com`, exists but is published on no page and must not be added to one: a role address survives a change of hands and a personal address does not. Any page that directs a reader to a channel must publish the address for that channel, or link to the page that does. Still open: whether a mailing address is needed on any page.
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

Practical test before linking any article from inside the app: does it rank or recommend specific purchasable products? If yes, it's Start-section-only. If it only explains a mechanism, dose, or delivery format, it's safe anywhere. (Implementation: `TECH_DOCS.md` §1 `related_articles[]` field, tagged `educational`/`roundup`; the founder's per-compound mapping is `Docs/article-linking-structured.md`; voice/placement application in `BRAND_GUIDELINES.md` §8.)

**Approved disclosure wording for roundup-article links (added 2026-07-24).** A roundup link needs the same *treatment* as an affiliate link — per-link, adjacent, same size, plain language — but **not the same sentence**, because the affiliate sentence would be false:

| Placement | Approved wording | Why |
|---|---|---|
| Direct affiliate/product link | "This is a paid link that supports this report." | Accurate: the click itself is monetized |
| Roundup or single-brand review article on thrivetrilogy.com | **"This is our own article, and it recommends products that can earn us a commission."** | The link is *not* paid — nobody pays us for the click. The two material facts are that the destination is ours (a self-interest disclosure) and that it recommends commission-earning products |

Calling an unpaid link "a paid link" would be its own misrepresentation, so the wording differs while the four-factor test (proximity, prominence, presentation, placement) is satisfied identically. **Single-brand reviews count as roundups** (founder decision, recorded in `Docs/article-linking-structured.md`) — a review of one brand is still a product recommendation.

Technical enforcement: article selection lives in a firewalled `article-engine/` module that the scoring path cannot import (`TECH_DOCS.md` §4) — the same structural separation as `affiliate-engine/`, for the same reason. Rendering rules (updated 2026-07-24 — every outbound link in the Report now opens in a new tab, since all of them leave the app for the root domain):

| Link kind | `target` | `rel` | Disclosure |
|---|---|---|---|
| Affiliate product / bundle | `_blank` | `sponsored nofollow noopener noreferrer` | Per-link, affiliate wording |
| Roundup article | `_blank` | `noopener noreferrer` — **deliberately no `sponsored`** | Per-link, content-link wording |
| Educational article / hub | `_blank` | `noopener noreferrer` | None |

`sponsored` marks a *paid* placement, which is why it appears on affiliate links and not on links to our own articles — the endorsement risk there is disclosed in copy, not in markup. `noopener noreferrer` accompanies every `target="_blank"` so the opened page cannot reach back through `window.opener`.

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
- **Disclose the actual role AI plays in any user-facing report — and only that role.** This cuts both ways: overstating AI's involvement is the same category of deceptive gap as overstating its capability, and it is the error this project actually made. The earlier prescribed sentence here ("This report was generated using AI, based on our reviewed research database…") was **withdrawn on 2026-07-24 as an overclaim**: the report is not AI-generated. Three distinct things happen, and the disclosure must keep them distinct:
  1. **Scoring** — deterministic software applying the §2 formula in `TECH_DOCS.md`. No language model involved, and no language model writes report text.
  2. **Evidence database** — study data extracted from primary sources by AI, then verified against those sources by a credentialed reviewer before it can feed scoring (`TECH_DOCS.md` §3). This is the one place AI genuinely operates, and the §7 "correct framing" bullet above is the approved way to describe it.
  3. **Intake** — deterministic text-matching of the user's free-text entry, user-confirmed before scoring. **Not AI** while the heuristic extractor is the default (`TECH_DOCS.md` §1a; fact and enablement gate in §5b item 2).

  **Approved disclosure (current, as of 2026-07-24):**
  > "Your report is calculated by deterministic scoring software against our reviewed research database — it is not written by an AI language model. That database is built by extracting study data from primary sources with AI, then verifying it against those sources by a credentialed reviewer; your free-text entry is matched to compounds by deterministic text-matching, and you confirm those matches before anything is scored. This is not a substitute for professional medical advice."

  Implementation note (not a delegation of ownership): this text lives in the app as `AI_ROLE_NOTE` in `frontend/src/lib/constants.ts` and is rendered verbatim on **three** surfaces — the report (`app/report/[id]/page.tsx`), the methodology page, and the homepage. It was previously hardcoded in several places and drifted, which is how the overclaim survived. **This section remains the origin of the wording; the constant must match it, not the reverse.** Any change to what the pipeline actually does — enabling an LLM extractor, generating any report prose with a model — requires updating this section **before** the change ships, and the constant follows.

  **Second approved disclosure — INTAKE ONLY (`INTAKE_METHOD_NOTE`, current as of 2026-07-29):**
  > "We read your free-text entry and match it to compounds using automated text-matching (not an AI model). You're confirming those matches now, before anything is scored."

  **Scope — this one covers INTAKE specifically; `AI_ROLE_NOTE` above covers the pipeline as a whole.** The two texts are deliberately different and must not be collapsed into one. The Confirm screen describes only what has happened to the user's free-text entry at that moment, which is item 3 above and nothing else. The full `AI_ROLE_NOTE` would be *less* accurate on that surface, not more: it also describes deterministic scoring and AI-assisted database extraction, and at the point the user is confirming matches neither of those has happened yet. This section originates both texts; the constants must match them, not the reverse.

  Implementation: `INTAKE_METHOD_NOTE` in `frontend/src/lib/constants.ts`, character-identical to the text above, rendered on the Confirm screen (`frontend/src/components/assessment/ConfirmStep.tsx`).

  **Consolidation landed 2026-07-29.** `ConfirmStep.tsx` previously hardcoded this sentence, which made it a fourth copy sitting outside the single-sourcing the rest of this note relies on. It now imports the constant. The open item recorded here on 2026-07-29, and the standing instruction to hand-apply any AI-role edit in two places, are both retired — that instruction depended on someone remembering it, and the structure now does the job instead. Editing either text above still requires editing only its constant.

---

## 8. State AI / automated decision-making law — monitor, do not over-apply

This is the least settled area and the one most likely to change before launch. Treat this section as a watch-list, not a compliance checklist yet.

- **Colorado:** the original Colorado AI Act (SB 24-205) was **repealed before its effective date** and replaced by the Automated Decision-Making Technology Act (SB 26-189), signed May 14, 2026, effective **January 1, 2027**, with enforcement currently stayed pending litigation. The new law requires "clear and conspicuous" notice before a covered automated decision-making technology materially influences a "consequential decision" in specified domains, including health care services — and, on an adverse outcome, a plain-language explanation within 30 days plus a right to request human review.
  - **Applicability to us is genuinely unresolved.** This product doesn't gate access to treatment, insurance, coverage, or care — it's an informational/purchasing-decision tool. That likely places it outside "consequential decision" as the law's core examples (employment, lending, insurance, housing, healthcare *services*) intend, but this has not been tested and the Colorado AG's implementing rules (due by Jan. 1, 2027) may clarify scope either way.
  - **Recommended posture now:** voluntarily adopt the spirit of the disclosure requirement anyway (state plainly what role AI actually plays, per §7's approved disclosure — which for this product means saying the report is *not* model-generated, not implying that it is) since it costs nothing and pre-empts the risk if scope is later interpreted broadly.
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
| 2026-07-24 | §6 extended with approved disclosure wording for **roundup-article links** ("This is our own article, and it recommends products that can earn us a commission"), distinguished from the affiliate-link sentence because a link to our own article is not itself a paid link — using the affiliate wording there would be a misrepresentation in the other direction. Records that single-brand reviews count as roundups (founder decision), that roundup links carry no `rel="sponsored"`, and that article selection is firewalled in `article-engine/` | Article-linking build, 2026-07-24; founder mapping in `Docs/article-linking-structured.md`, founder instruction on rel/disclosure treatment |
| 2026-07-24 | **§7 disclosure sentence corrected — the doc was justifying an overclaim the app had already fixed.** The prescribed "This report was generated using AI…" language was withdrawn: the report is produced by deterministic scoring software, not a language model. §7 now separates the three pipeline roles (deterministic scoring · AI extraction + credentialed human verification · deterministic, user-confirmed intake matching) and carries the approved disclosure text verbatim, with the app's `AI_ROLE_NOTE` constant bound to follow this section rather than define it. §8's Colorado posture bullet updated to match. No app copy changed — the shipped text was already accurate (PR #15); this closes the doc-vs-reality gap in the owning document | Drift found reviewing the four governing docs against the repo, 2026-07-24; founder-directed correction the same day |
| 2026-07-29 | **Added §4a: the Evidence Tier assignment rule.** Replaces per-source founder judgment, which did not scale, with a stated three-step derivation (design ceiling, outcome-proximity demotion, RCT-only replication restoration) that applies to batch 2 onward and retroactively to batch 1, because the SEI compares compounds against one another and judgment-derived and rule-derived tiers are not comparable. Records the batch-1 assignments it yields, the three that change, and one open refinement that has not been adopted. Direction of evidence is held separately from tier and may never be rendered as one. §4's tier→language mapping is unaffected; its "Definition" column still describes the pre-§4a derivation and is flagged for reconciliation when §4a is applied | Founder decision, 2026-07-29. Written down only — no tier value, schema or seed record changed; implementation and production verification tracked in `TECH_DOCS.md` §1 and `STATUS.md` |
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
