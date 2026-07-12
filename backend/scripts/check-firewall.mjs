// Firewall guard (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6). Run via `npm run lint`.
// Exits non-zero if a violation is found, so it can gate a build in any CI system.
//
// Rules:
//   scoring-engine/  must not import anything affiliate-related.
//   intake-parser/   must not import affiliate- OR scoring-engine-related code — it feeds
//                    structured output INTO scoring and must never depend on it (TECH_DOCS §1a).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GUARDED = [
  { dir: 'scoring-engine', forbidden: [/affiliate/i] },
  { dir: 'intake-parser', forbidden: [/affiliate/i, /scoring-engine/i] },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

let violations = 0;
for (const { dir, forbidden } of GUARDED) {
  const root = new URL(`../src/${dir}/`, import.meta.url).pathname;
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const isImport = /^\s*import\b|require\(/.test(line);
      if (isImport && forbidden.some((re) => re.test(line))) {
        console.error(`FIREWALL VIOLATION: ${file}: ${line.trim()}`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\nFirewall check failed: ${violations} forbidden import(s).`);
  process.exit(1);
}
console.log('Firewall check passed: scoring-engine/ and intake-parser/ are clean.');
