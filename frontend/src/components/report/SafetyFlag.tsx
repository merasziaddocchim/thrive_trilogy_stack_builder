// Separate, prominent safety flag — NEVER buried inside the score number (TECH_DOCS §2
// Safety Modifier; CLAIMS_COMPLIANCE §11). Only rendered when the report carries a flag.
// Defers to "consult a clinician" language, never a specific recommendation.
import { IconShield } from '@/components/ui/Icon';

export function SafetyFlag() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-stop bg-stop-soft p-4"
    >
      <span className="mt-0.5 shrink-0 text-stop">
        <IconShield className="h-5 w-5" />
      </span>
      <div>
        <p className="font-700 text-headline">A combination in your stack may warrant review</p>
        <p className="mt-1 text-sm text-body">
          One or more items here can act on related pathways. This report stays informational — a
          conversation with a qualified clinician may be appropriate before making changes.
        </p>
      </div>
    </div>
  );
}
