'use client';
// Interactive assessment flow — CSR per TECH_DOCS §7 (not indexed). Orchestrates the
// 9 journey screens (§2 Screens 3–11) as a client step machine. sessionStorage persists
// progress (prompt §8) — health-adjacent detail never outlives the session. No scoring
// logic here; everything is wired to the mock API + fixtures (prompt scope boundary).
import { useEffect, useReducer, useState } from 'react';
import {
  INITIAL_STATE,
  STEP_ORDER,
  loadState,
  saveState,
  type AuditState,
  type StepKey,
} from '@/components/assessment/audit-state';
import type { ExtractedItem } from '@/lib/types';
import { CaptureStep } from '@/components/assessment/CaptureStep';
import { ConfirmStep } from '@/components/assessment/ConfirmStep';
import { PriorityStep } from '@/components/assessment/PriorityStep';
import { RoutineStep } from '@/components/assessment/RoutineStep';
import { SpendStep } from '@/components/assessment/SpendStep';
import { SafetyStep } from '@/components/assessment/SafetyStep';
import { AnalysisStep } from '@/components/assessment/AnalysisStep';
import { PreviewStep } from '@/components/assessment/PreviewStep';
import { EmailGateStep } from '@/components/assessment/EmailGateStep';

function reducer(state: AuditState, patch: Partial<AuditState>): AuditState {
  return { ...state, ...patch };
}

export default function AssessmentPage() {
  const [state, patch] = useReducer(reducer, INITIAL_STATE);
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  // Real assessment id from POST /assessment (or 'demo' on fallback), threaded to preview/report.
  const [assessmentId, setAssessmentId] = useState('demo');

  // Rehydrate saved progress once on mount (matches the ResultsLayout pattern noted in §8).
  useEffect(() => {
    const saved = loadState();
    if (saved) patch(saved);
    setHydrated(true);
  }, []);

  // Persist to sessionStorage on every change (after hydration to avoid clobbering).
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const step: StepKey = STEP_ORDER[stepIndex];
  const goto = (key: StepKey) => setStepIndex(STEP_ORDER.indexOf(key));
  const next = () => setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  // Avoid a hydration flash of step 1 before saved state loads.
  if (!hydrated) {
    return <main className="mx-auto max-w-xl px-4 py-16" aria-busy="true" />;
  }

  switch (step) {
    case 'capture':
      return (
        <CaptureStep
          state={state}
          patch={patch}
          onExtracted={(items: ExtractedItem[]) => {
            patch({ extracted: items });
            goto('confirm');
          }}
        />
      );
    case 'confirm':
      return <ConfirmStep state={state} patch={patch} onBack={back} onContinue={next} />;
    case 'priority':
      return <PriorityStep state={state} patch={patch} onBack={back} onContinue={next} />;
    case 'routine':
      return <RoutineStep state={state} patch={patch} onBack={back} onContinue={next} />;
    case 'spend':
      return <SpendStep state={state} patch={patch} onBack={back} onContinue={next} />;
    case 'safety':
      return <SafetyStep state={state} patch={patch} onBack={back} onContinue={next} />;
    case 'analysis':
      return (
        <AnalysisStep
          state={state}
          onDone={(id) => {
            setAssessmentId(id);
            goto('preview');
          }}
        />
      );
    case 'preview':
      return (
        <PreviewStep
          state={state}
          assessmentId={assessmentId}
          onBack={() => goto('spend')}
          onContinue={next}
        />
      );
    case 'email':
      return <EmailGateStep assessmentId={assessmentId} onBack={() => goto('preview')} />;
    default:
      return null;
  }
}
