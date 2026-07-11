'use client';
// Screen 5 — Priority (single-select). Copy per prompt §9. Subtext makes explicit this
// does NOT change evidence ratings or replace medical advice.
import { StepShell } from './StepShell';
import { ChoiceButton } from './Choice';
import type { AuditState } from './audit-state';

const OPTIONS = [
  'Healthy aging',
  'Daily energy',
  'Cognitive performance',
  'Metabolic health',
  'Training and recovery',
  'Sleep quality',
  'Simplifying my stack',
  'Not sure yet',
];

export function PriorityStep({
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
  return (
    <StepShell
      step="Priority"
      title="What are you primarily optimizing for?"
      subtext="We use this to prioritize the findings in your report. It does not change evidence ratings or replace medical advice."
      onBack={onBack}
      onContinue={onContinue}
      continueDisabled={!state.priority}
    >
      <div className="space-y-2.5">
        {OPTIONS.map((o) => (
          <ChoiceButton key={o} selected={state.priority === o} onClick={() => patch({ priority: o })}>
            {o}
          </ChoiceButton>
        ))}
      </div>
    </StepShell>
  );
}
