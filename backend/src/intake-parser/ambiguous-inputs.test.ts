// =============================================================================
// AMBIGUOUS INPUTS — inputs that name more than one real product must never auto-accept.
//
// The finding that produced this file: leaving a string OUT of `aliases` does nothing. With
// `ALA` and `AKG` declared nowhere, the real matcher still returned
//   ALA -> Alpha-lipoic acid  0.950 high   (reached via the "R-ALA" alias)
//   AKG -> Ca-AKG             0.950 high   (reached via the canonical name itself)
// because fuzzy similarity gets there anyway. Omission is inert; only an explicit rule works.
//
// The demotion is to `low`, never `unmatched`: low routes to the Confirm screen with the best
// guess visible, which is what PR #30 built. Unmatched is the "Not recognized" dead end PR #30
// was written to remove.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCompound, AMBIGUOUS_INPUTS, HIGH_CONFIDENCE_THRESHOLD } from './matcher.js';
import type { CompoundRef } from './types.js';
import { SEED_COMPOUNDS } from '../db/seed-data.js';

const refs: CompoundRef[] = SEED_COMPOUNDS.map((c) => ({
  compoundId: c.compoundId as string,
  canonicalName: c.canonicalName as string,
  aliases: (c.aliases as string[]) ?? [],
  defaultUnit: (c.defaultUnit as string | null) ?? null,
}));

test('every ambiguous input is demoted to low confidence, with its best guess intact', () => {
  for (const input of AMBIGUOUS_INPUTS) {
    const m = matchCompound(input, refs);
    assert.equal(m.confidence, 'low', `${input} must not auto-accept`);
    assert.ok(m.compound != null, `${input} must keep a best guess for the user to confirm`);
  }
});

test('ANTI-VACUITY: each ambiguous input WOULD have auto-accepted without the list', () => {
  // The demotion above proves nothing unless the raw similarity actually clears the high
  // threshold. If a future alias change dropped these below 0.9 the guard would still pass
  // while protecting nothing — this fails in that case.
  for (const input of AMBIGUOUS_INPUTS) {
    const m = matchCompound(input, refs);
    assert.ok(
      m.similarity >= HIGH_CONFIDENCE_THRESHOLD,
      `${input} scores ${m.similarity.toFixed(3)}; below ${HIGH_CONFIDENCE_THRESHOLD} the demotion is doing nothing`,
    );
  }
});

test('the specific pairs each ambiguous input confuses', () => {
  // Named individually so the reason each entry exists survives in the suite.
  assert.equal(matchCompound('ALA', refs).compound?.canonicalName, 'Alpha-lipoic acid');
  assert.equal(matchCompound('AKG', refs).compound?.canonicalName, 'Ca-AKG');
  assert.equal(matchCompound('betaine HCl', refs).compound?.canonicalName, 'TMG (Trimethylglycine)');
});

test('demotion survives casing and whitespace', () => {
  // normalize() lowercases, folds punctuation to spaces and collapses runs, so all of these
  // reduce to a string in the list.
  for (const v of ['ala', 'ALA', ' Akg ', 'Betaine HCL', 'betaine  hcl']) {
    assert.equal(matchCompound(v, refs).confidence, 'low', `${v} must be demoted too`);
  }
});

test('LIMITATION: dot-separated initialisms do not reach the list', () => {
  // "A.L.A" normalizes to "a l a" — three tokens, not the string "ala" — so it never reaches
  // AMBIGUOUS_INPUTS and falls below the similarity floor instead. Recorded rather than fixed:
  // the outcome (unmatched, user retypes) is safe, and widening normalization to join single
  // letters would change matching for every input in the registry, not just this one.
  assert.equal(matchCompound('A.L.A', refs).confidence, 'unmatched');
});

test('unambiguous inputs are untouched by the list', () => {
  // The list must not become a general confidence cap.
  for (const [input, expected] of [
    ['creatine', 'Creatine'],
    ['R-ALA', 'Alpha-lipoic acid'],
    ['calcium alpha-ketoglutarate', 'Ca-AKG'],
    ['betaine', 'TMG (Trimethylglycine)'],
    ['NMN', 'NMN (Nicotinamide Mononucleotide)'],
    ['NAC', 'N-acetylcysteine'],
  ] as const) {
    const m = matchCompound(input, refs);
    assert.equal(m.confidence, 'high', `${input} should still auto-accept`);
    assert.equal(m.compound?.canonicalName, expected);
  }
});

test('NAC resolves to N-acetylcysteine, not NAD+', () => {
  // Before the batch-2 registry, "NAC" fuzzy-matched NAD+ at 0.667 (low) — the app asked the
  // user to confirm a different molecule. NAC is now a compound in its own right.
  const m = matchCompound('NAC', refs);
  assert.equal(m.compound?.canonicalName, 'N-acetylcysteine');
  assert.equal(m.confidence, 'high');
});

test('PS resolves to Phosphatidylserine and steals nothing', () => {
  const m = matchCompound('PS', refs);
  assert.equal(m.compound?.canonicalName, 'Phosphatidylserine');
  assert.equal(m.confidence, 'high');
});

test('every declared canonical name and alias resolves to its own compound', () => {
  // The whole-registry sweep: adding 36 compounds must not make an existing label ambiguous.
  const misrouted: string[] = [];
  for (const r of refs) {
    for (const label of [r.canonicalName, ...r.aliases]) {
      const m = matchCompound(label, refs);
      if (m.compound?.compoundId !== r.compoundId) {
        misrouted.push(`"${label}" (${r.canonicalName}) -> ${m.compound?.canonicalName ?? 'unmatched'}`);
      }
    }
  }
  assert.deepEqual(misrouted, [], 'no declared label may resolve to a different compound');
});

test('compound ids and canonical names are unique across the registry', () => {
  const ids = refs.map((r) => r.compoundId);
  const names = refs.map((r) => r.canonicalName.toLowerCase());
  assert.equal(new Set(ids).size, ids.length, 'duplicate compound id');
  assert.equal(new Set(names).size, names.length, 'duplicate canonical name');
});

test('every registry compound has a unit the parser can actually use', () => {
  // A stored unit the parser cannot parse behaves exactly like NULL while looking populated.
  const bad = SEED_COMPOUNDS.filter((c) => c.defaultUnit != null && !['mg', 'mcg', 'g', 'iu'].includes(c.defaultUnit as string));
  assert.deepEqual(bad.map((c) => c.canonicalName), []);
});

test('§4e: no batch-2 compound carries a mechanism summary', () => {
  // §4e: recognition "carries no statement about the compound". A mechanism summary is one.
  const withSummary = SEED_COMPOUNDS.filter(
    (c) => (c.compoundId as string) > 'c0000000-0000-4000-8000-000000000005' && c.mechanismSummary != null,
  );
  assert.deepEqual(withSummary.map((c) => c.canonicalName), []);
});
