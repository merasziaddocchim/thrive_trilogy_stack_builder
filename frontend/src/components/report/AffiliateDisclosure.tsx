// Per-link affiliate disclosure (CLAIMS_COMPLIANCE §6 four-factor test; BRAND §7).
// EVERY affiliate link in the Start section carries its OWN adjacent disclosure, in the
// SAME body font and size as surrounding text — never once-per-page, never smaller.
// Approved wording (§6): "This is a paid link that supports this report."
export function AffiliateDisclosure() {
  return (
    <span className="text-sm text-muted"> This is a paid link that supports this report.</span>
  );
}

// Per-link disclosure for ROUNDUP ARTICLE links in the Start section (CLAIMS_COMPLIANCE §6
// extension: roundups and single-brand reviews carry the same endorsement risk as a direct
// affiliate link, so they get the same per-link, same-size, adjacent disclosure treatment).
//
// The wording is deliberately DIFFERENT from AffiliateDisclosure, because the affiliate one
// would be FALSE here: a link to our own article is not itself a paid link — nobody pays us
// for the click. What creates the endorsement risk is that the destination ranks products and
// is monetized. Saying "this is a paid link" about an unpaid link would be its own
// misrepresentation, so the disclosure states the two facts that are actually true and
// material: the article is ours, and it earns commission on the products it recommends.
// Approved wording recorded in CLAIMS_COMPLIANCE §6.
export function ContentLinkDisclosure() {
  return (
    <span className="text-sm text-muted">
      {' '}
      This is our own article, and it recommends products that can earn us a commission.
    </span>
  );
}
