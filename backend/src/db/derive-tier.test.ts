// =============================================================================
// CLAIMS_COMPLIANCE §4a PART TWO — the tier deriver, and the stored tiers it produced.
//
// The load-bearing test here is the first one: every STORED evidence_tier must equal what
// deriveTier() computes from that parameter's own sources and outcome proximity. That makes
// tier drift unmergeable — a hand-edited tier, a changed study_type, a changed effect
// direction or a filled-in sample size all surface here instead of silently moving a score.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_SCORING_PARAMETERS, SEED_SOURCES, SEED_DOSE_RECORDS } from './seed-data.js';
import {
  deriveTier,
  deriveTierDetailed,
  STUDY_TYPE_CEILING,
  MIN_POOLED_N,
  type ContributingSource,
} from './derive-tier.js';
import { studyTypeEnum } from './schema.js';

/** Rebuild a parameter's §4a inputs from the seed data, the same way the script does. */
function inputsFor(param: (typeof SEED_SCORING_PARAMETERS)[number]): ContributingSource[] {
  return (param.contributingSourceIds as string[]).map((sourceId) => {
    const src = SEED_SOURCES.find((s) => s.sourceId === sourceId);
    assert.ok(src, `no source ${sourceId}`);
    const dr = SEED_DOSE_RECORDS.find(
      (d) => d.compoundId === param.compoundId && d.sourceId === sourceId,
    );
    assert.ok(dr, `no dose record for ${param.compoundId}/${sourceId}`);
    return {
      studyType: src.studyType as ContributingSource['studyType'],
      effectDirection: dr.effectDirection as ContributingSource['effectDirection'],
      sampleSize: src.sampleSize ?? null,
    };
  });
}

test('every STORED tier equals what §4a yields for that parameter — no hand-set tiers', () => {
  assert.equal(SEED_SCORING_PARAMETERS.length, 7);
  for (const p of SEED_SCORING_PARAMETERS) {
    const d = deriveTierDetailed(inputsFor(p), p.outcomeProximity!);
    assert.equal(
      p.evidenceTier,
      d.tier,
      `${p.compoundId}|${p.goalTag}: stored ${p.evidenceTier} but §4a yields ${d.tier} ` +
        `(ceiling ${d.ceiling}, demoted ${d.demotedBy}, restored ${d.restored}` +
        `${d.restorationBlockedBy.length ? ' — ' + d.restorationBlockedBy.join('; ') : ''})`,
    );
  }
});

test('the ceiling map covers every study_type enum value', () => {
  // A new study type must be given a §4a bucket deliberately, not default to undefined.
  for (const v of studyTypeEnum.enumValues) {
    assert.ok(
      STUDY_TYPE_CEILING[v as keyof typeof STUDY_TYPE_CEILING],
      `study_type "${v}" has no ceiling mapping`,
    );
  }
});

test('Step 1: the BEST design present sets the ceiling, not the worst or the first', () => {
  const surrogate = 'surrogate_biomarker' as const;
  // meta-analysis alongside a weaker design still gives an A ceiling.
  assert.equal(
    deriveTierDetailed(
      [
        { studyType: 'in_vitro', effectDirection: 'positive', sampleSize: null },
        { studyType: 'meta_analysis', effectDirection: 'positive', sampleSize: 900 },
      ],
      surrogate,
    ).ceiling,
    'A_strong',
  );
  // Order of the sources must not matter.
  assert.equal(
    deriveTierDetailed(
      [
        { studyType: 'RCT', effectDirection: 'positive', sampleSize: 40 },
        { studyType: 'cohort_observational', effectDirection: 'positive', sampleSize: 40 },
      ],
      surrogate,
    ).ceiling,
    'B_moderate',
  );
});

test('Step 2: clinical outcome does not demote; surrogate and performance demote one', () => {
  const rct: ContributingSource[] = [{ studyType: 'RCT', effectDirection: 'positive', sampleSize: 50 }];
  assert.equal(deriveTier(rct, 'clinical_outcome'), 'B_moderate');
  assert.equal(deriveTier(rct, 'surrogate_biomarker'), 'C_limited');
  assert.equal(deriveTier(rct, 'performance_or_self_report'), 'C_limited');
});

