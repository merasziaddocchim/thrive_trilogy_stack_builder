'use client';
// Screen 5 — Priority (single-select). Copy per prompt §9. Subtext makes explicit this
// does NOT change evidence ratings or replace medical advice.
import { StepShell } from './StepShell';
import { ChoiceButton } from './Choice';
import type { AuditState } from './audit-state';
import { PRIORITY_OPTIONS } from '@/lib/goals';

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
        {/* The label is what the user reads; the tag travels with it so the payload can send
            the value the database actually matches on. Display order is unchanged. */}
        {PRIORITY_OPTIONS.map((o) => (
          <ChoiceButton
            key={o.label}
            selected={state.priority?.label === o.label}
            onClick={() => patch({ priority: { label: o.label, tag: o.tag } })}
          >
            {o.label}
          </ChoiceButton>
        ))}
      </div>
    </StepShell>
  );
}
