# BRAND_GUIDELINES.md
**Project:** Thrive Trilogy — Stack Optimizer / Diagnosis Score
**Owner:** Ziad Meras, Founder, Thrive Trilogy
**Companion files:** `CLAIMS_COMPLIANCE.md` (owns all claim-language rules — this file applies them in brand voice, never restates or overrides them) · `TECH_DOCS.md` (owns data/scoring terminology — this file locks the *public-facing* names for those same concepts)

---

## 1. Positioning statement

The product is an **audit and optimizer**, not a discovery quiz. Every piece of copy should reinforce: *we tell you what's wrong with what you already have, and what to do about it within your budget* — not *we'll pick products for you in 3 minutes*.

**Drop entirely:** "in 3 minutes," "get your stack," "build your protocol" as the lead hook — this is the exact generic-quiz-funnel positioning identified as the wrong pattern earlier in this project, and it undersells what the product actually does.

**Lead with instead:** the diagnosis. What's being wasted, what's redundant, what's underdosed — framed as findings, not as a shopping trip.

---

## 2. Voice & tone: Clinical & authoritative

The copy lets the data speak. Confidence comes from specificity (exact numbers, exact citations, exact percentages), not from adjectives.

| Do | Don't |
|---|---|
| "Your NMN dose is 40% below the studied range." | "Your NMN dose could be so much better!" |
| "3 products in your stack share the same active ingredient." | "You're wasting money on redundant supplements!" |
| "Evidence tier: B — one human RCT." | "Backed by science" |
| Numbers first, adjectives never | Exclamation points, hype language, "game-changing," "revolutionary" |

**Banned register, independent of any specific claim:** marketing hype language ("V8 Engine," "cutting-edge," "revolutionary AI") has no place in this product's voice — it undermines the "clinical and authoritative" tone directly, and separately risks the AI-capability-claim issues covered in `CLAIMS_COMPLIANCE.md` §7. See §9 below — this isn't hypothetical, it's already present in the current live copy and needs to change.

**Tone test:** if a sentence would sound at home in a lab report or a brokerage statement, it's the right register. If it would sound at home in a supplement ad, rewrite it.

---

## 3. Naming & terminology (locked)

Use these terms consistently across UI, marketing copy, and code (component/variable names should mirror these where practical, per `TECH_DOCS.md`).

| Concept | Locked public name | Notes |
|---|---|---|
| The composite 0–100 score | **Spend Efficiency Index** (SEI) | Never shorten inconsistently — "SEI" is fine as a repeated-reference shorthand once defined on-page |
| Full unlocked report | **Stack Report** | Contains Stop / Keep / Start sections |
| Report sections | **Stop / Keep / Start** | Exact casing, exact words — don't vary ("Remove/Continue/Add" etc.) |
| The free pre-email teaser | **Preview** (not "free trial," not "sample") | |
| Evidence quality label | **Evidence Tier** (A/B/C/D) | Matches `TECH_DOCS.md` exactly — never invent a parallel label like "confidence score" |
| Dollar estimate | **Estimated Annual Waste** | Always paired with a range (low–high), never a single false-precision number, per `TECH_DOCS.md` §2 |
| The underlying database | Internal only — never named/exposed as a product feature name to users | Avoid inventing a cute internal-engine brand name (see §9 — "V8 Engine" is exactly what to avoid) |

---

## 4. Visual identity — inherited from app.thrivetrilogy.com

Source: live homepage screenshots reviewed July 3, 2026. **Values below are a visual read, not extracted from actual CSS — confirm exact hex codes and font-family declarations against the stylesheet before treating these as final design tokens.**

**Color (estimated):**
- Primary accent (buttons, links, active states, progress fill): a clean mid-saturation royal blue — closest common reference point is roughly the `blue-600` range (~`#2563EB`–`#3B82F6`); confirm exact value
- Headline text: near-black / dark navy (not pure `#000` — has a cool undertone)
- Body text: muted slate/blue-gray, consistently used, never pure gray
- Card fill: white, thin light gray-blue border, generous corner radius, minimal/no shadow
- Background accents: soft blue-lavender gradient blobs, used sparingly as decoration, never as a primary surface
- Footer: pale lavender-tinted background band

