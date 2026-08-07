// Anchor number of the Stack Report: the composite 0–100 Spend Efficiency Index (SEI),
// the dominant, high-contrast figure (BRAND §5, prompt §7). Paired with the Estimated
// Annual Waste RANGE (never a single figure). Dashboard density — tabular figures.
// Presentational only; data comes from the report fixture via the page.
import { TERMS, EVIDENCE_TIER_CEILINGS } from '@/lib/constants';

export function SpendEfficiencyIndex({
  score,
  waste,
  interpretation,
  coverage,
}: {
  score: number;
  waste: { low: number; high: number };
  /**
   * CLAIMS_COMPLIANCE §4f — why the score is what it is, rendered by the backend and passed
   * through as a finished string.
   *
   * THIS COMPONENT USED TO CHOOSE THE SENTENCE ITSELF, from three score bands, and that is how
   * it came to state something false: on a stack whose only scored compound was inside its
   * studied range with $0 of waste, the 55-79 band claimed "A meaningful share of your spend
   * sits outside the studied ranges" — contradicting the ceilings footnote directly below it.
   * §4f: the sentence is claim copy, must name the constraint that actually bound the score,
   * and "must not be authored in a rendering component".
   */
  interpretation: string | null;
  /** §4e coverage statement, or null when the score covers everything entered. */
  coverage: string | null;
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
        {interpretation && <p className="mt-3 text-sm text-body">{interpretation}</p>}
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

      {/* §4e coverage — directly beneath the two boxes it qualifies, and ABOVE the ceilings
          footnote. It previously sat below the footnote, which put an unrelated explanatory
          note between the figures and the statement of what they cover. */}
      {coverage && <p className="text-sm text-muted sm:col-span-5">{coverage}</p>}

      {/* Evidence-tier ceilings note — the four ceiling values live in ONE constant. */}
      <p className="text-xs text-muted sm:col-span-5">
        Score ceilings by evidence tier (A {EVIDENCE_TIER_CEILINGS.A} · B{' '}
        {EVIDENCE_TIER_CEILINGS.B} · C {EVIDENCE_TIER_CEILINGS.C} · D {EVIDENCE_TIER_CEILINGS.D}) cap
        the achievable score: weaker evidence limits the score regardless of dosing.
      </p>
    </section>
  );
}
