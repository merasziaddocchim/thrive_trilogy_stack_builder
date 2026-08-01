// =============================================================================
// PROVENANCE GUARDS — where `default_unit` and the parameter-selection rule may come from.
//
// CLAIMS_COMPLIANCE §4b permits a unit to be inferred "only from a default unit stored on that
// compound's record, derived from the human-reviewed evidence database, and never from a global
// constant, a product label, a brand catalogue, or any affiliate source." §4c requires the
// parameter selection to be deterministic and never dependent on row order.
//
// The existing firewall (scripts/check-firewall.mjs) guards module boundaries by directory.
// These guards are narrower and about DATA: which values may reach an inference, and which
// modules are allowed to see them at all. They read the source text, so they hold no matter how
// the code is written.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

const UNIT_REFS = /\bdefault_unit\b|\bdefaultUnit\b|\busableDefaultUnit\b/;
const COMMERCIAL = /affiliate|catalog|catalogue|\bbrand\b|\bproduct(s|_|\b)/i;

test('no scoring path reads default_unit — from any source, commercial or otherwise', () => {
  // The unit resolves a dose BEFORE scoring and is disclosed to the user at that point; it is
  // not a scoring input. If scoring-engine ever read it, an inferred value would be reaching a
  // score without passing the user's eyes.
  const offenders = filesUnder(join(SRC, 'scoring-engine'))
    .filter((f) => UNIT_REFS.test(readFileSync(f, 'utf8')))
    .map((f) => f.replace(SRC, 'src/'));
  assert.deepEqual(offenders, [], `scoring-engine must not reference default_unit:\n  ${offenders.join('\n  ')}`);
});

test('no affiliate, article, or product module reads or writes default_unit', () => {
  // §4b names these sources explicitly. There is no product or affiliate TABLE in this schema,
  // so the realistic risk is a module — not a column — becoming the source of a unit.
  const offenders: string[] = [];
  for (const dir of ['affiliate-engine', 'article-engine']) {
    for (const f of filesUnder(join(SRC, dir))) {
      if (UNIT_REFS.test(readFileSync(f, 'utf8'))) offenders.push(f.replace(SRC, 'src/'));
    }
  }
  assert.deepEqual(offenders, [], `commercial modules must not touch default_unit:\n  ${offenders.join('\n  ')}`);
});

test('the unit resolver and the selection rule import nothing commercial', () => {
  // Both decide something a user sees attached to an Evidence Tier. Neither may depend on a
  // module whose job is to sell something.
  for (const rel of ['intake-parser/units.ts', 'intake-parser/index.ts', 'db/goals.ts']) {
    const text = readFileSync(join(SRC, rel), 'utf8');
    const imports = text.split('\n').filter((l) => /^\s*import\b|require\(/.test(l));
    for (const line of imports) {
      assert.ok(!COMMERCIAL.test(line), `${rel} imports a commercial module: ${line.trim()}`);
    }
  }
});

test('the parameter-selection rule does not consult the database at all', () => {
  // §4c: "The selection must never depend on database row order." The strongest form of that
  // guarantee is that the rule cannot see the database — it is a pure function over rows the
  // caller already has, which is also what makes the permutation tests in db/goals.test.ts
  // able to prove order-independence exhaustively.
  const text = readFileSync(join(SRC, 'db/goals.ts'), 'utf8');
  for (const forbidden of ['db/client', 'drizzle-orm', 'from(', 'select(', 'sql`']) {
    assert.ok(!text.includes(forbidden), `db/goals.ts must stay pure, but references ${forbidden}`);
  }
});

test('every stored default unit is one the parser can actually use', () => {
  // A unit the parser cannot parse looks populated in the database but behaves exactly like
  // NULL at runtime — the worst kind of value, because it reads as configured.
  const seedText = readFileSync(join(SRC, 'db/seed-data.ts'), 'utf8');
  const units = [...seedText.matchAll(/defaultUnit: '([^']*)'/g)].map((m) => m[1]);
  assert.ok(units.length > 0, 'seed data must set default units for this to mean anything');
  for (const u of units) {
    assert.ok(['mg', 'mcg', 'g', 'iu'].includes(u), `seeded default unit "${u}" is not parseable`);
  }
});
