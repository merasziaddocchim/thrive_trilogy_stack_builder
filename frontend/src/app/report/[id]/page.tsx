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
import { SafetyFlag } from '@/components/report/SafetyFlag';
import { Disclaimer } from '@/components/compliance/Disclaimer';
import { Button, FixtureTag } from '@/components/ui/primitives';
import { SampleDataBanner } from '@/components/ui/SampleDataBanner';
import { TERMS, REVIEWER } from '@/lib/constants';

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
        <p className="mt-2 text-body">The scoring service may be waking up. Try again in a moment.</p>
        <Button onClick={load} className="mt-6">
          Retry
        </Button>
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

  const empty =
    report.stop.length === 0 && report.keep.length === 0 && report.start.length === 0;

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
            Once your stack is scored, your Stop, Keep, and Start sections appear here.
          </p>
          <Button href="/assessment" variant="secondary" className="mt-5">
            Start an audit
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <SpendEfficiencyIndex score={report.composite_score} waste={report.total_estimated_annual_waste} />
          </div>
          <StopKeepStart report={report} />
        </>
      )}

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
        Reviewed by {REVIEWER.name}, {REVIEWER.credential}. Last reviewed {REVIEWER.lastReviewed}.
        This report was generated using AI, based on our reviewed research database, and is not a
        substitute for professional medical advice.
      </p>
    </main>
  );
}
