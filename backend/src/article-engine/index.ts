// Article cross-linking surface for the Stack Report. Selects which thrivetrilogy.com articles
// to surface for a given stack, split by the compliance boundary that governs WHERE each kind
// may appear (CLAIMS_COMPLIANCE §6 extension; BRAND_GUIDELINES §8):
//
//   educational → Stop/Keep rows, Evidence Tier content, "Related reading". No disclosure.
//   roundup     → Start section ONLY. Per-link disclosure, same treatment as an affiliate link.
//   hub pages   → general placement only, never a per-compound Report slot.
//
// Firewalled exactly like affiliate-engine (TECH_DOCS §4): un-importable by scoring-engine/,
// and does not import scoring-engine/. Enforced by scripts/check-firewall.mjs. Article selection
// is a function of WHICH COMPOUNDS ARE IN THE REPORT and nothing else — no score, sub-score,
// dose, tier, or dollar figure is an input here, so an article can never move a number.
//
// This module emits NO user-facing claim text and NO disclosure copy — disclosure lives in the
// frontend adjacent to each link (CLAIMS §6 four-factor test), same division as affiliate-engine.
import {
  EDUCATIONAL,
  ROUNDUP,
  HUB_PAGES,
  type Article,
  type HubPage,
} from './catalog.js';

/** A compound present in the Stack Report. Deliberately the ONLY input this module accepts. */
export interface RecognizedForArticles {
  compoundId: string;
  canonicalName: string;
}

/** Articles for one compound, grouped as the founder's source file groups them. */
export interface ArticleGroup {
  compound_id: string;
  compound: string;
  articles: Article[];
}

export interface ArticleLinks {
  /** Educational, per compound. Safe anywhere in the Report (no disclosure). */
  related_reading: ArticleGroup[];
  /** Roundups, per compound. START SECTION ONLY — per-link disclosure required. */
  start_roundups: ArticleGroup[];
  /** General pillar pages. Never rendered inside a per-compound slot (task §6). */
  hubs: HubPage[];
  /**
   * compound_id → the single best educational "Learn more" link for that compound's Stop/Keep
   * row. Absent for a compound with no educational articles. Never a roundup: a roundup in a
   * Stop/Keep row is exactly the placement CLAIMS §6 forbids.
   */
  learn_more: Record<string, Article>;
}

/** Dedupe by href, preserving source order. Applied WITHIN a compound group only — see below. */
function dedupe(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    if (seen.has(a.href)) continue;
    seen.add(a.href);
    out.push(a);
  }
  return out;
}

function groupsFor(
  table: Record<string, Article[]>,
  recognized: Map<string, RecognizedForArticles>,
): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  for (const r of recognized.values()) {
    const articles = table[r.compoundId];
    if (!articles || articles.length === 0) continue;
    groups.push({
      compound_id: r.compoundId,
      compound: r.canonicalName,
      articles: dedupe(articles),
    });
  }
  return groups;
}

/**
 * Build the Report's article links for a stack. `recognized` is the set of compounds present in
 * the Stack Report, deduped by compound_id, in report order.
 *
 * DEDUP DECISION — dual-tagged articles repeat across compound groups, by design.
 * "Best NAD+ Supplements 2026" is tagged under both NMN and NR; a stack with both compounds
 * shows it in the NMN group AND the NR group, rather than once globally. Reasons:
 *   1. The founder's file lists it under both, and both sections are explicitly "grouped per
 *      compound" — a group that silently omitted it because a NEIGHBOURING group already showed
 *      it would be an incomplete answer to "what should I read about NR?", and would differ from
 *      what an NR-only user sees for the same compound.
 *   2. Every roundup placement carries its own disclosure (CLAIMS §6: one disclosure does not
 *      cover a link further down the page), so repetition costs nothing in compliance terms —
 *      global dedup would not reduce the number of disclosures required, only the links.
 *   3. Founder precedent in the same file: "where multiple roundups compete for the same
 *      compound, show all of them rather than picking one" — breadth over curation.
 * Cost, stated plainly: an NMN+NR stack renders that one link twice on the page. If the founder
 * prefers global dedup, it is a one-line change (hoist `seen` out of `dedupe` and share it
 * across groups) plus a test flip — no structural change.
 * Dedup WITHIN a group still applies, so one group can never show the same article twice.
 */
export function buildArticleLinks(recognized: RecognizedForArticles[]): ArticleLinks {
  const byId = new Map<string, RecognizedForArticles>();
  for (const r of recognized) if (!byId.has(r.compoundId)) byId.set(r.compoundId, r);

  const related_reading = groupsFor(EDUCATIONAL, byId);
  const start_roundups = groupsFor(ROUNDUP, byId);

  // "Learn more" = the founder-marked primary where one exists, else first in source order.
  // FLAGGED ASSUMPTION: only NMN carries an explicit marker in the source file; every other
  // compound falls back to source order (see catalog.ts `primary`).
  const learn_more: Record<string, Article> = {};
  for (const group of related_reading) {
    const primary = group.articles.find((a) => a.primary) ?? group.articles[0];
    if (primary) learn_more[group.compound_id] = primary;
  }

  // Hubs are stack-independent by design: they are pillar pages, surfaced generally, never
  // matched to a compound slot. Returned whole so the frontend can render one general block.
  return { related_reading, start_roundups, hubs: HUB_PAGES, learn_more };
}

export { BLOG_ORIGIN, EXCLUDED_SLUG_FRAGMENTS, HUB_PAGES } from './catalog.js';
export type { Article, HubPage } from './catalog.js';
