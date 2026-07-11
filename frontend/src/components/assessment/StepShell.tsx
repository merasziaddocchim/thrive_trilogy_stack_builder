// Layout wrapper shared by every context screen: progress stepper, one-column flow,
// heading + subtext, and a sticky action bar. Mobile-first, ≥44px targets (prompt §8).
import type { ReactNode } from 'react';
import { ProgressStepper } from '@/components/ui/ProgressStepper';
import { Button } from '@/components/ui/primitives';
import type { JourneyStep } from '@/lib/constants';

export function StepShell({
  step,
  title,
  subtext,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  hideProgress,
  footnote,
}: {
  step: JourneyStep;
  title: string;
  subtext?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  hideProgress?: boolean;
  footnote?: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-[70vh] max-w-xl px-4 py-8 sm:py-12">
      {!hideProgress && <ProgressStepper current={step} />}
      {/* Web-app heading capped at --text-xl (24–36px) — no hero display type (prompt §7). */}
      <h1 className="text-xl font-700 text-headline">{title}</h1>
      {subtext && <p className="mt-2 text-body">{subtext}</p>}

      <div className="mt-6">{children}</div>

      {footnote && <div className="mt-6">{footnote}</div>}

      {(onBack || onContinue) && (
        <div className="mt-10 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="min-h-[44px] px-2 text-sm font-600 text-muted hover:text-body"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {onContinue && (
            <Button onClick={onContinue} disabled={continueDisabled}>
              {continueLabel}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
