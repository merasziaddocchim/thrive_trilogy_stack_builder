'use client';
// Screen 3 — Fast Stack Capture. ONE free-text field (not a product database), an
// optional monthly-spend reveal, then an LLM extraction (mocked). Copy per prompt §9.
import { useState } from 'react';
import { z } from 'zod';
import { StepShell } from './StepShell';
import { Button } from '@/components/ui/primitives';
import { extractStack } from '@/lib/mock-api';
import { FIXTURE_RAW_STACK_INPUT } from '@/lib/fixtures';
import type { AuditState } from './audit-state';
import type { ExtractedItem } from '@/lib/types';

const PLACEHOLDER = `e.g.
NMN 250mg (sublingual) — about $45/mo
Tru Niagen 300mg
liposomal resveratrol, 1 scoop
TMG 1000
berberine 500mg twice a day`;

// Zod is the locked validator for this repo (prompt preamble) — used for all forms.
const schema = z.object({
  rawText: z.string().trim().min(3, 'Add at least one supplement to continue.'),
});

export function CaptureStep({
  state,
  patch,
  onExtracted,
}: {
  state: AuditState;
  patch: (p: Partial<AuditState>) => void;
  onExtracted: (items: ExtractedItem[]) => void;
}) {
  const [rawText, setRawText] = useState(state.rawText);
  const [showSpend, setShowSpend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const parsed = schema.safeParse({ rawText });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please add your stack.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      patch({ rawText });
      const items = await extractStack(rawText);
      onExtracted(items);
    } catch {
      setError('We couldn’t read that just now. Please try again.');
      setLoading(false);
    }
  }

  return (
    <StepShell
      step="Stack"
      title="What are you currently taking?"
      subtext="Add only what you remember. Supplements, compounds, brands, or doses — whatever you have."
    >
      <label htmlFor="stack" className="sr-only">
        Your current stack
      </label>
      <textarea
        id="stack"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="w-full resize-y rounded-lg border border-border bg-surface p-4 text-base text-headline placeholder:text-muted focus:border-accent"
      />
      {error && <p className="mt-2 text-sm font-600 text-stop">{error}</p>}

      <button
        onClick={() => setShowSpend((v) => !v)}
        className="mt-3 text-sm font-600 text-accent underline underline-offset-4"
      >
        {showSpend ? 'Hide monthly spend' : 'Add monthly supplement spend (optional)'}
      </button>
      {showSpend && (
        <p className="mt-2 rounded-md bg-surface-subtle p-3 text-sm text-muted">
          Adding an approximate monthly spend now lets your {`Preview`} show a {`Spend Efficiency
          Index`}. You can also add it later — we&apos;ll ask again on the Spend step.
        </p>
      )}

      {/* Dev affordance: prefill the demo input so the whole flow is walkable. Clearly a
          fixture, mirrors the real intake shape (prompt §10.7). */}
      <button
        onClick={() => setRawText(FIXTURE_RAW_STACK_INPUT)}
        className="mt-4 block text-xs text-muted underline underline-offset-2"
      >
        Use a sample stack (demo)
      </button>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleContinue} disabled={loading}>
          {loading ? 'Reading your entries…' : 'Continue'}
        </Button>
      </div>
    </StepShell>
  );
}
