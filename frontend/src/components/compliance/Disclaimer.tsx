// Adapted, non-supplement-manufacturer disclaimer (CLAIMS_COMPLIANCE §5).
// Renders adjacent to every report section, body-text size - NOT footer-only
// (CLAIMS_COMPLIANCE §5 placement rule, BRAND_GUIDELINES §7).
//
// Exact wording is owned by CLAIMS_COMPLIANCE §5; treated as the source of truth.
export function Disclaimer() {
  return (
    <p className="rounded-md bg-slate-50 p-4 text-sm text-body">
      This report compares your stack against published research and is for informational
      purposes only. It is not medical advice, has not been evaluated by the FDA, and is not
      intended to diagnose, treat, cure, or prevent any disease. Consult a physician before
      making changes to your regimen, especially if you take medication or have a medical
      condition.
    </p>
  );
}
