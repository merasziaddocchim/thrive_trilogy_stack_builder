'use client';
// Stop / Keep sections (exact casing/words locked, BRAND §3). Dashboard density: each compound
// row shows name, dollar amount, and Evidence Tier WITHOUT a click; the full citation/tier
// rationale expands on tap (BRAND §5, prompt §7). Distinct card treatment per section via a
// left-accent — the ONE place colored side-borders are allowed (structural wayfinding, prompt §7).
// The "Start" section (affiliate products, Tier 1/2/3) is rendered separately by StartSection.
import { useState } from 'react';
import type { ArticleLink, ReportResponse } from '@/lib/types';
import { SECTION_DESCRIPTIONS, SECTION_EMPTY_STATES } from '@/lib/constants';
import { TierBadge, TierDisclosure } from '@/components/ui/EvidenceTier';

// "Learn more" — an EDUCATIONAL article only (mechanism/dosing/delivery explainers). Safe in a
// Stop/Keep row with no disclosure, because it recommends no purchasable product and is
// functionally a citation (CLAIMS_COMPLIANCE §6 extension; BRAND §8 renders it as a plain
// further-reading link). A roundup here would be the exact placement §6 forbids — the backend
// never puts one in this field. Rendered OUTSIDE the row's expand <button>: an anchor nested
// inside a button is invalid HTML and traps the link from keyboard/AT users.
function LearnMore({ article }: { article: ArticleLink }) {
  return (
    <a
      href={article.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-accent underline underline-offset-4"
    >
      Learn more<span className="sr-only">: {article.title}</span>
    </a>
  );
}

// CLAIMS_COMPLIANCE §4d. Stop / Adjust / Keep, rendered in that order — the same order §4d
// evaluates them in, so what a reader sees top-to-bottom matches how the placement was decided.
type SectionKey = 'Stop' | 'Adjust' | 'Keep';

// Descriptions and empty-state sentences are founder-approved copy, held in constants.ts.
// Stop's used to read "Redundant, underdosed, or unverifiable — where your spend isn't
// working." That sentence was the bug in words: underdosing is not a reason to stop, and it
// sat above compounds the evidence fully supports.
const SECTION_STYLE: Record<SectionKey, { border: string; chip: string }> = {
  Stop: { border: 'border-l-stop', chip: 'bg-stop-soft text-stop' },
  Adjust: { border: 'border-l-adjust', chip: 'bg-adjust-soft text-adjust' },
  Keep: { border: 'border-l-keep', chip: 'bg-keep-soft text-keep' },
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
  learnMore,
  outcomeMismatchNote,
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
  learnMore?: ArticleLink;
  outcomeMismatchNote: string | null;
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

      {/* CLAIMS_COMPLIANCE §4c: this row's Evidence Tier and dose range were established for a
          different outcome than the user chose. Rendered unconditionally with the row, not
          hidden behind the expander — a disclosure the reader must open is not on the surface. */}
      {outcomeMismatchNote && (
        <p className="px-4 pb-3 -mt-1 text-xs text-muted">{outcomeMismatchNote}</p>
      )}

      {/* Outside the button (valid HTML, independently focusable), still adjacent to the row. */}
      {learnMore && (
        <div className="px-4 pb-3 -mt-1">
          <LearnMore article={learnMore} />
        </div>
      )}

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
  isEmpty,
  children,
}: {
  title: SectionKey;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const s = SECTION_STYLE[title];
  return (
    <section className={`rounded-lg border border-border border-l-4 bg-surface p-4 ${s.border}`}>
      <div className="flex items-center gap-2">
        <h3 className={`rounded-pill px-2.5 py-1 text-sm font-700 ${s.chip}`}>{title}</h3>
        <p className="text-sm text-muted">{SECTION_DESCRIPTIONS[title]}</p>
      </div>
      {/* §4d: "A section containing no items must state that plainly rather than rendering an
          empty heading. An empty Stop section is a finding in its own right and must read as
          one." Before this, a zero-item section rendered a heading over an empty list — which
          is how the live report showed "Keep" with nothing under it. */}
      {isEmpty ? (
        <p className="mt-3 text-sm text-body">{SECTION_EMPTY_STATES[title]}</p>
      ) : (
        <ul className="mt-3 space-y-2">{children}</ul>
      )}
    </section>
  );
}

export function StopKeepStart({ report }: { report: ReportResponse }) {
  return (
    <div className="mt-6 space-y-4">
      <Section title="Stop" isEmpty={report.stop.length === 0}>
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
            learnMore={r.learn_more}
            outcomeMismatchNote={r.outcome_mismatch_note}
          />
        ))}
      </Section>

      {/* Adjust sits BETWEEN Stop and Keep — §4d's order. */}
      <Section title="Adjust" isEmpty={report.adjust.length === 0}>
        {report.adjust.map((r) => (
          <ExpandableRow
            key={r.compound}
            name={r.compound}
            amount={r.monthly_cost}
            amountLabel="mo"
            reason={r.reason}
            tier={r.evidence_tier}
            rationale={r.tier_rationale}
            lastReviewed={r.last_reviewed}
            reviewer={r.reviewer_name}
            sourceIds={r.source_ids}
            learnMore={r.learn_more}
            outcomeMismatchNote={r.outcome_mismatch_note}
          />
        ))}
      </Section>

      <Section title="Keep" isEmpty={report.keep.length === 0}>
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
            learnMore={r.learn_more}
            outcomeMismatchNote={r.outcome_mismatch_note}
          />
        ))}
      </Section>
    </div>
  );
}
