import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntake, describeParser, matchCompound } from './index.js';
import { HeuristicExtractor, LlmExtractor } from './extractor.js';
import type { CompoundRef, ParsedItem } from './types.js';

// `defaultUnit` mirrors SEED_COMPOUNDS: every batch-1 compound is milligram-dosed. It is what
// lets a bare number resolve; a fixture without it exercises the "no default unit" path.
const COMPOUNDS: CompoundRef[] = [
  { compoundId: 'cmp_nmn', canonicalName: 'NMN (Nicotinamide Mononucleotide)', aliases: ['NMN', 'Nicotinamide Mononucleotide'], defaultUnit: 'mg' },
  { compoundId: 'cmp_nr', canonicalName: 'NR (Nicotinamide Riboside)', aliases: ['NR', 'Nicotinamide Riboside', 'Tru Niagen', 'Niagen'], defaultUnit: 'mg' },
  { compoundId: 'cmp_resveratrol', canonicalName: 'Resveratrol', aliases: ['trans-resveratrol'], defaultUnit: 'mg' },
  { compoundId: 'cmp_tmg', canonicalName: 'TMG (Trimethylglycine)', aliases: ['TMG', 'Trimethylglycine', 'Betaine'], defaultUnit: 'mg' },
  { compoundId: 'cmp_berberine', canonicalName: 'Berberine', aliases: ['berberine HCl'], defaultUnit: 'mg' },
  { compoundId: 'cmp_spermidine', canonicalName: 'Spermidine', aliases: [], defaultUnit: 'mg' },
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

// Expected values re-derived 2026-08-01 (CLAIMS_COMPLIANCE §4b), NOT relaxed. This test
// previously asserted `confidence === 'low'` for a recognized compound with no usable dose,
// pinning the downgrade at index.ts:42. §4b withdrew that behaviour outright: "The absence of
// a dose is not evidence of an uncertain compound match and must not be rendered as one."
// The test now asserts the stronger, two-axis contract it should always have asserted — the
// match stays high AND the dose gap is still surfaced, on its own axis.
test('a recognized compound with no usable dose keeps its match confidence and flags the dose', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const resv = byRaw(items, 'resveratrol');
  assert.equal(resv.compoundId, 'cmp_resveratrol'); // name matched
  assert.equal(resv.confidence, 'high'); // ...and matching is all confidence reports
  // "1 scoop" is a COUNT, not a dose. It must not resolve — reading it as a quantity would
  // turn "I don't know my dose" into 1 mg via the compound's default unit.
  assert.equal(resv.dose, null);
  assert.equal(resv.doseState, 'missing');
  assert.equal(resv.deliveryFormat, 'liposomal');

  const sperm = byRaw(items, 'spermidine');
  assert.equal(sperm.compoundId, 'cmp_spermidine');
  assert.equal(sperm.confidence, 'high');
  assert.equal(sperm.doseState, 'missing'); // "not sure of the dose" carries no number
});

test('a bare number resolves through the compound default unit, and is marked assumed', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const tmg = byRaw(items, 'TMG 1000');
  assert.equal(tmg.compoundId, 'cmp_tmg');
  assert.equal(tmg.confidence, 'high');
  assert.deepEqual(tmg.dose, { amount: 1000, unit: 'mg' });
  assert.equal(tmg.doseState, 'assumed');
});

test('with NO default unit on the compound, a bare number does not become a dose', async () => {
  // The load-bearing null (CLAIMS_COMPLIANCE §4b): where no default unit is stored, no unit is
  // inferred. This is what makes batch 2's IU- and mcg-dosed compounds safe — the alternative,
  // a global mg fallback, is a 1000x error there.
  const noUnit = COMPOUNDS.map((c) => ({ ...c, defaultUnit: null }));
  const items = await parseIntake('TMG 1000', noUnit);
  assert.equal(items[0].compoundId, 'cmp_tmg');
  assert.equal(items[0].confidence, 'high'); // still recognized...
  assert.equal(items[0].dose, null); // ...but no dose invented
  assert.equal(items[0].doseState, 'missing');

  // An unparseable stored unit is treated exactly like a missing one — never coerced to mg.
  const junkUnit = COMPOUNDS.map((c) => ({ ...c, defaultUnit: 'sprinkles' }));
  const junk = await parseIntake('TMG 1000', junkUnit);
  assert.equal(junk[0].dose, null);
  assert.equal(junk[0].doseState, 'missing');
});

