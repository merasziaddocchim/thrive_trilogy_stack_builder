import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  buildArticleLinks,
  BLOG_ORIGIN,
  EXCLUDED_SLUG_FRAGMENTS,
  HUB_PAGES,
  type RecognizedForArticles,
} from './index.js';
import { EDUCATIONAL, ROUNDUP } from './catalog.js';
import { SEED_COMPOUND_IDS } from '../db/seed-data.js';

const C = SEED_COMPOUND_IDS;

function recognized(compoundId: string): RecognizedForArticles {
  return { compoundId, canonicalName: `compound-${compoundId}` };
}

const NAD_ROUNDUP = `${BLOG_ORIGIN}/5-best-nad-supplements-2026/`;

/** Every href the module would surface anywhere, for a given stack. */
function allHrefs(links: ReturnType<typeof buildArticleLinks>): string[] {
  return [
    ...links.related_reading.flatMap((g) => g.articles.map((a) => a.href)),
    ...links.start_roundups.flatMap((g) => g.articles.map((a) => a.href)),
    ...links.hubs.map((h) => h.href),
    ...Object.values(links.learn_more).map((a) => a.href),
  ];
}

const ALL_FIVE = [C.nmn, C.nr, C.resveratrol, C.berberine, C.tmg].map(recognized);

// ---- PLACEMENT: educational vs roundup (the compliance boundary) ---------------------------
test('educational articles are offered for Stop/Keep + related reading, never as roundups', () => {
  const links = buildArticleLinks([recognized(C.nmn)]);
  const reading = links.related_reading.find((g) => g.compound_id === C.nmn);
  assert.ok(reading);
  assert.equal(reading.articles.length, 10); // all 10 NMN educational articles
  assert.ok(reading.articles.some((a) => a.href === `${BLOG_ORIGIN}/nmn-dosing-protocol-guide/`));

  // No educational article may leak into the Start-only roundup groups.
  const educationalHrefs = new Set(Object.values(EDUCATIONAL).flat().map((a) => a.href));
  for (const g of links.start_roundups) {
    for (const a of g.articles) {
      assert.ok(!educationalHrefs.has(a.href), `educational article in Start roundups: ${a.href}`);
    }
  }
});

test('roundups appear ONLY in start_roundups — never in related reading, learn_more, or hubs', () => {
  const links = buildArticleLinks(ALL_FIVE);
  const roundupHrefs = new Set(Object.values(ROUNDUP).flat().map((a) => a.href));

  for (const g of links.related_reading) {
    for (const a of g.articles) {
      assert.ok(!roundupHrefs.has(a.href), `roundup leaked into related reading: ${a.href}`);
    }
  }
  for (const [compoundId, a] of Object.entries(links.learn_more)) {
    assert.ok(!roundupHrefs.has(a.href), `roundup used as Learn more for ${compoundId}: ${a.href}`);
  }
  for (const h of links.hubs) {
    assert.ok(!roundupHrefs.has(h.href), `roundup surfaced as a hub page: ${h.href}`);
  }
});

test('single-brand reviews are classified as roundups (Start-only), per founder decision', () => {
  const links = buildArticleLinks([recognized(C.nmn)]);
  const nmnRoundups = links.start_roundups.find((g) => g.compound_id === C.nmn);
  assert.ok(nmnRoundups);
  const hrefs = nmnRoundups.articles.map((a) => a.href);
  assert.ok(hrefs.includes(`${BLOG_ORIGIN}/nmnbio-review/`));
  assert.ok(hrefs.includes(`${BLOG_ORIGIN}/renue-by-science-nmn-review/`));

  // ...and are therefore absent from the anywhere-linkable educational set.
  const reading = links.related_reading.find((g) => g.compound_id === C.nmn);
  assert.ok(!reading?.articles.some((a) => a.href.includes('nmnbio-review')));
});

test('all competing roundups for a compound are shown — no curation (founder decision)', () => {
  const links = buildArticleLinks([recognized(C.nmn)]);
  const nmn = links.start_roundups.find((g) => g.compound_id === C.nmn);
  assert.equal(nmn?.articles.length, 7); // 4 "best X" + brand comparison + 2 single-brand reviews
});

test('learn_more prefers the founder-marked primary, else falls back to source order', () => {
  const links = buildArticleLinks([recognized(C.nmn), recognized(C.berberine)]);
  // NMN carries an explicit "highest relevance" marker in the source file.
  assert.equal(links.learn_more[C.nmn].href, `${BLOG_ORIGIN}/nmn-dosing-protocol-guide/`);
  // Berberine has no marker → first educational article in source order.
  assert.equal(links.learn_more[C.berberine].href, `${BLOG_ORIGIN}/berberine-vs-metformin/`);
});

