// =============================================================================
// Deterministic parameter selection (CLAIMS_COMPLIANCE §4b).
//
// THE BUG THIS PINS. Until 2026-08-01 repository.ts selected with
//     forCompound.find((r) => r.goalTag === goalTag) ?? forCompound[0]
// over an unordered SELECT. Two things went wrong at once: the frontend sent the DISPLAY LABEL
// ('Healthy aging') while the column stores the TAG ('healthy_aging'), so `.find()` missed on
// every real assessment; and the `?? forCompound[0]` fallback then handed back whichever row
// Postgres happened to return first. That choice decided the user's Evidence Tier badge AND the
// dose range their dosing accuracy was computed against.
//
// It was demonstrated against a live Postgres before the fix: with TMG's healthy_aging row
// physically first, a 'Healthy aging' user saw Tier B against 1500-6000 mg; after deleting and
// re-inserting that row — byte-identical data, different physical order — the same user saw
// Tier C and the dose comparison disappeared. The permutation tests below are that experiment,
// pinned in a form that runs on every commit.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectParameter, TIER_RANK, GOAL_TAGS, GOAL_LABELS, isGoalTag, goalLabel } from './goals.js';
import { SEED_SCORING_PARAMETERS } from './seed-data.js';
import type { EvidenceTier } from './schema.js';

interface Row {
  goalTag: string;
  evidenceTier: EvidenceTier;
  tag: string; // identity marker, so we can assert WHICH row came back
}

const row = (goalTag: string, evidenceTier: EvidenceTier): Row => ({
  goalTag,
  evidenceTier,
  tag: `${goalTag}|${evidenceTier}`,
});

/** Every ordering of `xs`. Order-independence is only proved by trying all of them. */
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i++) {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutations(rest)) out.push([xs[i], ...p]);
  }
  return out;
}

function selectionIsOrderIndependent(rows: Row[], goal: string | null): string {
  const results = permutations(rows).map((p) => selectParameter(p, goal)?.tag);
  const distinct = [...new Set(results)];
  assert.equal(
    distinct.length,
    1,
    `selection depended on row order for goal=${goal}: got ${JSON.stringify(distinct)}`,
  );
  return distinct[0] as string;
}

// ---- Rule 1: exact goal_tag match wins ---------------------------------------------------
test('exact goal match is selected even when another row has a higher tier', () => {
  const rows = [
    row('metabolic_health', 'A_strong'), // higher tier, wrong outcome
    row('healthy_aging', 'C_limited'), // lower tier, right outcome
  ];
  assert.equal(selectionIsOrderIndependent(rows, 'healthy_aging'), 'healthy_aging|C_limited');
});

// ---- Rule 2: otherwise highest Evidence Tier ---------------------------------------------
test('with no exact match, the highest Evidence Tier is selected', () => {
  const rows = [
    row('training_and_recovery', 'C_limited'),
    row('metabolic_health', 'A_strong'),
    row('healthy_aging', 'B_moderate'),
  ];
  assert.equal(selectionIsOrderIndependent(rows, 'sleep_quality'), 'metabolic_health|A_strong');
});

// ---- Rule 3: ties broken by goal_tag ascending -------------------------------------------
test('a tier tie is broken by goal_tag ascending, not by row order', () => {
  const rows = [
    row('training_and_recovery', 'C_limited'),
    row('healthy_aging', 'C_limited'),
    row('metabolic_health', 'C_limited'),
  ];
  assert.equal(selectionIsOrderIndependent(rows, 'daily_energy'), 'healthy_aging|C_limited');
});

