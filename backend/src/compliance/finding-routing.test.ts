// =============================================================================
// FINDING ROUTING — CLAIMS_COMPLIANCE §4d.
//
// THE BUG THIS PINS. Live 2026-08-01, a stack of NMN 250 mg, TMG 1000 mg and Berberine 500 mg
// put ALL THREE compounds in Stop and rendered Keep as a bare heading. Berberine is Tier A —
// the strongest evidence in the database — and was told to stop because 500 mg is below its
// 900-1500 mg studied range. NMN was INSIDE its range and still landed in Stop, with $0/mo
// waste beside it, under a heading reading "where your spend isn't working".
//
// The routing did what it was told. The old rule was:
//     keep  <- withinStudiedRange && Tier A/B && a range exists
//     stop  <- everything else
// so underdosing meant Stop and Tier C meant Stop. §4d replaces both.
//
// Every guard below carries an anti-vacuity test that runs the WITHDRAWN rule and proves it
// produces the wrong answer for the same input — a routing assertion that would pass under the
// old code too is not evidence of anything.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeFinding, FINDING_SECTIONS, type RoutableFinding } from './finding-routing.js';
import type { EvidenceTier, EvidenceDirection } from '../db/schema.js';

/** The withdrawn implementation, verbatim from report-builder.ts before 2026-08-01. */
function legacyRoute(f: {
  evidenceTier: EvidenceTier;
  isRedundant: boolean;
  withinStudiedRange: boolean | null;
  hasRange: boolean;
}): 'stop' | 'keep' {
  const tier = f.evidenceTier.charAt(0);
  const wellDosed = f.withinStudiedRange === true;
  const verifiable = (tier === 'A' || tier === 'B') && f.hasRange;
  if (f.isRedundant) return 'stop';
  if (wellDosed && verifiable) return 'keep';
  return 'stop';
}

const finding = (over: Partial<RoutableFinding> = {}): RoutableFinding => ({
  evidenceTier: 'B_moderate',
  isRedundant: false,
  directionOfEvidence: 'positive',
  withinStudiedRange: true,
  ...over,
});

// ---- Rule 1: Stop -------------------------------------------------------------------------
test('a duplicate that is not the best-dosed copy routes to Stop', () => {
  assert.equal(routeFinding(finding({ isRedundant: true })), 'stop');
  // Even a perfectly dosed Tier A duplicate: the extra copy is duplicate spend regardless.
  assert.equal(
    routeFinding(finding({ isRedundant: true, evidenceTier: 'A_strong', withinStudiedRange: true })),
    'stop',
  );
});

test('Evidence Tier D routes to Stop at any dose', () => {
  for (const within of [true, false, null]) {
    assert.equal(
      routeFinding(finding({ evidenceTier: 'D_preliminary', withinStudiedRange: within })),
      'stop',
      `Tier D with withinStudiedRange=${within}`,
    );
  }
});

test('a recorded direction of null_no_effect or negative routes to Stop', () => {
  for (const dir of ['null_no_effect', 'negative'] as EvidenceDirection[]) {
    assert.equal(routeFinding(finding({ directionOfEvidence: dir })), 'stop', dir);
    // ...even when the dose is perfect. An adequate study looked and found nothing.
    assert.equal(
      routeFinding(finding({ directionOfEvidence: dir, withinStudiedRange: true, evidenceTier: 'A_strong' })),
      'stop',
      `${dir} at a correct dose`,
    );
  }
});

test('an ABSENT direction is not grounds for Stop — SQL NULL is not `null_no_effect`', () => {
  // §4d states this outright. The column is nullable and was unread until 2026-08-01; treating
  // "not yet derived" as "a study found no effect" would route every un-backfilled row to Stop,
  // telling users to abandon compounds because of a migration that had not run.
  assert.equal(routeFinding(finding({ directionOfEvidence: null, withinStudiedRange: true })), 'keep');
  assert.equal(routeFinding(finding({ directionOfEvidence: null, withinStudiedRange: false })), 'adjust');
});

test('a `mixed` direction is not grounds for Stop', () => {
  // Two batch-1 parameters are `mixed` (NR x healthy_aging, Resveratrol x metabolic_health).
  // §4d Stops on null or negative only; mixed is neither.
  assert.equal(routeFinding(finding({ directionOfEvidence: 'mixed', withinStudiedRange: true })), 'keep');
  assert.equal(routeFinding(finding({ directionOfEvidence: 'mixed', withinStudiedRange: false })), 'adjust');
});

// ---- Rule 2: Adjust -----------------------------------------------------------------------
test('a dose outside the studied range routes to Adjust, at every tier that is not D', () => {
  for (const tier of ['A_strong', 'B_moderate', 'C_limited'] as EvidenceTier[]) {
    assert.equal(routeFinding(finding({ evidenceTier: tier, withinStudiedRange: false })), 'adjust', tier);
  }
});

