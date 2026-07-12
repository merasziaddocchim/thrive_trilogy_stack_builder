'use client';
// Screen 8 — Safety gate. Calm, non-alarmist. Yes / No / Prefer not to say (always
// available). We do NOT collect medication names or diagnosis details in V1 (prompt §8,
// §9) — accepted scope limit, not a bug. On "yes", show the reassuring, informational
// message and defer to "consult a clinician" language (CLAIMS_COMPLIANCE §11).
import { StepShell } from './StepShell';
import { ChoiceButton } from './Choice';
import type { AuditState } from './audit-state';

const OPTIONS: Array<{ value: AuditState['safety']; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export function SafetyStep({
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
      step="Safety"
      title="One last question before your Preview"
      subtext="Do you take a medication, or have a condition that could affect supplement safety? We don't ask which one — this only helps us flag when a clinician conversation may be worth having."
      onBack={onBack}
      onContinue={onContinue}
      continueDisabled={!state.safety}
      continueLabel="See my Preview"
    >
      <div className="space-y-2.5">
        {OPTIONS.map((o) => (
          <ChoiceButton
            key={o.value}
            selected={state.safety === o.value}
            onClick={() => patch({ safety: o.value })}
          >
            {o.label}
          </ChoiceButton>
        ))}
      </div>

      {state.safety === 'yes' && (
        <div className="mt-5 rounded-lg border border-border bg-surface-subtle p-4 text-sm text-body">
          Some supplement combinations can warrant individualized clinical review. Your report will
          remain informational and will highlight when a conversation with a qualified clinician may
          be appropriate.
        </div>
      )}
    </StepShell>
  );
}