test('THE REGRESSION: TMG under a non-matching goal is stable across every row order', () => {
  // TMG's two real seeded rows — the exact pair that flipped from Tier B to Tier C in the live
  // reproduction when their physical order changed.
  const tmg = [row('healthy_aging', 'B_moderate'), row('training_and_recovery', 'C_limited')];
  // The label the frontend used to send. It is not a tag, so no exact match exists.
  assert.equal(selectionIsOrderIndependent(tmg, 'Healthy aging'), 'healthy_aging|B_moderate');
  // ...and with no stated priority at all.
  assert.equal(selectionIsOrderIndependent(tmg, null), 'healthy_aging|B_moderate');
  // With the correct tag, the exact-match rule takes over and it is stable too.
  assert.equal(selectionIsOrderIndependent(tmg, 'healthy_aging'), 'healthy_aging|B_moderate');
  assert.equal(
    selectionIsOrderIndependent(tmg, 'training_and_recovery'),
    'training_and_recovery|C_limited',
  );
});

test('ANTI-VACUITY: the old rule really does depend on row order', () => {
  // Proves the permutation harness above can detect order dependence — a stability assertion
  // that cannot fail is worth nothing. This is the withdrawn implementation verbatim.
  const legacySelect = (rows: Row[], goal: string) => rows.find((r) => r.goalTag === goal) ?? rows[0];
  const tmg = [row('healthy_aging', 'B_moderate'), row('training_and_recovery', 'C_limited')];
  const results = new Set(permutations(tmg).map((p) => legacySelect(p, 'Healthy aging').tag));
  assert.equal(results.size, 2, 'the old rule must return different rows for different orders');
});

test('every seeded compound selects deterministically for every goal tag', () => {
  const byCompound = new Map<string, Row[]>();
  for (const p of SEED_SCORING_PARAMETERS) {
    const id = p.compoundId as string;
    const rows = byCompound.get(id) ?? [];
    rows.push(row(p.goalTag as string, p.evidenceTier as EvidenceTier));
    byCompound.set(id, rows);
  }
  assert.ok(byCompound.size > 0, 'seed data must be present for this to mean anything');
  for (const [compoundId, rows] of byCompound) {
    for (const goal of [...GOAL_TAGS, null]) {
      const picked = selectionIsOrderIndependent(rows, goal);
      assert.ok(picked, `${compoundId} / ${goal} selected nothing`);
    }
  }
});

// ---- Edges --------------------------------------------------------------------------------
test('no rows selects nothing rather than throwing', () => {
  assert.equal(selectParameter([], 'healthy_aging'), null);
  assert.equal(selectParameter([], null), null);
});

test('the tier ranking is explicit, not the enum declaration order', () => {
  // §4b requires the ranking be a stated rule. If someone reorders evidenceTierEnum for
  // readability, this must not move.
  assert.ok(TIER_RANK.A_strong > TIER_RANK.B_moderate);
  assert.ok(TIER_RANK.B_moderate > TIER_RANK.C_limited);
  assert.ok(TIER_RANK.C_limited > TIER_RANK.D_preliminary);
});

// ---- Goal tags and labels -----------------------------------------------------------------
test('every goal tag has a display label, and labels are never raw tags', () => {
  for (const tag of GOAL_TAGS) {
    const label = GOAL_LABELS[tag];
    assert.ok(label && label.length > 0, `${tag} has no label`);
    assert.ok(!label.includes('_'), `${tag}'s label is a raw tag, not a display label`);
    assert.equal(goalLabel(tag), label);
  }
});

test('the goal-tag guard rejects display labels — the exact class of value that caused the bug', () => {
  assert.ok(isGoalTag('healthy_aging'));
  for (const notATag of ['Healthy aging', 'healthy aging', 'Healthy_Aging', 'general', '', 'nope']) {
    assert.ok(!isGoalTag(notATag), `${notATag} must not be accepted as a goal tag`);
  }
});

test('every goal_tag the seed data uses is a recognized tag', () => {
  // Catches the reverse drift: a parameter seeded under a tag the product cannot send would be
  // unreachable by exact match and permanently disclosed as a mismatch.
  for (const p of SEED_SCORING_PARAMETERS) {
    assert.ok(isGoalTag(p.goalTag as string), `seeded goal_tag "${p.goalTag}" is not in GOAL_TAGS`);
  }
});
