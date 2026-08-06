// =============================================================================
// CLAIM TEMPLATE GUARDS — the two defects found auditing preliminaryDoseNote (2026-07-31).
//
// claim-templates.ts is the ONLY source of user-facing finding text (CLAIMS_COMPLIANCE §9,
// TECH_DOCS §4), so a wrong sentence here is wrong on every report that renders it. Both
// failures below shipped to production and neither was caught by a type, a lint or a test:
//
//   1. "Preliminary, non-human research on X..." rendered on Tier C rows. "Preliminary" is
//      Tier D's PUBLIC LABEL (CLAIMS §4), so the sentence contradicted the badge beside it.
//   2. The same sentence asserted the evidence was non-human. Under §4a, Tier C means the
//      human evidence is UNREPLICATED, not that it is animal-only — §4a says so outright.
//      Every C_limited parameter in batch 1 rests on human controlled trials, so the claim
//      was false on all of them.
//
// These tests read the rendered STRINGS rather than the source, so they hold regardless of how
// a template is written.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  doseComparison,
  withinRangeNote,
  preliminaryDoseNote,
  redundancyFlag,
  recognizedSummary,
  tierDisclosure,
  outcomeMismatchNote,
  noStudiedRangeNote,
} from './claim-templates.js';
import {
  recognizedSummaryWithUnreviewed,
  coverageSentence,
  coverageSentenceFor,
} from './claim-templates.js';
import * as templates from './claim-templates.js';
import { SEED_SCORING_PARAMETERS, SEED_SOURCES, SEED_COMPOUNDS } from '../db/seed-data.js';

/**
 * Every template, rendered with representative arguments. Adding a template to
 * claim-templates.ts without adding it here leaves it unguarded — the count assertion below
 * is what forces that to be noticed.
 */
const RENDERED: Array<{ name: string; text: string }> = [
  {
    name: 'doseComparison',
    text: doseComparison({
      compound: 'TMG (Trimethylglycine)',
      amount: 1000,
      unit: 'mg',
      percent: -33,
      rangeLow: 1500,
      rangeHigh: 6000,
      sourceShortName: 'McRae 2013',
    }),
  },
  {
    name: 'withinRangeNote',
    text: withinRangeNote({
      compound: 'Berberine',
      amount: 1200,
      unit: 'mg',
      rangeLow: 900,
      rangeHigh: 1500,
    }),
  },
  { name: 'preliminaryDoseNote', text: preliminaryDoseNote('NMN (Nicotinamide Mononucleotide)', 250, 'mg') },
  {
    name: 'redundancyFlag',
    text: redundancyFlag({ productCount: 2, sharedIngredient: 'NMN', monthlyCost: 60 }),
  },
  { name: 'recognizedSummary', text: recognizedSummary(3) },
  { name: 'noStudiedRangeNote', text: noStudiedRangeNote('Spermidine') },
  {
    name: 'outcomeMismatchNote',
    // Rendered in its firing state; its non-firing state is asserted separately below.
    text: outcomeMismatchNote({
      compound: 'Berberine',
      chosenGoalTag: 'training_and_recovery',
      selectedGoalTag: 'metabolic_health',
    }) as string,
  },
  {
    name: 'recognizedSummaryWithUnreviewed',
    text: recognizedSummaryWithUnreviewed({ total: 3, reviewed: 1 }),
  },
  {
    name: 'coverageSentence',
    text: coverageSentence({ scored: 1, total: 2 }),
  },
  {
    // Rendered with scored < total, the only case that produces a sentence at all. The null
    // branch is asserted separately (see the anti-vacuity test for the coverage note).
    name: 'coverageSentenceFor',
    text: coverageSentenceFor({ scored: 1, total: 2 }) ?? '',
  },
  {
    name: 'tierDisclosure',
    // rationale is DATA, not template text — audited separately in db/tier-inputs.test.ts.
    text: tierDisclosure({
      tier: 'C',
      rationale: 'RATIONALE_PLACEHOLDER.',
      lastReviewed: '2026-07-20',
      reviewerName: 'Ziad Meras',
    }),
  },
];

test('every exported template is covered by these guards', () => {
  // Guards are only worth what they cover. This used to assert `RENDERED.length === 6` — a
  // count of the array against itself, which cannot notice a NEW template being added. It is
  // now derived from the module's actual exports, so an unguarded template fails here.
  // `tierLetter` is excluded by name: it returns a letter, not a sentence.
  const NOT_A_TEMPLATE = new Set(['tierLetter']);
  const exported = Object.entries(templates)
    .filter(([name, v]) => typeof v === 'function' && !NOT_A_TEMPLATE.has(name))
    .map(([name]) => name)
    .sort();
  const covered = RENDERED.map((r) => r.name).sort();
  assert.deepEqual(covered, exported, 'every exported template must be rendered in RENDERED');
  for (const r of RENDERED) assert.ok(r.text.length > 0, `${r.name} rendered empty`);
});

// ---- GUARD 1: no template may use a public tier label ------------------------------------
// The four public labels are CLAIMS §4's column: Strong / Moderate / Limited / Preliminary.
// A template cannot know which tier it will render beside, so it must never name one — the
// tier is carried by the badge and by tierDisclosure's letter, not by prose.
const PUBLIC_TIER_LABELS = ['strong', 'moderate', 'limited', 'preliminary'];