test('an explicit unit is never overridden by the default unit', async () => {
  const items = await parseIntake('NMN 250mg', COMPOUNDS);
  assert.deepEqual(items[0].dose, { amount: 250, unit: 'mg' });
  assert.equal(items[0].doseState, 'explicit');

  // A non-mg explicit unit survives even though every fixture's default unit is mg.
  const iu = await parseIntake('NMN 5000 IU', COMPOUNDS);
  assert.deepEqual(iu[0].dose, { amount: 5000, unit: 'iu' });
  assert.equal(iu[0].doseState, 'explicit');
});

test('numbers that are not doses are never resolved into one', async () => {
  // Each of these has a number, and none of them is a dose. Before the bare-number path
  // existed none could be misread; now each needs its own exclusion, so each gets a case.
  for (const line of ['NMN $45', 'NMN 2x/day', 'NMN 1 scoop', 'NMN 2 capsules', 'NMN 3 gummies']) {
    const [item] = await parseIntake(line, COMPOUNDS);
    assert.equal(item.compoundId, 'cmp_nmn', `${line}: should still match NMN`);
    assert.equal(item.dose, null, `${line}: must not produce a dose`);
    assert.equal(item.doseState, 'missing', `${line}: must be flagged for a dose`);
  }
});

test('a compound not in the database is surfaced as unmatched, not silently guessed', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const mag = byRaw(items, 'magnesium glycinate');
  assert.equal(mag.compoundId, null);
  assert.equal(mag.canonicalName, null);
  assert.equal(mag.confidence, 'unmatched');
});

// Re-derived 2026-08-01, and widened. The old version asserted a mix along ONE axis and
// required `counts.low >= 1` — which only passed because a doseless item was being mislabelled
// as an uncertain match. With the axes separated (§4b) the sample produces a mix along BOTH,
// and asserting both is what the "realistic mix" claim in the name was always reaching for.
test('the parsed set contains a realistic mix on both axes: match confidence AND dose state', async () => {
  const items = await parseIntake(SAMPLE, COMPOUNDS);
  const tally = <K extends string>(pick: (i: ParsedItem) => K): Record<string, number> =>
    items.reduce((acc, i) => ({ ...acc, [pick(i)]: (acc[pick(i)] ?? 0) + 1 }), {} as Record<string, number>);

  const byConfidence = tally((i) => i.confidence);
  assert.ok(byConfidence.high >= 1, 'expected at least one recognized compound');
  assert.ok(byConfidence.unmatched >= 1, 'expected at least one unrecognized compound');

  const byDose = tally((i) => i.doseState);
  assert.ok(byDose.explicit >= 1, 'expected at least one dose given with a unit');
  assert.ok(byDose.assumed >= 1, 'expected at least one bare number resolved via default unit');
  assert.ok(byDose.missing >= 1, 'expected at least one item still awaiting a dose');

  // The point of separating them: no recognized compound is demoted for lacking a dose.
  for (const i of items) {
    if (i.doseState !== 'explicit' && i.compoundId != null) {
      assert.equal(i.confidence, 'high', `${i.rawText}: matched, so confidence must not be reduced`);
    }
  }
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

  // "TMG 500" has no unit. Re-derived 2026-08-01: it is no longer dropped OR demoted — the
  // bare number now resolves through TMG's default unit and is marked `assumed`, and the match
  // stays high because the match was never in doubt (CLAIMS_COMPLIANCE §4b).
  const tmg = byRaw(items, 'TMG');
  assert.equal(tmg.compoundId, 'cmp_tmg');
  assert.equal(tmg.confidence, 'high');
  assert.deepEqual(tmg.dose, { amount: 500, unit: 'mg' });
  assert.equal(tmg.doseState, 'assumed');
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
  const items = await parseIntake('Fisetin 100mg', [{ compoundId: 'cmp_fisetin', canonicalName: 'Fisetin', aliases: [], defaultUnit: 'mg' }], {
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
