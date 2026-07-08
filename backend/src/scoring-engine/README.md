# scoring-engine

Computes the composite score (public name: **Spend Efficiency Index**, per
`Docs/BRAND_GUIDELINES.md` §3) per the formula in `Docs/TECH_DOCS.md` §2.

## FIREWALL (hard constraint, TECH_DOCS §4 / CLAIMS_COMPLIANCE.md §6)

This module MUST NOT import anything from `../affiliate-engine`, and affiliate
data (commission rate, partner status) MUST NOT be a queryable input here.
The check in `scripts/check-firewall.mjs` fails the build if this is violated.

Business logic (the actual formula, ceiling values, penalty slopes) is intentionally
NOT implemented yet - those parameters await sign-off (TECH_DOCS §2 open parameters).
