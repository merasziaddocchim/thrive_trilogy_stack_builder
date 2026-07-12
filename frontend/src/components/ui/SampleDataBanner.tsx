// Visible notice shown when the UI is rendering fixture/sample data (scores, findings,
// evidence tiers) — i.e. when lib/data.ts fell back to fixtures because the live backend was
// unreachable or the evidence DB is unseeded. It makes the placeholder state unmistakable so
// no figure can be mistaken for a genuine finding. Rendered conditionally on `isSample`.
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
