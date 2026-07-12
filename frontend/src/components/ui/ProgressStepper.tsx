// Neutral, non-clinical progress indicator across the context screens (prompt §9):
// "Stack → Confirm → Priority → Routine → Spend → Safety → Preview".
import { JOURNEY_STEPS, type JourneyStep } from '@/lib/constants';

export function ProgressStepper({ current }: { current: JourneyStep }) {
  const currentIndex = JOURNEY_STEPS.indexOf(current);
  return (
    <nav aria-label="Audit progress" className="mb-8">
      {/* Full labelled trail on wider screens */}
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:flex">
        {JOURNEY_STEPS.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={
                  state === 'current'
                    ? 'font-700 text-accent'
                    : state === 'done'
                      ? 'font-600 text-body'
                      : 'text-muted'
                }
              >
                {step}
              </span>
              {i < JOURNEY_STEPS.length - 1 && <span className="text-border" aria-hidden>→</span>}
            </li>
          );
        })}
      </ol>
      {/* Compact "Step n of m" + fill bar on mobile */}
      <div className="sm:hidden">
        <p className="mb-2 text-sm font-600 text-body">
          {current} · Step {currentIndex + 1} of {JOURNEY_STEPS.length}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-subtle">
          <div
            className="h-full rounded-pill bg-accent transition-all"
            style={{ width: `${((currentIndex + 1) / JOURNEY_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
