# affiliate-engine

Produces the affiliate/"Start" recommendations. Separate service/module from
`scoring-engine` by hard constraint (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6):
affiliate relationships must never influence evidence_tier, recommended_range, or
the composite score.

Any affiliate link surfaced to a user must carry its own inline disclosure
(BRAND_GUIDELINES §7 / CLAIMS_COMPLIANCE.md §6). Disclosure copy lives in the
compliance template bank, not here.

Business logic intentionally NOT implemented at scaffold stage.