test('GUARD: no claim template contains a public tier label', () => {
  const offenders: string[] = [];
  for (const { name, text } of RENDERED) {
    for (const label of PUBLIC_TIER_LABELS) {
      if (new RegExp(`\\b${label}\\b`, 'i').test(text)) {
        offenders.push(`${name}: "${label}" in -> ${text}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `template(s) name a tier label, which will contradict the badge beside them:\n  ${offenders.join('\n  ')}`,
  );
});

test('GUARD 1 catches the exact sentence that shipped', () => {
  // Proves the guard bites rather than passing vacuously: the withdrawn wording must fail it.
  const withdrawn =
    'Preliminary, non-human research on NMN has used doses around 250 mg. ' +
    'Human clinical data on optimal dosing is not yet available.';
  const named = PUBLIC_TIER_LABELS.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(withdrawn));
  assert.deepEqual(named, ['preliminary']);
});

// ---- GUARD 2: no template may call human evidence non-human -------------------------------
// Phrases that assert the evidence base is not human, or that no human data exists.
const NON_HUMAN_CLAIMS = [
  /\bnon-human\b/i,
  /\banimal[- ]only\b/i,
  /\bin[- ]vitro\b/i,
  /\banimal (?:studies|research|models?|data)\b/i,
  /\blaboratory (?:studies|research|work)\b/i,
  /\bhuman (?:clinical )?data[^.]*\bnot\b[^.]*\bavailable\b/i,
  /\bno human (?:trials?|studies|data)\b/i,
];

/** Study designs that are conducted IN PEOPLE. */
const HUMAN_DESIGNS = new Set([
  'meta_analysis',
  'systematic_review',
  'RCT',
  'cohort_observational',
  'case_report',
]);

test('GUARD: no template claims evidence is non-human for a parameter with human sources', () => {
  const compoundName = (id: string) =>
    (SEED_COMPOUNDS.find((c) => c.compoundId === id)?.canonicalName as string) ?? id;

  const offenders: string[] = [];
  for (const p of SEED_SCORING_PARAMETERS) {
    const designs = (p.contributingSourceIds as string[]).map(
      (id) => SEED_SOURCES.find((s) => s.sourceId === id)?.studyType as string,
    );
    const humanSources = designs.filter((d) => HUMAN_DESIGNS.has(d));
    if (humanSources.length === 0) continue; // nothing to contradict

    // The sentence this parameter would actually render. Tier A/B take doseComparison;
    // everything else falls to preliminaryDoseNote (report-builder.ts reasonFor).
    const tier = String(p.evidenceTier).charAt(0);
    const text =
      tier === 'A' || tier === 'B'
        ? doseComparison({
            compound: compoundName(p.compoundId as string),
            amount: 1000,
            unit: 'mg',
            percent: -33,
            rangeLow: p.recommendedRangeLowMg as number,
            rangeHigh: p.recommendedRangeHighMg as number,
            sourceShortName: 'a contributing source',
          })
        : preliminaryDoseNote(compoundName(p.compoundId as string), 1000, 'mg');

    for (const pattern of NON_HUMAN_CLAIMS) {
      if (pattern.test(text)) {
        offenders.push(
          `${compoundName(p.compoundId as string)} x ${p.goalTag} (${p.evidenceTier}, ` +
            `human sources: ${humanSources.join(', ')}) renders: ${text}`,
        );
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `template(s) assert non-human evidence for parameters backed by human studies:\n  ${offenders.join('\n  ')}`,
  );
});

test('GUARD 2 catches the exact sentence that shipped, and all 5 rows it fired on', () => {
  // Vacuity check. The withdrawn wording must trip the patterns, and the 5 C_limited
  // parameters it fired for must all have human sources — which is why it was false.
  const withdrawn =
    'Preliminary, non-human research on NMN has used doses around 250 mg. ' +
    'Human clinical data on optimal dosing is not yet available.';
  assert.ok(
    NON_HUMAN_CLAIMS.some((p) => p.test(withdrawn)),
    'the withdrawn sentence must trip the non-human patterns',
  );

  const cLimited = SEED_SCORING_PARAMETERS.filter((p) => p.evidenceTier === 'C_limited');
  assert.equal(cLimited.length, 5);
  for (const p of cLimited) {
    const designs = (p.contributingSourceIds as string[]).map(
      (id) => SEED_SOURCES.find((s) => s.sourceId === id)?.studyType as string,
    );
    assert.ok(
      designs.some((d) => HUMAN_DESIGNS.has(d)),
      `${p.compoundId}|${p.goalTag} should have at least one human source`,
    );
  }
});

// ---- §4b: the outcome-mismatch disclosure fires exactly when it should --------------------
test('the outcome-mismatch disclosure names both outcomes, as display labels', () => {
  const note = outcomeMismatchNote({
    compound: 'Berberine',
    chosenGoalTag: 'training_and_recovery',
    selectedGoalTag: 'metabolic_health',
  });
  assert.ok(note);
  assert.match(note, /training and recovery/); // the outcome the user chose
  assert.match(note, /metabolic health/); // the outcome it was measured against
  assert.match(note, /Berberine/);
  // §4b requires display labels. A raw tag leaking through would read as a database identifier.
  assert.doesNotMatch(note, /_/);
});

test('ANTI-VACUITY: the disclosure stays ABSENT on an exact outcome match', () => {
  // The guard above only means something if the sentence can also NOT render. A disclosure that
  // always fires is noise, and worse, it would be false: claiming we have "no evidence for
  // Berberine on metabolic health" on the very parameter established for metabolic health.
  assert.equal(
    outcomeMismatchNote({
      compound: 'Berberine',
      chosenGoalTag: 'metabolic_health',
      selectedGoalTag: 'metabolic_health',
    }),
    null,
  );
  // No stated priority means there is nothing to mismatch against.
  assert.equal(
    outcomeMismatchNote({
      compound: 'Berberine',
      chosenGoalTag: null,
      selectedGoalTag: 'metabolic_health',
    }),
    null,
  );
});
