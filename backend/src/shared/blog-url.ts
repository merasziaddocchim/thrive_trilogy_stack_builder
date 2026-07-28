// THE single URL-construction utility for every outbound link to thrivetrilogy.com.
//
// Why this exists as its own module: the app runs on app.thrivetrilogy.com and the blog +
// affiliate redirects live on the ROOT domain thrivetrilogy.com. A root-relative href like
// "/go/nmnbio-morning" is therefore NOT a link to the redirect — the browser resolves it
// against the current origin and produces https://app.thrivetrilogy.com/go/nmnbio-morning,
// which the app does not route and never has. It 404s silently: no build error, no type error,
// no test failure, just a dead link that looks perfectly fine in source.
//
// That is exactly what shipped in the affiliate catalog and went undetected in production —
// see STATUS.md §10. `article-engine` got this right independently, which is precisely the
// problem: two separate implementations of the same rule, one of which was missing. Both
// engines now import from HERE, so there is one implementation and one place to be right.
//
// Deliberately dependency-free and engine-neutral: it belongs to neither affiliate-engine nor
// article-engine, so neither has to import the other to share it (which would couple two
// modules that are meant to stay independent — TECH_DOCS §4).

/** Root domain. The blog and every /go/ affiliate redirect live here — NOT on the app. */
export const BLOG_ORIGIN = 'https://thrivetrilogy.com';

/**
 * Absolute URL on the root domain for a founder-supplied relative path.
 *
 * Source files (Docs/affiliate-products-structured.md, Docs/article-linking-structured.md)
 * store relative paths, and they stay relative there — this is the ONE place that turns them
 * into links. Pass a path beginning with "/"; an already-absolute URL is returned unchanged so
 * double-prefixing is impossible if a catalog entry is ever pasted in fully-qualified.
 */
export function blogUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BLOG_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * True only for a well-formed absolute URL on the root domain. Used by the regression tests
 * that assert no surfaced link is relative or points at the app subdomain.
 * Note `${BLOG_ORIGIN}/` with the trailing slash: it rejects look-alike hosts such as
 * https://thrivetrilogy.com.evil.test/ that would pass a bare prefix check.
 */
export function isAbsoluteBlogUrl(href: string): boolean {
  return href.startsWith(`${BLOG_ORIGIN}/`);
}