test('Step 3: restoration needs 2+ RCTs that agree, with pooled n >= 30', () => {
  const two = (a: number, b: number, dirB: 'positive' | 'null_no_effect'): ContributingSource[] => [
    { studyType: 'RCT', effectDirection: 'positive', sampleSize: a },
    { studyType: 'RCT', effectDirection: dirB, sampleSize: b },
  ];
  // agree + pooled 50 -> restored back to the B ceiling
  assert.equal(deriveTier(two(25, 25, 'positive'), 'surrogate_biomarker'), 'B_moderate');
  // agree but pooled 20 -> not restored
  assert.equal(deriveTier(two(10, 10, 'positive'), 'surrogate_biomarker'), 'C_limited');
  // pooled fine but they disagree -> not restored
  assert.equal(deriveTier(two(25, 25, 'null_no_effect'), 'surrogate_biomarker'), 'C_limited');
  assert.equal(MIN_POOLED_N, 30);
});

test('Step 3: only RCTs can restore — observational studies cannot confirm a finding', () => {
  // Two human studies that agree, but only one is randomized: no restoration.
  const rctPlusObs: ContributingSource[] = [
    { studyType: 'RCT', effectDirection: 'positive', sampleSize: 40 },
    { studyType: 'cohort_observational', effectDirection: 'positive', sampleSize: 40 },
  ];
  const d = deriveTierDetailed(rctPlusObs, 'surrogate_biomarker');
  assert.equal(d.qualifyingRctCount, 1);
  assert.equal(d.tier, 'C_limited');
  // ...and the observational n must not be counted toward the pooled threshold either.
  assert.equal(d.pooledN, 40);
});

test('Step 3: a meta-analysis cannot be counted toward the two-or-more RCTs', () => {
  // Its replication is already in the Step 1 ceiling; counting it again double-counts.
  const maPlusRct: ContributingSource[] = [
    { studyType: 'meta_analysis', effectDirection: 'positive', sampleSize: 500 },
    { studyType: 'RCT', effectDirection: 'positive', sampleSize: 500 },
  ];
  const d = deriveTierDetailed(maPlusRct, 'surrogate_biomarker');
  assert.equal(d.qualifyingRctCount, 1, 'the meta-analysis must not count as a trial');
  assert.equal(d.ceiling, 'A_strong');
  assert.equal(d.tier, 'B_moderate', 'A ceiling, demoted to B, no restoration available');
});

test('Step 3: RCT agreement is judged among the RCTs, not from the aggregated direction', () => {
  // Two agreeing RCTs plus a dissenting observational study. The parameter's stored
  // direction_of_evidence would be 'mixed', but §4a asks whether the TRIALS agree — they do,
  // so restoration succeeds. Makes no difference to batch 1; will in batch 2.
  const d = deriveTierDetailed(
    [
      { studyType: 'RCT', effectDirection: 'positive', sampleSize: 20 },
      { studyType: 'RCT', effectDirection: 'positive', sampleSize: 20 },
      { studyType: 'cohort_observational', effectDirection: 'null_no_effect', sampleSize: 99 },
    ],
    'surrogate_biomarker',
  );
  assert.equal(d.restored, true);
  assert.equal(d.tier, 'B_moderate');
});

test('restoration can never exceed the Step 1 ceiling', () => {
  // Clinical outcome means nothing was lost, so there is nothing to give back: an RCT-ceilinged
  // parameter must not be promoted to A by having two large agreeing trials.
  const d = deriveTierDetailed(
    [
      { studyType: 'RCT', effectDirection: 'positive', sampleSize: 500 },
      { studyType: 'RCT', effectDirection: 'positive', sampleSize: 500 },
    ],
    'clinical_outcome',
  );
  assert.equal(d.restored, false);
  assert.equal(d.tier, 'B_moderate');
  assert.equal(d.tier, d.ceiling);
});

test('a parameter with no contributing sources is an error, not a tier', () => {
  assert.throws(() => deriveTier([], 'clinical_outcome'), /no contributing sources/);
});

test('the three parameters §4a moves are the three that changed, and only those', () => {
  // Named explicitly so a future edit that moves a fourth has to say so here.
  const moved = new Set(['nmn|metabolic_health', 'nmn|training_and_recovery', 'nr|healthy_aging']);
  const cLimited = SEED_SCORING_PARAMETERS.filter((p) => p.evidenceTier === 'C_limited');
  assert.equal(cLimited.length, 5); // resveratrol + tmg ergogenic were already C
  assert.equal(SEED_SCORING_PARAMETERS.filter((p) => p.evidenceTier === 'B_moderate').length, 1);
  assert.equal(SEED_SCORING_PARAMETERS.filter((p) => p.evidenceTier === 'A_strong').length, 1);
  assert.equal(moved.size, 3);
});
