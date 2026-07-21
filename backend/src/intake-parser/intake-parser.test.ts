import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntake, describeParser, matchCompound } from './index.js';
import { HeuristicExtractor, LlmExtractor } from './extractor.js';
import type { CompoundRef, ParsedItem } from './types.js';

const COMPOUNDS: CompoundRef[] = [
  { compoundId: 'cmp_nmn', canonicalName: 'NMN (Nicotinamide Mononucleotide)', aliases: ['NMN', 'Nicotinamide Mononucleotide'] },
  { compoundId: 'cmp_nr', canonicalName: 'NR (Nicotinamide Riboside)', aliases: ['NR', 'Nicotinamide Riboside', 'Tru Niagen', 'Niagen'] },
  { compoundId: 'cmp_resveratrol', canonicalName: 'Resveratrol', aliases: ['trans-resveratrol'] },
  { compoundId: 'cmp_tmg', canonicalName: 'TMG (Trimethylglycine)', aliases: ['TMG', 'Trimethylglycine', 'Betaine'] },
  { compoundId: 'cmp_berberine', canonicalName: 'Berberine', aliases: ['berberine HCl'] },
  { compoundId: 'cmp_spermidine', canonicalName: 'Spermidine', aliases: [] },
];

const SAMPLE = `NMN 250mg (Renue by Science, sublingual) - about $45/mo
Tru Niagen 300mg
liposomal resveratrol, 1 scoop
TMG 1000
berberine 500mg 2x day
some kind of spermidine, not sure of the dose
magnesium glycinate at night`;

function byRaw(items: ParsedItem[], substr: string): ParsedItem {
  const found = items.find((i) => i.rawText.includes(substr));
  assert.ok(found, `expected an item for "${substr}"`);
  return found;
}

test('parses the newline-separated sample stack without dropping any compound', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  // Every recognized compound in the sample must be present (nothing silently dropped).
  for (const id of ['cmp_nmn', 'cmp_nr', 'cmp_resveratrol', 'cmp_tmg', 'cmp_berberine', 'cmp_spermidine']) {
    assert.ok(items.some((i) => i.compoundId === id), `expected an item for ${id}`);
  }
  // The comma inside "(Renue by Science, sublingual)" must NOT split the NMN line.
  const nmn = byRaw(items, 'NMN 250mg');
  assert.equal(nmn.deliveryFormat, 'sublingual');
  assert.equal(nmn.monthlyPrice, 45);
});

test('high-confidence match: NMN with dose, format, and price', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const nmn = byRaw(items, 'NMN 250mg');
  assert.equal(nmn.compoundId, 'cmp_nmn');
  assert.equal(nmn.confidence, 'high');
  assert.deepEqual(nmn.dose, { amount: 250, unit: 'mg' });
  assert.equal(nmn.deliveryFormat, 'sublingual');
  assert.equal(nmn.monthlyPrice, 45);
});

test('brand alias resolves: "Tru Niagen" → NR', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const nr = byRaw(items, 'Tru Niagen');
  assert.equal(nr.compoundId, 'cmp_nr');
  assert.equal(nr.confidence, 'high');
  assert.deepEqual(nr.dose, { amount: 300, unit: 'mg' });
});

test('twice-a-day multiplier resolves the daily dose (500mg 2x → 1000mg)', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const berb = byRaw(items, 'berberine');
  assert.equal(berb.compoundId, 'cmp_berberine');
  assert.deepEqual(berb.dose, { amount: 1000, unit: 'mg' });
});

test('recognized compound but uninterpretable dose is downgraded to low confidence', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const resv = byRaw(items, 'resveratrol');
  assert.equal(resv.compoundId, 'cmp_resveratrol'); // name matched
  assert.equal(resv.dose, null); // "1 scoop" is not an interpretable dose
  assert.equal(resv.confidence, 'low'); // so the user is asked to confirm
  assert.equal(resv.deliveryFormat, 'liposomal');

  const sperm = byRaw(items, 'spermidine');
  assert.equal(sperm.compoundId, 'cmp_spermidine');
  assert.equal(sperm.confidence, 'low');
});

