// Per-link affiliate disclosure (CLAIMS_COMPLIANCE §6 four-factor test; BRAND §7).
// EVERY affiliate link in the Start section carries its OWN adjacent disclosure, in the
// SAME body font and size as surrounding text — never once-per-page, never smaller.
// Approved wording (§6): "This is a paid link that supports this report."
export function AffiliateDisclosure() {
  return (
    <span className="text-sm text-muted"> This is a paid link that supports this report.</span>
  );
}