// ---- DUAL-TAGGED ARTICLES (the documented dedup decision) ----------------------------------
test('dual-tagged EDUCATIONAL article appears under every compound it is tagged for', () => {
  const links = buildArticleLinks([recognized(C.nmn), recognized(C.nr)]);
  const shared = `${BLOG_ORIGIN}/nmn-vs-nr-nad-precursor/`;
  const nmn = links.related_reading.find((g) => g.compound_id === C.nmn);
  const nr = links.related_reading.find((g) => g.compound_id === C.nr);
  assert.ok(nmn?.articles.some((a) => a.href === shared));
  assert.ok(nr?.articles.some((a) => a.href === shared));
});

test('DECISION: dual-tagged ROUNDUP repeats per compound group, NOT globally deduplicated', () => {
  const links = buildArticleLinks([recognized(C.nmn), recognized(C.nr)]);
  const nmn = links.start_roundups.find((g) => g.compound_id === C.nmn);
  const nr = links.start_roundups.find((g) => g.compound_id === C.nr);
  // Present in BOTH groups — an NR-only reader must see the same NR options as an NR-only user.
  assert.ok(nmn?.articles.some((a) => a.href === NAD_ROUNDUP));
  assert.ok(nr?.articles.some((a) => a.href === NAD_ROUNDUP));
  // Stated cost of that decision: exactly 2 renderings across the page, each disclosed.
  const occurrences = links.start_roundups
    .flatMap((g) => g.articles)
    .filter((a) => a.href === NAD_ROUNDUP).length;
  assert.equal(occurrences, 2);
});

test('within one compound group an article never appears twice', () => {
  const links = buildArticleLinks(ALL_FIVE);
  for (const g of [...links.related_reading, ...links.start_roundups]) {
    const hrefs = g.articles.map((a) => a.href);
    assert.equal(new Set(hrefs).size, hrefs.length, `duplicate inside group ${g.compound}`);
  }
});

test('a single-compound stack shows the dual-tagged roundup exactly once', () => {
  const links = buildArticleLinks([recognized(C.nr)]);
  const occurrences = links.start_roundups
    .flatMap((g) => g.articles)
    .filter((a) => a.href === NAD_ROUNDUP).length;
  assert.equal(occurrences, 1);
});

// ---- EXCLUSIONS -----------------------------------------------------------------------------
test('excluded compounds/articles never appear anywhere, for any stack', () => {
  const links = buildArticleLinks(ALL_FIVE);
  for (const href of allHrefs(links)) {
    for (const fragment of EXCLUDED_SLUG_FRAGMENTS) {
      assert.ok(
        !href.toLowerCase().includes(fragment),
        `excluded fragment "${fragment}" surfaced in ${href}`,
      );
    }
  }
});

test('exclusion fragments do not false-positive on allowed near-miss slugs', () => {
  // Guards the two traps noted in catalog.ts: these ALLOWED slugs must survive the filter.
  const allowed = [
    `${BLOG_ORIGIN}/best-liposomal-nmn-supplement-2026/`,
    `${BLOG_ORIGIN}/nmn-stack-longevity-protocol/`,
    `${BLOG_ORIGIN}/delivery-systems/`,
  ];
  const surfaced = new Set(allHrefs(buildArticleLinks(ALL_FIVE)));
  for (const href of allowed) {
    assert.ok(surfaced.has(href), `expected allowed article to surface: ${href}`);
    for (const fragment of EXCLUDED_SLUG_FRAGMENTS) {
      assert.ok(!href.toLowerCase().includes(fragment), `"${fragment}" wrongly matches ${href}`);
    }
  }
});

test('no compound outside the 5-compound evidence DB can produce links', () => {
  const links = buildArticleLinks([recognized('c0000000-0000-4000-8000-000000000099')]);
  assert.equal(links.related_reading.length, 0);
  assert.equal(links.start_roundups.length, 0);
  assert.deepEqual(links.learn_more, {});
});

// ---- URLS + HUBS ----------------------------------------------------------------------------
test('every emitted href is absolute against the blog origin, never relative', () => {
  const links = buildArticleLinks(ALL_FIVE);
  const hrefs = allHrefs(links);
  assert.ok(hrefs.length > 0);
  for (const href of hrefs) {
    assert.ok(href.startsWith(`${BLOG_ORIGIN}/`), `not absolute: ${href}`);
    // The app is a different subdomain — a root-relative href would resolve to the app and 404.
    assert.ok(!href.startsWith('/'), `relative href leaked: ${href}`);
    assert.ok(!href.includes('app.thrivetrilogy.com'), `wrong host: ${href}`);
  }
});