test('a compound not in the database is surfaced as unmatched, not silently guessed', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const mag = byRaw(items, 'magnesium glycinate');
  assert.equal(mag.compoundId, null);
  assert.equal(mag.canonicalName, null);
  assert.equal(mag.confidence, 'unmatched');
});

test('the parsed set contains a realistic mix of high, low, and unmatched', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const counts = items.reduce(
    (acc, i) => ({ ...acc, [i.confidence]: (acc[i.confidence] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  assert.ok(counts.high >= 1, 'expected at least one high-confidence match');
  assert.ok(counts.low >= 1, 'expected at least one low-confidence match');
  assert.ok(counts.unmatched >= 1, 'expected at least one unmatched item');
});

// --- Regression: multi-compound input on a SINGLE comma-separated line (the reported bug) ---
// Before the fix the extractor split on newlines only, so a comma-separated line collapsed into
// one candidate — only the first compound (NMN) reached the Confirm screen; Berberine and TMG
// were silently dropped, not even shown as low-confidence items.
test('regression: comma-separated compounds on one line all appear (NMN 500mg, Berberine 500mg, TMG 500)', async () => {
  const items = await parseIntake('NMN 500mg, Berberine 500mg, TMG 500', COMPOUNDS);
  assert.equal(items.length, 3, 'all three compounds must appear — none dropped');

  const nmn = byRaw(items, 'NMN');
  assert.equal(nmn.compoundId, 'cmp_nmn');
  assert.equal(nmn.confidence, 'high');
  assert.deepEqual(nmn.dose, { amount: 500, unit: 'mg' });

  const berb = byRaw(items, 'Berberine');
  assert.equal(berb.compoundId, 'cmp_berberine');
  assert.equal(berb.confidence, 'high');
  assert.deepEqual(berb.dose, { amount: 500, unit: 'mg' });

  // "TMG 500" has no unit → dose uninterpretable → recognized name but downgraded to low
  // (flagged for the user), NOT dropped — the specific behavior the bug report called out.
  const tmg = byRaw(items, 'TMG');
  assert.equal(tmg.compoundId, 'cmp_tmg');
  assert.equal(tmg.confidence, 'low');
  assert.equal(tmg.dose, null);
});

test('regression: comma-separated names with no doses still yield one item per compound', async () => {
  const items = await parseIntake('NMN, Berberine, TMG', COMPOUNDS);
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => i.compoundId).sort(),
    ['cmp_berberine', 'cmp_nmn', 'cmp_tmg'],
  );
});

test('regression: semicolon-separated compounds are split too', async () => {
  const items = await parseIntake('NMN 500mg; Resveratrol 150mg', COMPOUNDS);
  assert.equal(items.length, 2);
  assert.equal(byRaw(items, 'NMN').compoundId, 'cmp_nmn');
  assert.equal(byRaw(items, 'Resveratrol').compoundId, 'cmp_resveratrol');
});

test('a comma between a compound and its own dose does NOT over-split ("Vitamin D, 5000 IU")', async () => {
  // Vitamin D is not in the DB; the point is that this stays ONE candidate carrying the dose,
  // rather than splitting into "Vitamin D" + a nameless "5000 IU" item.
  const items = await parseIntake('Vitamin D, 5000 IU', COMPOUNDS);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].dose, { amount: 5000, unit: 'iu' });
});

test('mixed newlines and commas segment correctly together', async () => {
  const items = await parseIntake('NMN 500mg, Berberine 500mg\nResveratrol 150mg', COMPOUNDS);
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((i) => i.compoundId).sort(),
    ['cmp_berberine', 'cmp_nmn', 'cmp_resveratrol'],
  );
});

