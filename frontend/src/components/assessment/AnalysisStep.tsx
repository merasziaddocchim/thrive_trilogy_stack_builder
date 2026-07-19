'use client';
// Screen 9 — Analysis / loading. Multi-stage state that gracefully absorbs a 30–60s
// Render/Neon cold start (prompt §7/§8) with the exact sequential messages from §8, so a
// long wait reads as real work rather than a broken app. Includes a designed error state
// with retry (deliverable §10.6). No backend dependency for marketing — this is the one
// assessment screen that stands in for the live call.
import { useEffect, useRef, useState } from 'react';
import { ANALYSIS_STAGES, runAnalysis, createAssessment } from '@/lib/data';
import { buildAssessmentPayload } from './build-payload';
import type { AuditState } from './audit-state';
import { IconCheck, IconAlert } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';

export function AnalysisStep({
  state,
  onDone,
}: {
  state: AuditState;
  onDone: (assessmentId: string) => void;
}) {
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(false);
  const [slow, setSlow] = useState(false);
  const started = useRef(false);

  function begin() {
    setError(false);
    setStage(0);
    // Cold-start reassurance: if it's taking long, acknowledge it rather than hang.
    const slowTimer = setTimeout(() => setSlow(true), 6000);
    // Run the staged animation and create the assessment in parallel; advance when both
    // finish. createAssessment falls back to a demo id if the backend is unreachable.
    Promise.all([
      runAnalysis((i) => setStage(i)),
      createAssessment(buildAssessmentPayload(state)),
    ])
      .then(([, created]) => {
        clearTimeout(slowTimer);
        onDone(created.assessment_id);
      })
      .catch(() => {
        clearTimeout(slowTimer);
        setError(true);
      });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stop-soft text-stop">
          <IconAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-700 text-headline">We couldn&apos;t save your assessment</h1>
        <p className="mt-2 text-body">
          Our service may have been waking up, or had a brief hiccup saving. Nothing you entered was
          lost — it&apos;s still here on this device, so just try again.
        </p>
        <Button onClick={begin} className="mt-6">
          Try again
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="mx-auto w-full">
        <p className="text-xs font-700 uppercase tracking-[0.14em] text-accent">Preparing your Preview</p>
        <h1 className="mt-2 text-xl font-700 text-headline">Checking your stack against reviewed records</h1>

        <ol className="mt-8 space-y-3">
          {ANALYSIS_STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? 'border-keep bg-keep-soft text-keep'
                      : active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border text-muted'
                  }`}
                >
                  {done ? (
                    <IconCheck className="h-4 w-4" />
                  ) : active ? (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    done ? 'text-muted line-through' : active ? 'font-600 text-headline' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {slow && (
          <p className="mt-8 rounded-md bg-surface-subtle p-3 text-sm text-muted">
            Still working — our free-tier analysis service can take up to a minute to wake up. This
            is normal and worth the wait.
          </p>
        )}
      </div>
    </main>
  );
}
