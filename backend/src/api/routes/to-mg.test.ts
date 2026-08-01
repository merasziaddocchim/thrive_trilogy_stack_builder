// Dose → milligram normalization at the API boundary. This is the last point where a unit
// still exists; everything downstream is a bare `labelDoseMg` number, so a wrong conversion
// here is unrecoverable and invisible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMg } from './assessment.js';

test('IU is not milligrams and must not be coerced into them', () => {
  // THE BUG: toMg ended with `return dose.amount; // mg or unknown → treat as mg`, so
  // 5000 IU was stored as labelDoseMg: 5000 and scored as 5000 mg. International Units measure
  // biological activity, not mass — the mg equivalent differs per substance, so there is no
  // conversion to apply and the honest answer is "we don't know".
  assert.equal(toMg({ amount: 5000, unit: 'iu' }), null);
  assert.equal(toMg({ amount: 5000, unit: 'IU' }), null);
  assert.equal(toMg({ amount: 1, unit: 'iu' }), null);
});

test('ANTI-VACUITY: the withdrawn implementation really did return 5000 for 5000 IU', () => {
  // A null-returning assertion proves nothing unless the old code produced something else.
  const legacyToMg = (dose: { amount: number; unit: string }): number | null => {
    const u = dose.unit.toLowerCase();
    if (u === 'g') return dose.amount * 1000;
    if (u === 'mcg' || u === 'µg') return dose.amount / 1000;
    return dose.amount; // mg or unknown → treat as mg
  };
  assert.equal(legacyToMg({ amount: 5000, unit: 'iu' }), 5000);
  assert.notEqual(legacyToMg({ amount: 5000, unit: 'iu' }), toMg({ amount: 5000, unit: 'iu' }));
});

test('an unrecognized unit is missing data, not milligrams', () => {
  for (const unit of ['scoop', 'drops', 'ml', 'units', '']) {
    assert.equal(toMg({ amount: 500, unit }), null, `"${unit}" must not be read as mg`);
  }
});

test('the conversions that do exist are unchanged', () => {
  assert.equal(toMg({ amount: 250, unit: 'mg' }), 250);
  assert.equal(toMg({ amount: 250, unit: 'MG' }), 250);
  assert.equal(toMg({ amount: 1, unit: 'g' }), 1000);
  assert.equal(toMg({ amount: 500, unit: 'mcg' }), 0.5);
  assert.equal(toMg({ amount: 500, unit: 'µg' }), 0.5);
});

test('no dose stays no dose', () => {
  assert.equal(toMg(null), null);
  assert.equal(toMg(undefined), null);
});
