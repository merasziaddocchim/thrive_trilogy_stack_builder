# affiliate-engine

Produces the affiliate/"Start" recommendations. Separate service/module from
`scoring-engine` by hard constraint (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6):
affiliate relationships must never influence evidence_tier, recommended_range, or
the composite score.

Any affiliate link surfaced to a user must carry its own inline disclosure
(BRAND_GUIDELINES §7 / CLAIMS_COMPLIANCE.md §6). Disclosure copy lives in the
frontend/compliance layer adjacent to each link, not here.

## Contents

- `catalog.ts` — the founder-reviewed product data (Tier 1 per-compound products,
  Tier 2 "also available", Tier 3 bundles), transcribed verbatim from
  `Docs/affiliate-products-structured.md`. Links are the existing `/go/` cloaked
  redirects, used exactly as given. Excluded/ambiguous entries are intentionally
  absent and listed in `EXCLUDED_HREFS` so tests can assert they never leak.
- `index.ts` — `buildStartSection(recognized)` selects which products to surface for
  a given stack (Tier 1 keyed to the scored compounds, Tier 2 always, Tier 3 only
  when the stack overlaps a bundle's contents). Selection only — no scoring, no
  disclosure copy.

The firewall (`scripts/check-firewall.mjs`) enforces isolation in BOTH directions:
`scoring-engine/` may not import affiliate code, and `affiliate-engine/` may not
import `scoring-engine/`.
