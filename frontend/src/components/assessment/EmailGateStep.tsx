'use client';
// Screen 11 — Email capture gate. Sits between the Preview and the full Stack Report.
// Honest framing: the Preview was real; this unlocks the full Stop/Keep/Start report.
// Uses "Preview" (never "free trial"/"sample"). Zod-validated email (locked validator).
import { useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { StepShell } from './StepShell';
import { Button } from '@/components/ui/primitives';
import { TERMS } from '@/lib/constants';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

export function EmailGateStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email.');
      return;
    }
    setError(null);
    setSubmitting(true);
    // Mock: no real capture. Real flow would POST then route to the returned report id.
    router.push('/report/demo');
  }

  return (
    <StepShell
      step="Preview"
      title={`Where should we send your ${TERMS.report}?`}
      subtext="Your Preview was the real thing. Enter your email to open the full Stop / Keep / Start report, with every finding sourced and tiered."
      hideProgress
      onBack={onBack}
    >
      <label htmlFor="email" className="text-sm font-600 text-body">
        Email address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-1 min-h-[48px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-headline focus:border-accent"
      />
      {error && <p className="mt-2 text-sm font-600 text-stop">{error}</p>}

      <Button onClick={submit} disabled={submitting} full className="mt-5">
        {submitting ? 'Opening your report…' : `Open my ${TERMS.report}`}
      </Button>

      <p className="mt-4 text-xs text-muted">
        We use your email to send your report and occasional updates. See our Privacy Policy. This
        report is informational and is not a substitute for professional medical advice.
      </p>
    </StepShell>
  );
}
