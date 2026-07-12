'use client';
// Screen 7 — Spend. Approximate monthly spend (range acceptable) + one audit-focus choice
// (prompt §9). Capturing spend here is what flips the Preview from State B → State A (§5),
// so the copy frames it as the unlock, not a demand.
import { useState } from 'react';
import { StepShell } from './StepShell';
import { ChoiceButton } from './Choice';
import type { AuditState } from './audit-state';

// Range buckets keep this a tap, not a typed number (prompt §8).
const SPEND_BANDS: Array<{ label: string; low: number; high: number }> = [
  { label: 'Under $25 / month', low: 0, high: 25 },
  { label: '$25–$60 / month', low: 25, high: 60 },
  { label: '$60–$120 / month', low: 60, high: 120 },
  { label: '$120–$250 / month', low: 120, high: 250 },
  { label: 'Over $250 / month', low: 250, high: 400 },
];

const FOCUS = ['Reduce waste', 'Simplify my stack', 'Strengthen evidence', 'Understand dosage'];

export function SpendStep({
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
  const [bandLabel, setBandLabel] = useState<string | null>(
    SPEND_BANDS.find((b) => b.low === state.spend?.low)?.label ?? null,
  );

  return (
    <StepShell
      step="Spend"
      title="Roughly how much do you spend on supplements each month?"
      subtext="An approximate range is fine. This is what unlocks your Spend Efficiency Index and Estimated Annual Waste."
      onBack={onBack}
      onContinue={onContinue}
      continueDisabled={!state.auditFocus}
    >
      <div className="space-y-2.5">
        {SPEND_BANDS.map((b) => (
          <ChoiceButton
            key={b.label}
            selected={bandLabel === b.label}
            onClick={() => {
              setBandLabel(b.label);
              patch({ spend: { low: b.low, high: b.high } });
            }}
          >
            {b.label}
          </ChoiceButton>
        ))}
      </div>

      <p className="mt-8 mb-3 font-700 text-headline">What matters most right now?</p>
      <div className="space-y-2.5">
        {FOCUS.map((f) => (
          <ChoiceButton key={f} selected={state.auditFocus === f} onClick={() => patch({ auditFocus: f })}>
            {f}
          </ChoiceButton>
        ))}
      </div>
    </StepShell>
  );
}
