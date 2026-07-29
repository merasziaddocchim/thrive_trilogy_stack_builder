# compliance

Technical hooks that enforce CLAIMS_COMPLIANCE.md at the API layer (TECH_DOCS §4).

- `claim-guard.ts`: rejects any claim-bearing object missing `evidence_tier` +
  `contributing_source_ids` before it is served (TECH_DOCS §4, §6; CLAIMS_COMPLIANCE §4).
- `claim-templates.ts`: the CLAIMS_COMPLIANCE.md §9 template bank, **implemented** — not
  a stub. It is the only source of user-facing finding/headline text: every string the
  API renders about a compound comes from one of its functions, so no freehand or
  LLM-generated claim sentence can reach a response. Exports `tierLetter`,
  `doseComparison`, `withinRangeNote`, `preliminaryDoseNote`, `redundancyFlag`,
  `recognizedSummary`, `tierDisclosure`, plus the `TierLetter` type. Tier-appropriate
  hedging is built in per CLAIMS_COMPLIANCE §4 — Tier C/D never state a dose-adequacy
  verdict.

Adding a new claim shape means adding a template to CLAIMS_COMPLIANCE.md §9 first — that
document originates the wording, this module only parameterises it.
