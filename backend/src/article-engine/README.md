# article-engine

Selects which thrivetrilogy.com articles to surface in the Stack Report. Separate,
firewalled module for the same reason `affiliate-engine` is (TECH_DOCS §4,
CLAIMS_COMPLIANCE.md §6): **article selection must never influence the score**, and
the scoring path must never be able to reach it.

Selection depends on exactly one input — which compounds are in the Report. No
score, sub-score, dose, evidence tier, or dollar figure is an input, so no article
can move a number.

## The compliance boundary this module encodes

The educational/roundup split is not a style choice — it decides where an article
may legally appear (CLAIMS_COMPLIANCE §6 extension):

| Kind | May appear | Disclosure |
|---|---|---|
| **Educational** — explains a mechanism, dose, or delivery format; recommends no purchasable product | Anywhere, incl. Stop/Keep rows and Evidence Tier content | None — functionally a citation |
| **Roundup** — ranks/recommends purchasable products and is itself affiliate-monetized. **Includes single-brand reviews** (founder decision) | **Start section only** | Per-link, same treatment as an affiliate link |
| **Hub pages** — pillar pages | General placement only, never a per-compound Report slot | None |

Moving an article between `EDUCATIONAL` and `ROUNDUP` in `catalog.ts` changes where
it may appear. Record the founder decision in `Docs/article-linking-structured.md`
first — the code follows that file, never the reverse.

## Contents

- `catalog.ts` — the founder-reviewed mapping, transcribed verbatim from
  `Docs/article-linking-structured.md`. Paths are the live blog slugs exactly as
  supplied; `blogUrl()` — from the shared `src/shared/blog-url.ts`, the same utility
  `affiliate-engine` uses — makes every emitted href absolute against
  `https://thrivetrilogy.com`, because the app runs on a different subdomain and a
  relative href would resolve to the app and 404. Excluded compounds/articles are
  absent structurally *and* listed as `EXCLUDED_SLUG_FRAGMENTS` so tests assert
  they never leak.
- `index.ts` — `buildArticleLinks(recognized)` returns `related_reading` (educational,
  per compound), `start_roundups` (per compound, Start-only), `hubs` (general), and
  `learn_more` (compound_id → one educational link for the Stop/Keep row).

## Two judgment calls worth knowing about

- **Dual-tagged articles repeat across compound groups** rather than being globally
  deduplicated — an NMN+NR stack shows "Best NAD+ Supplements 2026" under both. The
  reasoning (and the one-line change to reverse it) is documented on
  `buildArticleLinks`.
- **`learn_more` falls back to source order.** Only NMN carries an explicit
  "highest relevance" marker in the founder's file; every other compound uses its
  first-listed educational article.

## Firewall

`scripts/check-firewall.mjs` enforces isolation in both directions: `scoring-engine/`
may not import article-engine, and `article-engine/` may not import `scoring-engine/`.

Both directions are proven by **permanent negative probes** in `article-engine.test.ts`
— `firewall FAILS if article-engine imports scoring-engine` and `firewall FAILS if
scoring-engine imports article-engine`. They are not run-once-and-delete: the
`withInjectedImport` helper writes a violating import into the real source file, runs
the firewall script, asserts it exits non-zero, and restores the file in a `finally`.
They run on every `npm test`, so the guard is re-proven rather than assumed. (CI runs
`git diff --exit-code` straight after the suite, because a crashed or cancelled run
could otherwise leave an injected import behind.)

**This pattern is NOT used for `affiliate-engine`.** These two are the only firewall
probes in the suite. `check-firewall.mjs` guards seven directions in total —
`scoring-engine` ✗→ affiliate/article, `affiliate-engine` ✗→ scoring, `article-engine`
✗→ scoring, and `intake-parser` ✗→ affiliate/scoring/article — and all seven are
enforced, but only the two named above are probed. The affiliate and intake-parser
directions are enforced-but-unprobed; adding those probes is open work.