// --- The commentary-vs-possible-compound distinction (locked in going forward) ---
// A trailing fragment whose only words are filler/uncertainty is COMMENTARY about the previous
// compound and is merged into it — it must NOT appear as its own "Not recognized" row.
test('trailing commentary is merged into the preceding compound, not shown as its own row', async () => {
  const a = await parseIntake('TMG 1000mg, not sure of the dose', COMPOUNDS);
  assert.equal(a.length, 1, 'commentary must not become a second item');
  assert.equal(a[0].compoundId, 'cmp_tmg');
  assert.ok(!a.some((i) => i.confidence === 'unmatched'), 'no spurious unrecognized row');

  // Different commentary phrasings, all pure filler/uncertainty → still merged.
  for (const note of ['no idea on the dosage', "don't remember the amount", 'maybe some, not sure']) {
    const items = await parseIntake(`Spermidine, ${note}`, COMPOUNDS);
    assert.equal(items.length, 1, `"${note}" should merge, leaving one item`);
    assert.equal(items[0].compoundId, 'cmp_spermidine');
  }
});

// The mirror case: a trailing fragment that could plausibly be a real (but unrecognized)
// compound name has a content word of its own, so it MUST still surface as a flagged row —
// we never silently drop something that might be real.
test('a possible unrecognized compound after a comma still surfaces as a flagged row', async () => {
  const a = await parseIntake('NMN 500mg, quercetin', COMPOUNDS);
  assert.equal(a.length, 2, 'the unknown compound must not be swallowed');
  const q = byRaw(a, 'quercetin');
  assert.equal(q.compoundId, null);
  assert.equal(q.confidence, 'unmatched');

  // Even with a hedge word attached, a real content word keeps the fragment surfaced.
  const b = await parseIntake('NMN 500mg, some new peptide', COMPOUNDS);
  assert.equal(b.length, 2);
  assert.ok(byRaw(b, 'peptide').confidence === 'unmatched');

  // A short unknown name (no dose) still surfaces rather than merging.
  const c = await parseIntake('Berberine 500mg, fisetin', COMPOUNDS);
  assert.equal(c.length, 2);
  assert.equal(byRaw(c, 'fisetin').compoundId, null);
});

test('typo tolerance: "berberin" still matches Berberine', () => {
  const m = matchCompound('berberin', COMPOUNDS);
  assert.equal(m.compound?.compoundId, 'cmp_berberine');
  assert.notEqual(m.confidence, 'unmatched');
});

test('LlmExtractor uses model output when it returns valid JSON', async () => {
  const complete = async () =>
    JSON.stringify([
      { rawText: 'Fisetin 100mg', nameGuess: 'Fisetin', dose: { amount: 100, unit: 'mg' }, deliveryFormat: null, monthlyPrice: null },
    ]);
  const items = await parseIntake('Fisetin 100mg', [{ compoundId: 'cmp_fisetin', canonicalName: 'Fisetin', aliases: [] }], {
    extractor: new LlmExtractor(complete),
  });
  assert.equal(items[0].compoundId, 'cmp_fisetin');
  assert.deepEqual(items[0].dose, { amount: 100, unit: 'mg' });
});

test('LlmExtractor falls back to deterministic parsing when the model call fails', async () => {
  const failing = async () => {
    throw new Error('model unavailable');
  };
  const items = await parseIntake('NMN 250mg', COMPOUNDS, {
    extractor: new LlmExtractor(failing, new HeuristicExtractor()),
  });
  assert.equal(items[0].compoundId, 'cmp_nmn');
  assert.deepEqual(items[0].dose, { amount: 250, unit: 'mg' });
});

test('describeParser contains no banned capability-overclaim terms (CLAIMS §10)', () => {
  const desc = describeParser().toLowerCase();
  const banned = ['ai-verified', 'ai-powered', 'clinically proven', 'ai-reviewed', 'medically validated', 'clinically trained'];
  for (const term of banned) assert.ok(!desc.includes(term), `description must not contain "${term}"`);
});