test('no studied range routes to Adjust, not Keep', () => {
  // Keep asserts "the dose falls inside the studied range". With no range, that sentence would
  // be a claim about a comparison that never happened.
  assert.equal(routeFinding(finding({ withinStudiedRange: null })), 'adjust');
  assert.equal(routeFinding(finding({ withinStudiedRange: null, evidenceTier: 'C_limited' })), 'adjust');
});

// ---- Rule 3: Keep -------------------------------------------------------------------------
test('a dose inside the studied range routes to Keep', () => {
  for (const tier of ['A_strong', 'B_moderate', 'C_limited'] as EvidenceTier[]) {
    assert.equal(routeFinding(finding({ evidenceTier: tier, withinStudiedRange: true })), 'keep', tier);
  }
});

// ---- The headline rule: Tier C is never a Stop by itself ----------------------------------
test('TIER C ALONE NEVER ROUTES TO STOP', () => {
  // §4d: the evidence ceiling already lowers a Tier C item's SEI. Stopping it as well would
  // penalise the same fact twice and tell the user to abandon a compound the reviewed evidence
  // does not contradict. Exhaustive over every other input a Tier C row can carry.
  for (const within of [true, false, null] as Array<boolean | null>) {
    for (const dir of ['positive', 'mixed', null] as Array<EvidenceDirection | null>) {
      const section = routeFinding(
        finding({ evidenceTier: 'C_limited', withinStudiedRange: within, directionOfEvidence: dir, isRedundant: false }),
      );
      assert.notEqual(section, 'stop', `Tier C within=${within} direction=${dir} must not Stop`);
    }
  }
});

test('ANTI-VACUITY: the withdrawn rule really did Stop all three production compounds', () => {
  // The exact stack from the live report, as the old rule saw it.
  const live = [
    { name: 'NMN 250 in 250-500', evidenceTier: 'C_limited' as EvidenceTier, withinStudiedRange: true, hasRange: true },
    { name: 'TMG 1000 vs 1500-6000', evidenceTier: 'B_moderate' as EvidenceTier, withinStudiedRange: false, hasRange: true },
    { name: 'Berberine 500 vs 900-1500', evidenceTier: 'A_strong' as EvidenceTier, withinStudiedRange: false, hasRange: true },
  ];
  for (const row of live) {
    assert.equal(legacyRoute({ ...row, isRedundant: false }), 'stop', `${row.name}: old rule`);
  }
  // ...and that §4d moves every one of them out of Stop.
  const now = live.map((row) =>
    routeFinding(finding({ evidenceTier: row.evidenceTier, withinStudiedRange: row.withinStudiedRange })),
  );
  assert.deepEqual(now, ['keep', 'adjust', 'adjust']);
});

test('ANTI-VACUITY: the withdrawn rule had no Adjust at all', () => {
  // It could only ever answer stop or keep, which is why "the amount is wrong" had nowhere to
  // go. Proves the new section is a real behaviour change, not a rename.
  const outputs = new Set(
    [true, false, null].flatMap((within) =>
      (['A_strong', 'B_moderate', 'C_limited', 'D_preliminary'] as EvidenceTier[]).flatMap((tier) =>
        [true, false].map((red) =>
          legacyRoute({ evidenceTier: tier, isRedundant: red, withinStudiedRange: within, hasRange: true }),
        ),
      ),
    ),
  );
  assert.deepEqual([...outputs].sort(), ['keep', 'stop']);
  assert.ok(!outputs.has('adjust' as never));
});

// ---- Totality -----------------------------------------------------------------------------
test('every reachable combination of inputs routes somewhere, and only to a known section', () => {
  // No input may fall through unplaced — §4d says every scored item is placed in exactly one
  // section. This is what catches a future rule added without a destination.
  const tiers: EvidenceTier[] = ['A_strong', 'B_moderate', 'C_limited', 'D_preliminary'];
  const dirs: Array<EvidenceDirection | null> = ['positive', 'null_no_effect', 'negative', 'mixed', null];
  const withins: Array<boolean | null> = [true, false, null];
  let n = 0;
  for (const evidenceTier of tiers) {
    for (const directionOfEvidence of dirs) {
      for (const withinStudiedRange of withins) {
        for (const isRedundant of [true, false]) {
          const section = routeFinding({ evidenceTier, directionOfEvidence, withinStudiedRange, isRedundant });
          assert.ok(
            (FINDING_SECTIONS as readonly string[]).includes(section),
            `unplaced: ${evidenceTier}/${directionOfEvidence}/${withinStudiedRange}/${isRedundant}`,
          );
          n++;
        }
      }
    }
  }
  assert.equal(n, tiers.length * dirs.length * withins.length * 2);
});

test('the section order is Stop, Adjust, Keep — the order the report renders them', () => {
  assert.deepEqual([...FINDING_SECTIONS], ['stop', 'adjust', 'keep']);
});
