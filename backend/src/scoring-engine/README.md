# scoring-engine

Computes the composite score (public name: **Spend Efficiency Index**, per
`Docs/BRAND_GUIDELINES.md` §3) per the formula in `Docs/TECH_DOCS.md` §2.

## FIREWALL (hard constraint, TECH_DOCS §4 / CLAIMS_COMPLIANCE.md §6)

This module MUST NOT import anything from `../affiliate-engine`, and affiliate
data (commission rate, partner status) MUST NOT be a queryable input here.
The check in `scripts/check-firewall.mjs` fails the build if this is violated.

## Implemented in full

The formula, the ceiling values and the penalty slope are all implemented and live —
this module has not been a stub since PR #2. The parameters that were awaiting sign-off
were **CONFIRMED/locked on 2026-07-12** (`TECH_DOCS.md` §2 "Parameter sign-off status"):

- `constants.ts` — `EVIDENCE_CEILINGS` (A 100 / B 80 / C 60 / D 40),
  `OVERDOSE_PENALTY_SLOPE` (50, asymmetric to underdosing), `SAFETY_AVOID_CAP` (50).
- `dosing.ts` — effective dose and the asymmetric dosing-accuracy curve (§2 Step 1).
- `subscore.ts` — `Compound Sub-Score = min(dosingAccuracy, evidenceCeiling)`.
- `composite.ts` — dollar-weighted composite (§2 Step 2) + the safety modifier: an
  `avoid` interaction caps the composite and raises a separate flag.
- `waste.ts` — Estimated Annual Waste as a low–high range, kept separate from the
  0–100 score and never folded into it (§2 Step 3).

One parameter is still open, and it is not one of the above: the **minimum sample-size
threshold for the Tier A/B distinction** has never been set as a written rule. Batch 1
shipped without it — per-source founder review substituted for it — and it is required
before batch 2 (`TECH_DOCS.md` §2/§8).

Covered by `scoring.test.ts` (14 tests) plus `../db/seed-scoring.test.ts`, which drives
this engine over the real seeded evidence.
