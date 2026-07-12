// Visible notice shown anywhere the UI renders mock/fixture data (scores, findings,
// evidence tiers). Until the scoring engine + intake-parser are wired in (mock-api.ts),
// nothing here is a real result — this banner makes that unmistakable so no figure can be
// mistaken for a genuine finding.
import { IconAlert } from '@/components/ui/Icon';

export function SampleDataBanner({ className = '' }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-lg border border-tier-c bg-tier-c-soft p-3 text-sm ${className}`}
    >
      <span className="mt-0.5 shrink-0 text-tier-c">
        <IconAlert className="h-5 w-5" />
      </span>
      <p className="text-tier-c">
        <span className="font-700">Preview build — sample data, not a real result.</span> The
        scores, findings, and evidence tiers below are placeholders shown for demonstration. They
        become real once your stack is scored against the research database.
      </p>
    </div>
  );
}
