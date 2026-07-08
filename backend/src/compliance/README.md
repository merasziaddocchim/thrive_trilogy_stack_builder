# compliance

Technical hooks that enforce CLAIMS_COMPLIANCE.md at the API layer (TECH_DOCS §4).

- `claim-guard.ts`: rejects any claim-bearing object missing `evidence_tier` +
  `contributing_source_ids` before it is served (TECH_DOCS §4, §6; CLAIMS_COMPLIANCE §4).
- Claim copy must draw from the CLAIMS_COMPLIANCE.md §9 template bank - no freehand
  LLM-generated claim strings. Template bank loader is a stub here.
