// Stop / Keep / Start sections (exact casing/words locked, BRAND_GUIDELINES §3).
// Distinct card treatment per section (BRAND §5). Each compound row shows name,
// dollar amount, evidence tier without a click; detail on expand. Stub only.
const SECTIONS = ['Stop', 'Keep', 'Start'] as const;

export function StopKeepStart({ assessmentId }: { assessmentId: string }) {
  return (
    <div className="mt-6 space-y-4">
      {SECTIONS.map((section) => (
        <section key={section} className="rounded-xl border-l-4 border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold">{section}</h3>
          {/* Stub: rows from GET /assessment/:id/report. Every row MUST show Evidence Tier
              and carry source_ids (CLAIMS_COMPLIANCE §4). Start rows carry per-link
              affiliate disclosure (BRAND §7). */}
          <p className="mt-2 text-sm text-body">No data yet ({assessmentId}).</p>
        </section>
      ))}
    </div>
  );
}
