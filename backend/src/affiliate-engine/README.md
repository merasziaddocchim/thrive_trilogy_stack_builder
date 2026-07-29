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
  **Every href goes through `blogUrl()` from `src/shared/blog-url.ts`** — the same
  utility `article-engine` uses. The `/go/` redirects live on the ROOT domain, so a
  bare `'/go/...'` string resolves against `app.thrivetrilogy.com` and 404s. That
  bug shipped to production for all 23 links: introduced by PR #16 (merged 2026-07-21)
  and fixed by PR #21 (merged 2026-07-29), so it was live ≈7.5 days. (Dates are the git
  merge timestamps; an earlier version of this line said "2026-07-24", which was the day
  the fix session started, not the day either change landed.) The regression tests in
  `affiliate-engine.test.ts` fail the run if any link goes relative again — and since
  2026-07-29 that means the merge is blocked too, because those tests now execute in CI
  (`.github/workflows/ci.yml`, PR #23) with branch protection enabled on `main`. Before
  that, nothing ran them automatically.
- `index.ts` — `buildStartSection(recognized)` selects which products to surface for
  a given stack (Tier 1 keyed to the scored compounds, Tier 2 always, Tier 3 only
  when the stack overlaps a bundle's contents). Selection only — no scoring, no
  disclosure copy.

The firewall (`scripts/check-firewall.mjs`) enforces isolation in BOTH directions:
`scoring-engine/` may not import affiliate code, and `affiliate-engine/` may not
import `scoring-engine/`.
