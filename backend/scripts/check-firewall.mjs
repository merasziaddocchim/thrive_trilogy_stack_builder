// Firewall guard (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6):
// scoring-engine/ must not import anything affiliate-related. Run via `npm run lint`.
// Exits non-zero if a violation is found, so it can gate a build in any CI system.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCORING_DIR = new URL('../src/scoring-engine/', import.meta.url).pathname;
const FORBIDDEN = [/affiliate/i];

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
for (const file of walk(SCORING_DIR)) {
  const text = readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    const isImport = /^\s*import\b|require\(/.test(line);
    if (isImport && FORBIDDEN.some((re) => re.test(line))) {
      console.error(`FIREWALL VIOLATION: ${file}: ${line.trim()}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\nFirewall check failed: ${violations} affiliate import(s) in scoring-engine/.`);
  process.exit(1);
}
console.log('Firewall check passed: scoring-engine/ is free of affiliate imports.');
