import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStartSection, EXCLUDED_HREFS, type RecognizedForStart } from './index.js';
import {
  TIER1_PRODUCTS,
  TIER2_ITEMS,
  TIER3_BUNDLES,
} from './catalog.js';
import { SEED_COMPOUND_IDS } from '../db/seed-data.js';

const C = SEED_COMPOUND_IDS;

function recognized(compoundId: string, evidenceTier: RecognizedForStart['evidenceTier'] = 'B'): RecognizedForStart {
  return { compoundId, canonicalName: `compound-${compoundId}`, evidenceTier };
}

/** Every href surfaced anywhere in a Start section (tier1 products + tier2 + tier3). */
function allHrefs(section: ReturnType<typeof buildStartSection>): string[] {
  return [
    ...section.tier1.flatMap((g) => g.products.map((p) => p.href)),
    ...section.tier2.map((i) => i.href),
    ...section.tier3.map((b) => b.href),
  ];
}

// ---- TIER 1 -----------------------------------------------------------------
test('Tier 1: one product group per recognized compound, with the compound its evidence tier', () => {
  const section = buildStartSection([recognized(C.nmn, 'B'), recognized(C.berberine, 'A')]);
  assert.equal(section.tier1.length, 2);

  const nmn = section.tier1.find((g) => g.compound_id === C.nmn);
  assert.ok(nmn);
  assert.equal(nmn.evidence_tier, 'B'); // reflects the compound, passed through unchanged
  assert.equal(nmn.products.length, 5); // NMNBio, Renue, Genuine Purity, Wonderfeel, partiQlar
  assert.ok(nmn.products.some((p) => p.href === '/go/nmnbio-nmn-500mg'));

  const berb = section.tier1.find((g) => g.compound_id === C.berberine);
  assert.ok(berb);
  assert.equal(berb.evidence_tier, 'A');
});

test('Tier 1: only compounds actually in the stack appear (nothing for absent compounds)', () => {
  const section = buildStartSection([recognized(C.tmg)]);
  assert.deepEqual(
    section.tier1.map((g) => g.compound_id),
    [C.tmg],
  );
});

test('Tier 1: an empty stack yields no Tier 1 groups', () => {
  const section = buildStartSection([]);
  assert.equal(section.tier1.length, 0);
});

test('Tier 1: duplicate compound entries are de-duplicated into one group', () => {
  const section = buildStartSection([recognized(C.nmn), recognized(C.nmn)]);
  assert.equal(section.tier1.filter((g) => g.compound_id === C.nmn).length, 1);
});

test('Tier 1: products are listed with NO ranking — source order preserved, all brands equal', () => {
  const section = buildStartSection([recognized(C.nmn)]);
  assert.deepEqual(
    section.tier1[0].products.map((p) => p.brand),
    ['NMNBio', 'Renue by Science', 'Genuine Purity', 'Wonderfeel', 'partiQlar'],
  );
});

// ---- TIER 2 -----------------------------------------------------------------
test('Tier 2: "also available" is always present, carries category labels and no evidence tier', () => {
  const empty = buildStartSection([]);
  const withStack = buildStartSection([recognized(C.nmn)]);
  assert.equal(empty.tier2.length, TIER2_ITEMS.length);
  assert.deepEqual(empty.tier2, withStack.tier2); // not stack-dependent
  for (const item of empty.tier2) {
    assert.ok(item.category && item.category.length > 0);
    assert.ok(!('evidence_tier' in item)); // never an evidence tier on Tier 2
  }
});

// ---- TIER 3 -----------------------------------------------------------------
test('Tier 3: a bundle shows only when the stack contains one of its compounds', () => {
  const withTmg = buildStartSection([recognized(C.tmg)]);
  assert.equal(withTmg.tier3.length, 2); // Starter Pack + Morning both contain TMG
  assert.ok(withTmg.tier3.every((b) => /NMN, TMG/.test(b.contains))); // contents noted in copy

  const withResvOnly = buildStartSection([recognized(C.resveratrol)]);
  assert.equal(withResvOnly.tier3.length, 0); // neither bundle contains resveratrol

  const emptyStack = buildStartSection([]);
  assert.equal(emptyStack.tier3.length, 0);
});

test('Tier 3: only the two ITEMIZED bundles exist in the catalog', () => {
  assert.equal(TIER3_BUNDLES.length, 2);
  assert.deepEqual(
    TIER3_BUNDLES.map((b) => b.href).sort(),
    ['/go/nmnbio-long-starterpack', '/go/nmnbio-morning'],
  );
});

// ---- EXCLUSIONS (must NEVER appear) -----------------------------------------
test('excluded + ambiguous items never appear for ANY stack combination', () => {
  const everyCompound: RecognizedForStart[] = [
    recognized(C.nmn),
    recognized(C.nr),
    recognized(C.resveratrol),
    recognized(C.berberine),
    recognized(C.tmg),
  ];
  const combos = [[], [recognized(C.nr)], [recognized(C.tmg)], everyCompound];
  for (const combo of combos) {
    const hrefs = allHrefs(buildStartSection(combo));
    for (const bad of EXCLUDED_HREFS) {
      assert.ok(!hrefs.includes(bad), `excluded href ${bad} must never surface`);
    }
  }
});

test('the ambiguous partiQlar NR links never appear even when NR is in the stack', () => {
  const section = buildStartSection([recognized(C.nr)]);
  const nr = section.tier1.find((g) => g.compound_id === C.nr);
  assert.ok(nr);
  // NR keeps exactly its two unambiguous products; both partiQlar NR entries are held out.
  assert.deepEqual(nr.products.map((p) => p.href), ['/go/renue-nrpowder', '/go/genuinepurity-nr']);
  const hrefs = nr.products.map((p) => p.href);
  assert.ok(!hrefs.includes('/go/partiQlar_main'));
  assert.ok(!hrefs.includes('/go/partiQlar_NR'));
});

test('the two unitemized bundles never appear in Tier 3 for any stack', () => {
  const hrefs = buildStartSection([recognized(C.nmn), recognized(C.tmg)]).tier3.map((b) => b.href);
  assert.ok(!hrefs.includes('/go/nmnbio-longessentials'));
  assert.ok(!hrefs.includes('/go/nmnbio-ultbiohacker'));
});

// ---- Links used verbatim ----------------------------------------------------
test('all catalog links use the /go/ redirect format exactly (none rewritten)', () => {
  const allCatalogHrefs = [
    ...Object.values(TIER1_PRODUCTS).flat().map((p) => p.href),
    ...TIER2_ITEMS.map((i) => i.href),
    ...TIER3_BUNDLES.map((b) => b.href),
  ];
  for (const href of allCatalogHrefs) {
    assert.match(href, /^\/go\//, `link ${href} must be a /go/ redirect`);
  }
});