**Typography (estimated, confirm exact family names against the site's CSS):**
- Display/headline: bold, high-contrast serif — editorial feel, used for all major headings and the wordmark
- Body/UI/buttons/labels: soft, rounded sans-serif — distinctly warmer/rounder than a geometric sans like Inter

**Imagery:** dark, glossy macro renders of molecular structures for compound-related content. Keep this style if compound imagery is used elsewhere in the app — don't introduce a second, inconsistent illustration style.

**Iconography:** simple monochrome line icons inside soft blue circles — keep this treatment for any new icon needs rather than introducing a different icon style/weight.

---

## 5. Report/dashboard screens — where this identity flexes

The homepage identity above is built for editorial marketing pages. The **Stack Report and Spend Efficiency Index screens** are the core product experience and should lean more toward financial-dashboard precision *within the same palette and type system* — not a different brand, a different register of the same brand.

**Decided: density = balanced (not maximal, not minimal).** Concretely:
- Show the SEI prominently as the anchor number (large, high-contrast, likely using the same bold serif or a numeric-optimized weight of it — test both)
- Stop/Keep/Start sections get clear visual separation (not just headers — distinct card treatment per section, e.g. a subtle left-border or icon color coding) so a user can scan structure before reading detail
- Each compound row shows: name, dollar amount, evidence tier — visible without a click; full citation/mechanism detail available on expand/tap, not dumped inline (this is "balanced," not "dense" — dense would show citations inline by default)
- Numbers get consistent alignment and a tabular/monospaced-adjacent treatment where feasible so figures are easy to scan and compare — this is the one place borrowing a "fintech" convention makes sense even though the base type system is editorial
- Avoid the homepage's generous marketing whitespace on these screens — tighten vertical rhythm so more of the report is visible without scrolling, without crossing into cramped

---

## 6. Approved/banned phrasing — apply, don't restate

All claim-language rules live in `CLAIMS_COMPLIANCE.md` §4, §9, §10 — this section only adds brand-voice flavor on top of already-approved templates, it does not create new claim types.

**Brand-voice application of the approved dose-comparison template (CLAIMS_COMPLIANCE.md §9):**
> "Your {compound} dose is {percent}% below the studied range." — clean, numeric-led, no adjectives. This *is* the brand voice; the compliance rule and the tone rule point the same direction here, which is generally true throughout this product.

Do not add hedging softeners like "we think" or confidence-inflating words like "clearly" — both are voice violations independent of the compliance check, since they either undercut the "data speaks for itself" authority or overstate certainty.

---

## 7. Disclosure placement (applying CLAIMS_COMPLIANCE.md §6's four-factor test)

- The adapted disclaimer (`CLAIMS_COMPLIANCE.md` §5) renders at the top of every Stack Report, in body text size — not footer-only, not fine print
- Each affiliate link in the Start section carries its own inline disclosure text immediately adjacent (per-link, not once-per-page) — e.g. "This is a paid link that supports this report," in the same rounded sans body font, same size as surrounding text, never smaller
- The existing footer already includes an "Affiliate Disclosure" link (confirmed present on the live homepage) — keep it, but it does not substitute for per-link disclosure on the report page itself

---

## 8. Author/credential attribution

Per `CLAIMS_COMPLIANCE.md` §2 (YMYL/E-E-A-T requirement): the Stack Report methodology and "How we review" pages must carry Ziad Meras's name and credentials visibly, in the same serif display treatment used for other headline content — not buried in a footer link. A "Last reviewed by [name], [date]" line belongs on the methodology page and ideally on the report itself.

---

## 9. Existing copy — flagged for revision

Reviewing the current live homepage copy against §2 (voice) and `CLAIMS_COMPLIANCE.md` (claims) surfaces several phrases that need to change, not just cosmetically:

| Current copy | Issue | Direction |
|---|---|---|
| "V8 Engine" | Meaningless hype branding, undermines clinical tone, borders on unsubstantiated capability claim | Remove; describe the actual process plainly if described at all |
| "AI Analysis" / "AI-powered assessment analyzes your biology" | Vague capability claim — see `CLAIMS_COMPLIANCE.md` §7 (AI-washing risk) | Replace with specific, true description of what happens |
| "cross-references 10,000+ clinical studies" | Specific number needs to be literally true and verifiable, or it's a substantiation risk | Only keep if accurate and defensible; otherwise remove the number |
| "Clinically shown to restore cellular energy and repair DNA damage" (NMN card) | Reads as a disease/treatment-adjacent claim — crosses the comparative/prescriptive line in `CLAIMS_COMPLIANCE.md` §0 | Rewrite as mechanism-level, evidence-tiered, sourced language |
| "Tailored strictly to your unique biometric baseline" | Overstates personalization if biometric data isn't actually being collected/used | Only claim what's actually computed |
| "get personalized recommendations... It takes just 3 minutes" | The exact positioning we're moving away from (§1) | Replace with audit/optimizer framing |

This table is a flag list, not a rewrite task done here — full copy pass happens during build, referencing this file and `CLAIMS_COMPLIANCE.md` together.

---

## 10. Open questions / decision log

| Date | Decision needed | Status |
|---|---|---|
| 2026-07-03 | Exact hex/font-family values | Estimated from screenshots — confirm against live CSS before implementation |
| 2026-07-03 | Numeric treatment for SEI display (serif vs. numeric-optimized weight) | Flagged to test both, not yet decided |
| — | Whether "Spend Efficiency Index" gets a visual badge/icon identity of its own | Not yet designed |
