// Anchor number of the Stack Report: the composite 0–100 Spend Efficiency Index (SEI),
// the dominant, high-contrast figure (BRAND §5, prompt §7). Paired with the Estimated
// Annual Waste RANGE (never a single figure). Dashboard density — tabular figures.
// Presentational only; data comes from the report fixture via the page.
import { TERMS, EVIDENCE_TIER_CEILINGS } from '@/lib/constants';

// A short, non-clinical read of where the score sits. Deliberately avoids any
// benefit/verdict language (CLAIMS_COMPLIANCE §0) — it describes the number, not the body.
function band(score: number): string {
  if (score >= 80) return 'Most of your spend aligns with the studied ranges and evidence.';
  if (score >= 55) return 'A meaningful share of your spend sits outside the studied ranges.';
  return 'A large share of your spend sits outside the studied ranges or evidence.';
}

export function SpendEfficiencyIndex({
  score,
  waste,
}: {
  score: number;
  waste: { low: number; high: number };
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-5">
      {/* SEI — dominant anchor (spans 3/5). */}
      <div className="rounded-lg border border-border bg-surface p-6 sm:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-700 uppercase tracking-[0.14em] text-muted">{TERMS.sei}</h2>
          <span className="text-xs text-muted">0–100</span>
        </div>
        <p className="nums-tabular mt-1 font-display text-6xl font-900 leading-none text-headline">
          {score}
          <span className="text-3xl font-700 text-muted">/100</span>
        </p>
        {/* Simple scale track for at-a-glance placement. */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-pill bg-surface-subtle">
          <div className="h-full rounded-pill bg-accent" style={{ width: `${score}%` }} />
        </div>
        <p className="mt-3 text-sm text-body">{band(score)}</p>
      </div>

      {/* Estimated Annual Waste — always a range. */}
      <div className="rounded-lg border border-border bg-surface p-6 sm:col-span-2">
        <h2 className="text-xs font-700 uppercase tracking-[0.14em] text-muted">
          {TERMS.annualWaste}
        </h2>
        <p className="nums-tabular mt-1 font-display text-2xl font-700 text-headline">
          ${waste.low.toLocaleString()}–${waste.high.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-muted">
          An estimate range across a year — redundant and underdosed spend combined. Never a single
          false-precision figure.
        </p>
      </div>

      {/* Evidence-tier ceilings note — the four ceiling values live in ONE constant. */}
      <p className="text-xs text-muted sm:col-span-5">
        Score ceilings by evidence tier (A {EVIDENCE_TIER_CEILINGS.A} · B{' '}
        {EVIDENCE_TIER_CEILINGS.B} · C {EVIDENCE_TIER_CEILINGS.C} · D {EVIDENCE_TIER_CEILINGS.D}) cap
        the achievable score: weaker evidence limits the score regardless of dosing.
      </p>
    </section>
  );
}
