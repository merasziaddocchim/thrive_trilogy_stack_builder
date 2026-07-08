// Anchor number of the report: the composite 0-100 score, public name
// "Spend Efficiency Index" (SEI) per BRAND_GUIDELINES §3. Large, high-contrast display.
// No data fetching / no formula here - stub only.
export function SpendEfficiencyIndex({ assessmentId }: { assessmentId: string }) {
  return (
    <section className="rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm uppercase tracking-wide text-body">Spend Efficiency Index</h2>
      {/* Stub: fetch GET /assessment/:id/report -> composite_score. */}
      <p className="font-display text-6xl font-bold text-headline">—</p>
      <p className="mt-1 text-xs text-body">Assessment {assessmentId}</p>
    </section>
  );
}
