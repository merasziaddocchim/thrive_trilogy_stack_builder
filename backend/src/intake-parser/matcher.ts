// Match a free-text name guess against the reviewed compound registry
// (compounds.canonical_name / aliases), producing a confidence. Deterministic and
// dependency-free so it is fully testable.
import type { CompoundRef, MatchConfidence } from './types.js';

// Confidence thresholds (0–1 similarity). Above HIGH → auto-accept as recognized; between
// LOW and HIGH → surfaced for user confirmation; below LOW → unmatched. Named constants so
// the "reasonable threshold" (TECH_DOCS §1a) is one edit, not scattered magic numbers.
export const HIGH_CONFIDENCE_THRESHOLD = 0.9;
export const LOW_CONFIDENCE_THRESHOLD = 0.55;

export interface MatchResult {
  compound: CompoundRef | null;
  confidence: MatchConfidence;
  similarity: number;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Best match for a name guess across all compounds' canonical name + aliases. */
export function matchCompound(nameGuess: string, compounds: CompoundRef[]): MatchResult {
  const guess = normalize(nameGuess);
  if (!guess) return { compound: null, confidence: 'unmatched', similarity: 0 };

  let best: CompoundRef | null = null;
  let bestSim = 0;

  for (const compound of compounds) {
    const labels = [compound.canonicalName, ...compound.aliases].map(normalize).filter(Boolean);
    for (const label of labels) {
      const sim = similarity(guess, label);
      if (sim > bestSim) {
        bestSim = sim;
        best = compound;
      }
    }
  }

  if (bestSim >= HIGH_CONFIDENCE_THRESHOLD) return { compound: best, confidence: 'high', similarity: bestSim };
  if (bestSim >= LOW_CONFIDENCE_THRESHOLD) return { compound: best, confidence: 'low', similarity: bestSim };
  return { compound: null, confidence: 'unmatched', similarity: bestSim };
}

/**
 * Similarity in [0,1]. Rewards whole-word containment (a label appearing as a token in the
 * guess, or vice-versa) and otherwise falls back to a normalized edit-distance ratio, so
 * "tru niagen 300" still resolves to an "NR" alias and typos like "berberine"/"berberin"
 * stay close.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));

  // Whole-label token containment (label is a phrase found within the guess, or vice versa).
  if (containsAllTokens(aTokens, bTokens) || containsAllTokens(bTokens, aTokens)) return 0.95;

  // Token overlap (Jaccard) blended with best per-token edit ratio.
  const overlap = jaccard(aTokens, bTokens);
  const editRatio = editSimilarity(a, b);
  return Math.max(overlap, editRatio);
}

function containsAllTokens(container: Set<string>, needed: Set<string>): boolean {
  if (needed.size === 0) return false;
  for (const t of needed) if (!container.has(t)) return false;
  return true;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function editSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
