'use client';
// Stop / Keep sections (exact casing/words locked, BRAND §3). Dashboard density: each compound
// row shows name, dollar amount, and Evidence Tier WITHOUT a click; the full citation/tier
// rationale expands on tap (BRAND §5, prompt §7). Distinct card treatment per section via a
// left-accent — the ONE place colored side-borders are allowed (structural wayfinding, prompt §7).
// The "Start" section (affiliate products, Tier 1/2/3) is rendered separately by StartSection.
import { useState } from 'react';
import type { ReportResponse } from '@/lib/types';
import { TierBadge, TierDisclosure } from '@/components/ui/EvidenceTier';

type SectionKey = 'Stop' | 'Keep';

const SECTION_STYLE: Record<SectionKey, { border: string; chip: string; blurb: string }> = {
  Stop: {
    border: 'border-l-stop',
    chip: 'bg-stop-soft text-stop',
    blurb: 'Redundant, underdosed, or unverifiable — where your spend isn’t working.',
  },
  Keep: {
    border: 'border-l-keep',
    chip: 'bg-keep-soft text-keep',
    blurb: 'Within studied ranges and supported by evidence.',
  },
};

function ExpandableRow({
  name,
  amount,
  amountLabel,
  reason,
  tier,
  rationale,
  lastReviewed,
  reviewer,
  sourceIds,
  extra,
}: {
  name: string;
  amount: number | null;
  amountLabel: string;
  reason: string;
  tier: React.ComponentProps<typeof TierBadge>['tier'];
  rationale: string;
  lastReviewed: string;
  reviewer: string;
  sourceIds: string[];
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-700 text-headline">{name}</span>
          <span className="mt-0.5 block text-sm text-body">{reason}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {amount !== null && (
            <span className="nums-tabular font-700 text-headline">
              ${amount}
              <span className="text-xs font-500 text-muted">/{amountLabel}</span>
            </span>
          )}
          <TierBadge tier={tier} />
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <TierDisclosure
            tier={tier}
            rationale={rationale}
            lastReviewed={lastReviewed}
            reviewer={reviewer}
          />
          <p className="mt-2 text-xs text-muted">
            Sources: {sourceIds.join(', ')} — full citations open on the source registry.
          </p>
          {extra}
        </div>
      )}
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: SectionKey;
  children: React.ReactNode;
}) {
  const s = SECTION_STYLE[title];
  return (
    <section className={`rounded-lg border border-border border-l-4 bg-surface p-4 ${s.border}`}>
      <div className="flex items-center gap-2">
        <h3 className={`rounded-pill px-2.5 py-1 text-sm font-700 ${s.chip}`}>{title}</h3>
        <p className="text-sm text-muted">{s.blurb}</p>
      </div>
      <ul className="mt-3 space-y-2">{children}</ul>
    </section>
  );
}

export function StopKeepStart({ report }: { report: ReportResponse }) {
  return (
    <div className="mt-6 space-y-4">
      <Section title="Stop">
        {report.stop.map((r) => (
          <ExpandableRow
            key={r.compound}
            name={r.compound}
            amount={r.est_monthly_waste}
            amountLabel="mo waste"
            reason={r.reason}
            tier={r.evidence_tier}
            rationale={r.tier_rationale}
            lastReviewed={r.last_reviewed}
            reviewer={r.reviewer_name}
            sourceIds={r.source_ids}
          />
        ))}
      </Section>

      <Section title="Keep">
        {report.keep.map((r) => (
          <ExpandableRow
            key={r.compound}
            name={r.compound}
            amount={r.monthly_cost}
            amountLabel="mo"
            reason={r.note}
            tier={r.evidence_tier}
            rationale={r.tier_rationale}
            lastReviewed={r.last_reviewed}
            reviewer={r.reviewer_name}
            sourceIds={r.source_ids}
          />
        ))}
      </Section>
    </div>
  );
}
