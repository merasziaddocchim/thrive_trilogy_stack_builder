import Link from 'next/link';
import { Button } from '@/components/ui/primitives';
import { TERMS } from '@/lib/constants';

// Wordmark in the editorial serif (BRAND §4). Minimal, static, backend-independent.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-lg font-700 tracking-tight text-headline">
          Thrive Trilogy
          <span className="ml-2 align-middle text-xs font-600 uppercase tracking-[0.16em] text-muted">
            Stack Optimizer
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/methodology" className="hidden font-600 text-body hover:text-headline sm:inline">
            How we review
          </Link>
          <Button href="/assessment" className="!min-h-0 !px-4 !py-2 text-sm">
            {TERMS.cta}
          </Button>
        </nav>
      </div>
    </header>
  );
}
