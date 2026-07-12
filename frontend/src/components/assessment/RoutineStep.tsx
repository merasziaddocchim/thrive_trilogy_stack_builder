'use client';
// Screen 6 — Routine. One question per sub-step (diet, activity, sleep), each SKIPPABLE
// with a visible "Skip for now" (prompt §9). Intentionally short and separate to keep
// completion rate high (prompt §2).
import { useState } from 'react';
import { StepShell } from './StepShell';
import { ChoiceButton, SkipLink } from './Choice';
import type { AuditState } from './audit-state';

const SUBSTEPS = [
  {
    key: 'diet' as const,
    title: 'How would you describe your diet?',
    options: ['Balanced / mixed', 'Higher protein', 'Plant-based', 'Low-carb / keto', 'It varies a lot'],
  },
  {
    key: 'activity' as const,
    title: 'How active are you in a typical week?',
    options: ['Mostly sedentary', 'Light activity', 'Regular exercise', 'Intense / daily training'],
  },
  {
    key: 'sleep' as const,
    title: 'How consistent is your sleep?',
    options: ['Very consistent', 'Mostly consistent', 'Irregular', 'Poor / disrupted'],
  },
];

export function RoutineStep({
  state,
  patch,
  onBack,
  onContinue,
}: {
  state: AuditState;
  patch: (p: Partial<AuditState>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [sub, setSub] = useState(0);
  const current = SUBSTEPS[sub];

  const advance = () => {
    if (sub < SUBSTEPS.length - 1) setSub(sub + 1);
    else onContinue();
  };
  const back = () => {
    if (sub > 0) setSub(sub - 1);
    else onBack();
  };

  return (
    <StepShell
      step="Routine"
      title={current.title}
      subtext={`A little context helps us order your findings. Question ${sub + 1} of ${SUBSTEPS.length} — all optional.`}
      onBack={back}
      onContinue={advance}
      continueDisabled={!state.routine[current.key]}
    >
      <div className="space-y-2.5">
        {current.options.map((o) => (
          <ChoiceButton
            key={o}
            selected={state.routine[current.key] === o}
            onClick={() => patch({ routine: { ...state.routine, [current.key]: o } })}
          >
            {o}
          </ChoiceButton>
        ))}
      </div>
      <SkipLink onClick={advance} />
    </StepShell>
  );
}
