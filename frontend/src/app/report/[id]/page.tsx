'use client';
// Screen 12 — full Stack Report in dashboard mode (CSR, post email-capture, not indexed —
// TECH_DOCS §7). Financial-dashboard density within the brand palette (BRAND §5). The
// disclaimer renders in BODY text at the TOP (CLAIMS_COMPLIANCE §5, BRAND §7). Data comes
// live-first from the backend, falling back to fixtures; the sample-data banner shows ONLY
// when the numbers are fixtures. Loading/error/empty states included (deliverable §10.6).
import { useEffect, useState } from 'react';
import { getReport } from '@/lib/data';
import type { ReportResponse } from '@/lib/types';
import { SpendEfficiencyIndex } from '@/components/report/SpendEfficiencyIndex';
import { StopKeepStart } from '@/components/report/StopKeepStart';
import { StartSection } from '@/components/report/StartSection';
import { NotYetReviewed } from '@/components/report/NotYetReviewed';
import { RelatedReading } from '@/components/report/RelatedReading';
import { SafetyFlag } from '@/components/report/SafetyFlag';
import { Disclaimer } from '@/components/compliance/Disclaimer';
import { Button, FixtureTag } from '@/components/ui/primitives';
import { SampleDataBanner } from '@/components/ui/SampleDataBanner';
import { TERMS, REVIEWER, AI_ROLE_NOTE } from '@/lib/constants';

export default function ReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setReport(null);
    getReport(params.id)
      .then((res) => {
        setReport(res.data);
        setIsSample(res.isSample);
      })
      .catch(() => setError(true));
  };

  useEffect(load, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-700 text-headline">We couldn&apos;t load this report</h1>
        <p className="mt-2 text-body">
          Either the service had a brief hiccup, or this assessment has expired — sessions are kept
          for 48 hours. Retry first; if it keeps failing, start a fresh audit.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={load}>Retry</Button>
          <Button href="/assessment" variant="secondary">
            Start a new audit
          </Button>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8" aria-busy="true">
        <div className="h-16 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="mt-4 h-40 animate-pulse rounded-lg bg-surface-subtle" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-surface-subtle" />
      </main>
    );
  }

  // EVERY action section must be counted here. `report.start` is the LEGACY field and is
  // hardcoded `[]` by the backend (the real Start is `start_section`), so it contributes
  // nothing to this test — which means adding Adjust without adding it here would have made a
  // report whose only findings are in Adjust render "No findings to show yet" while holding
  // findings. That is the whole failure mode of the empty state: claiming there is nothing to
  // say when there is.
  // §4e adds a fourth thing a report can hold. A stack whose every compound is recognized but
  // unreviewed produces no Stop, no Adjust and no Keep — and is NOT empty: it has something to
  // say, namely that we recognize these compounds and have not reviewed them. Counting only the
  // action sections would render "No findings to show yet" over a populated list, which is the
  // same defect the Adjust section hit in PR #31.
  const empty =
    report.stop.length === 0 &&
    report.adjust.length === 0 &&
    report.keep.length === 0 &&
    (report.not_yet_reviewed?.compounds.length ?? 0) === 0;

  // "Last reviewed" reflects the ACTUAL evidence review date carried by this report's compounds
  // (the DB `last_reviewed_date` set by the batch-1 sign-off, PR #12) — the max across all rows,
  // so it tracks re-reviews automatically and never goes stale independently. Falls back to the
  // shared REVIEWER date only when no row carries one (e.g. an empty report). ISO dates compare
  // lexicographically, so string max is date max.
  const reviewDates = [...report.stop, ...report.adjust, ...report.keep, ...report.start]
    .map((r) => r.last_reviewed)
    .filter((d): d is string => Boolean(d));
  const lastReviewed = reviewDates.length
    ? reviewDates.reduce((a, b) => (a > b ? a : b))
    : REVIEWER.lastReviewed;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-700 text-headline">Your {TERMS.report}</h1>
        {isSample && <FixtureTag label="Sample report · fixture data" />}
      </div>

      {/* Sample-data notice — shown ONLY when these numbers are fixtures, not a live result. */}
      {isSample && (
        <div className="mt-4">
          <SampleDataBanner />
        </div>
      )}

      {/* Disclaimer: body text size, top of the report — NOT footer-only (§5). */}
      <div className="mt-4">
        <Disclaimer />
      </div>

      {report.safety_flag && (
        <div className="mt-4">
          <SafetyFlag />
        </div>
      )}

      {empty ? (
        <div className="mt-8 rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-700 text-headline">No findings to show yet</p>
          <p className="mt-2 text-sm text-body">
            Once your stack is scored, your Stop, Adjust, Keep, and Start sections appear here.
          </p>
          <Button href="/assessment" variant="secondary" className="mt-5">
            Start an audit
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <SpendEfficiencyIndex score={report.composite_score} waste={report.total_estimated_annual_waste} />
            {/* §4e: how many of the user's compounds this score covers. Backend-supplied and
                null whenever it covers all of them, so it never appears on a fully scored
                stack — the conditional is the rule, not a styling choice. */}
            {report.coverage_note && (
              <p className="mt-2 text-sm text-muted">{report.coverage_note}</p>
            )}
          </div>
          <StopKeepStart report={report} />
          {/* Roundup articles render INSIDE the Start section only (CLAIMS §6 extension);
              educational articles + general hubs render in their own Related reading block. */}
          <StartSection
            section={report.start_section}
            roundups={report.article_links?.start_roundups ?? []}
          />
          {/* §4e: after Start, and never carrying a purchase link of its own. */}
          <NotYetReviewed data={report.not_yet_reviewed} />
          <RelatedReading
            groups={report.article_links?.related_reading ?? []}
            hubs={report.article_links?.hubs ?? []}
          />
        </>
      )}

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
        Reviewed by {REVIEWER.name}, {REVIEWER.credential}. Last reviewed {lastReviewed}.{' '}
        {AI_ROLE_NOTE}
      </p>
    </main>
  );
}
