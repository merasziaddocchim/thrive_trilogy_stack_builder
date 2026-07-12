'use client';
// Screen 10 — Stack Audit Preview. Honest by construction (prompt §5):
//   STATE A (sufficient): recognized compounds, overlap flags, tier summary, 1–2 dose
//     comparisons (Tier A/B only), plus a real-looking SEI + Annual Waste RANGE.
//   STATE B (insufficient — the common V1 case): NO fabricated SEI or waste figure; a
//     friendly nudge to add monthly spend instead. Designed as a nudge, not an error.
// Which state renders is decided by whether spend was captured (audit-state predicate),
// mirroring how the real backend would decide server-side. Includes loading/error/empty.
import { useEffect, useState } from 'react';
import { getPreview } from '@/lib/data';
import { hasSufficientSpend, type AuditState } from './audit-state';
import type { PreviewResponse, EvidenceTier } from '@/lib/types';
import { Button, Card, Eyebrow, FixtureTag } from '@/components/ui/primitives';
import { SampleDataBanner } from '@/components/ui/SampleDataBanner';
import { TierBadge } from '@/components/ui/EvidenceTier';
import { IconLayers, IconAlert, IconArrowRight } from '@/components/ui/Icon';
import { TERMS } from '@/lib/constants';

const TIER_ORDER: EvidenceTier[] = ['A', 'B', 'C', 'D'];

function TierSummary({ summary }: { summary: Record<EvidenceTier, number> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIER_ORDER.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
        >
          <TierBadge tier={t} />
          <span className="nums-tabular font-700 text-headline">{summary[t]}</span>
        </span>
      ))}
    </div>
  );
}

export function PreviewStep({
  state,
  assessmentId,
  onBack,
  onContinue,
}: {
  state: AuditState;
  assessmentId: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setData(null);
    getPreview(assessmentId, { hasSpend: hasSufficientSpend(state) })
      .then((res) => {
        setData(res.data);
        setIsSample(res.isSample);
      })
      .catch(() => setError(true));
  };

  useEffect(load, [state, assessmentId]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stop-soft text-stop">
          <IconAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-700 text-headline">We couldn&apos;t load your Preview</h1>
        <p className="mt-2 text-body">Nothing was lost. Try again in a moment.</p>
        <Button onClick={load} className="mt-6">
          Retry
        </Button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12" aria-busy="true">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-subtle" />
        <div className="mt-4 h-28 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="mt-3 h-40 animate-pulse rounded-lg bg-surface-subtle" />
      </main>
    );
  }

  // Empty state: extraction produced nothing usable.
  if (data.recognized_compounds.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-700 text-headline">We couldn&apos;t recognize any compounds yet</h1>
        <p className="mt-2 text-body">
          Head back and add a little more detail — even a name or a dose helps us match against the
          research database.
        </p>
        <Button onClick={onBack} variant="secondary" className="mt-6">
          Back to my entries
        </Button>
      </main>
    );
  }

  const stateA = data.sufficient_for_scoring;

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <Eyebrow>Your {TERMS.preview}</Eyebrow>
        {isSample && <FixtureTag label="Preview · sample data" />}
      </div>
      <h1 className="text-xl font-700 text-headline">Here&apos;s what we found in your stack</h1>

      {/* Banner ONLY when these numbers are fixtures, not a live scored result. */}
      {isSample && <SampleDataBanner className="mt-4" />}

      {/* ---------- STATE A: sufficient — real-looking SEI + waste range ---------- */}
      {stateA && data.spend_efficiency_index !== null && data.estimated_annual_waste && (
        <Card className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-700 uppercase tracking-[0.14em] text-muted">{TERMS.sei}</p>
              <p className="nums-tabular font-display text-5xl font-900 text-headline">
                {data.spend_efficiency_index}
                <span className="text-2xl font-700 text-muted">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-700 uppercase tracking-[0.14em] text-muted">
                {TERMS.annualWaste}
              </p>
              <p className="nums-tabular font-display text-2xl font-700 text-headline">
                ${data.estimated_annual_waste.low}–${data.estimated_annual_waste.high}
              </p>
              <p className="text-xs text-muted">a range, not a single figure</p>
            </div>
          </div>
        </Card>
      )}

      {/* Headline finding — always a §9 template, never freehand. */}
      <p className="mt-6 rounded-lg border-l-4 border-accent bg-accent-soft px-4 py-3 font-600 text-headline">
        {data.headline_finding}
      </p>

      {/* Recognized compounds + tier summary — shown in BOTH states. */}
      <section className="mt-8">
        <h2 className="text-lg font-700 text-headline">Recognized compounds</h2>
        <ul className="mt-3 space-y-2">
          {data.recognized_compounds.map((c) => (
            <li
              key={c.compound_id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="font-600 text-headline">{c.canonical_name}</span>
              <TierBadge tier={c.evidence_tier} />
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <p className="mb-2 text-sm font-600 text-body">Evidence tier overview</p>
          <TierSummary summary={data.evidence_tier_summary} />
        </div>
      </section>

      {/* Overlap flags (State A shows costed overlaps). */}
      {data.overlap_flags.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-700 text-headline">Potential overlap</h2>
          {data.overlap_flags.map((f) => (
            <div
              key={f.shared_ingredient}
              className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <span className="mt-0.5 text-accent">
                <IconLayers className="h-5 w-5" />
              </span>
              <p className="text-sm text-body">
                <span className="font-700 text-headline">
                  {f.product_count} products share {f.shared_ingredient}.
                </span>{' '}
                {f.approx_monthly_cost !== null &&
                  `Combined, that's about $${f.approx_monthly_cost}/month on overlapping sources.`}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Dose comparisons — Tier A/B ONLY, and only in State A (prompt §5). */}
      {stateA && data.dose_comparisons.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-700 text-headline">Dose vs. studied range</h2>
          <ul className="mt-3 space-y-2">
            {data.dose_comparisons.map((d) => (
              <li key={d.compound} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-700 text-headline">{d.compound}</span>
                  <TierBadge tier={d.evidence_tier} />
                </div>
                <p className="mt-1 text-sm text-body">
                  {d.percent_delta === 0
                    ? `Your current intake of ${d.user_dose.amount} ${d.user_dose.unit} is within the range used in human research (${d.studied_range.low}–${d.studied_range.high} ${d.studied_range.unit}), based on ${d.source_short_name}.`
                    : `Your current intake of ${d.compound} is ${d.user_dose.amount} ${d.user_dose.unit} — ${Math.abs(d.percent_delta)}% ${d.percent_delta < 0 ? 'below' : 'above'} the range used in human research (${d.studied_range.low}–${d.studied_range.high} ${d.studied_range.unit}), based on ${d.source_short_name}.`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- STATE B: insufficient — nudge, NOT a fabricated number ---------- */}
      {!stateA && (
        <Card className="mt-8 border-accent bg-accent-soft">
          <p className="font-700 text-headline">
            Add monthly spend to unlock your {TERMS.sei} and {TERMS.annualWaste}
          </p>
          <p className="mt-2 text-sm text-body">
            We recognized your compounds and their evidence tiers above. To turn that into a score
            and a dollar figure, we just need a rough sense of what you spend each month.
          </p>
          <Button onClick={onBack} variant="secondary" className="mt-4">
            Add monthly spend
          </Button>
        </Card>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <button onClick={onBack} className="min-h-[44px] px-2 text-sm font-600 text-muted hover:text-body">
          Back
        </button>
        <Button onClick={onContinue}>
          Unlock full {TERMS.report}
          <IconArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </main>
  );
}