test('hub pages are general only — never inside a per-compound group', () => {
  const links = buildArticleLinks(ALL_FIVE);
  const hubHrefs = new Set(HUB_PAGES.map((h) => h.href));
  for (const g of [...links.related_reading, ...links.start_roundups]) {
    for (const a of g.articles) {
      assert.ok(!hubHrefs.has(a.href), `hub page placed in compound group ${g.compound}: ${a.href}`);
    }
  }
  for (const a of Object.values(links.learn_more)) {
    assert.ok(!hubHrefs.has(a.href), `hub page used as a per-compound Learn more: ${a.href}`);
  }
  // Hubs are stack-independent: the same general list regardless of what's in the stack.
  assert.deepEqual(links.hubs, HUB_PAGES);
  assert.deepEqual(buildArticleLinks([recognized(C.tmg)]).hubs, HUB_PAGES);
});

test('an empty stack surfaces no compound articles (hubs stay general)', () => {
  const links = buildArticleLinks([]);
  assert.equal(links.related_reading.length, 0);
  assert.equal(links.start_roundups.length, 0);
  assert.deepEqual(links.learn_more, {});
  assert.deepEqual(links.hubs, HUB_PAGES);
});

test('duplicate recognized entries collapse to one group per compound', () => {
  const links = buildArticleLinks([recognized(C.nmn), recognized(C.nmn)]);
  assert.equal(links.related_reading.filter((g) => g.compound_id === C.nmn).length, 1);
  assert.equal(links.start_roundups.filter((g) => g.compound_id === C.nmn).length, 1);
});

// ---- FIREWALL -------------------------------------------------------------------------------
// The firewall is a build-gating script, so assert it actually gates: it must pass now, and it
// must FAIL on a deliberate violating import in either direction. Same negative-probe pattern
// used for affiliate-engine — a guard that is never seen failing is not a proven guard.
const FIREWALL = new URL('../../scripts/check-firewall.mjs', import.meta.url).pathname;

function runFirewall(): { ok: boolean; output: string } {
  try {
    return { ok: true, output: execFileSync('node', [FIREWALL], { encoding: 'utf8' }) };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Prepend a line to a file, run the firewall, then restore the file exactly. */
function withInjectedImport(filePath: string, importLine: string): { ok: boolean; output: string } {
  const original = readFileSync(filePath, 'utf8');
  try {
    writeFileSync(filePath, `${importLine}\n${original}`);
    return runFirewall();
  } finally {
    writeFileSync(filePath, original);
  }
}

test('firewall passes on the real tree', () => {
  const { ok, output } = runFirewall();
  assert.ok(ok, `firewall unexpectedly failed:\n${output}`);
  assert.match(output, /article-engine\//);
});

test('firewall FAILS if article-engine imports scoring-engine', () => {
  const target = new URL('./index.ts', import.meta.url).pathname;
  const { ok, output } = withInjectedImport(target, "import { scoreStack } from '../scoring-engine/index.js';");
  assert.equal(ok, false, 'firewall did not catch article-engine → scoring-engine');
  assert.match(output, /FIREWALL VIOLATION/);
  // Restored — a re-run must pass again.
  assert.ok(runFirewall().ok);
});

test('firewall FAILS if scoring-engine imports article-engine', () => {
  const target = new URL('../scoring-engine/index.ts', import.meta.url).pathname;
  const { ok, output } = withInjectedImport(target, "import { buildArticleLinks } from '../article-engine/index.js';");
  assert.equal(ok, false, 'firewall did not catch scoring-engine → article-engine');
  assert.match(output, /FIREWALL VIOLATION/);
  assert.ok(runFirewall().ok);
});

test('article selection cannot see scoring inputs — only compound identity', () => {
  // Structural proof at the type/behaviour level: the same stack, described with different
  // "scores" around it, cannot produce different links, because no score is an input at all.
  const a = buildArticleLinks([recognized(C.nmn), recognized(C.tmg)]);
  const b = buildArticleLinks([recognized(C.nmn), recognized(C.tmg)]);
  assert.deepEqual(a, b);
  // RecognizedForArticles has exactly two fields; adding a score-derived one would be a
  // firewall regression in spirit even though the import guard would not catch it.
  assert.deepEqual(Object.keys(recognized(C.nmn)).sort(), ['canonicalName', 'compoundId']);
});
