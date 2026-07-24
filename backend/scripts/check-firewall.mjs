// Firewall guard (TECH_DOCS §4, CLAIMS_COMPLIANCE.md §6). Run via `npm run lint`.
// Exits non-zero if a violation is found, so it can gate a build in any CI system.
//
// Rules:
//   scoring-engine/    must not import anything affiliate-related, or the article-engine —
//                      neither commercial placement nor article selection may reach the score.
//   affiliate-engine/  must not import scoring-engine — the firewall is bidirectional: affiliate
//                      data must never reach the scoring path, and the affiliate module must not
//                      depend on scoring (TECH_DOCS §4, CLAIMS_COMPLIANCE §6).
//   article-engine/    must not import scoring-engine — same bidirectional rule as affiliate.
//                      Article cross-linking is affiliate-adjacent (roundups are monetized,
//                      CLAIMS_COMPLIANCE §6 extension), so it gets the identical treatment:
//                      article selection must never influence the score, and the module must not
//                      depend on scoring.
//   intake-parser/     must not import affiliate- OR scoring-engine-related code — it feeds
//                      structured output INTO scoring and must never depend on it (TECH_DOCS §1a).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// NOTE: match /article-engine/ specifically, not /article/i — a bare "article" would false-
// positive on unrelated identifiers (e.g. related_articles[] in the schema, TECH_DOCS §1).
const GUARDED = [
  { dir: 'scoring-engine', forbidden: [/affiliate/i, /article-engine/i] },
  { dir: 'affiliate-engine', forbidden: [/scoring-engine/i] },
  { dir: 'article-engine', forbidden: [/scoring-engine/i] },
  { dir: 'intake-parser', forbidden: [/affiliate/i, /scoring-engine/i, /article-engine/i] },
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
console.log(
  'Firewall check passed: scoring-engine/, affiliate-engine/, article-engine/, and intake-parser/ are clean.',
);
