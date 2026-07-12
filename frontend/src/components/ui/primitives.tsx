// Shared UI primitives. Kept in one file so the design-system surface is easy to scan.
// All interactive targets are ≥44px (prompt §8 mobile touch-target rule).
import Link from 'next/link';
import type { ReactNode } from 'react';

// ---- Button / CTA -----------------------------------------------------------
type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  full?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  // Solid accent — NO gradient buttons (BRAND §4 avoid-list).
  primary: 'bg-accent text-accent-contrast hover:bg-accent-hover shadow-soft',
  secondary: 'bg-surface text-headline border border-border hover:border-accent',
  ghost: 'bg-accent-soft text-accent hover:text-accent-hover',
  // "quiet, text-link weight" secondary CTA (prompt §3A).
  quiet: 'bg-transparent text-accent underline underline-offset-4 hover:text-accent-hover',
};

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  full,
}: ButtonProps) {
  const cls = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill px-6 py-3 text-base font-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    VARIANTS[variant]
  } ${full ? 'w-full' : ''} ${variant === 'quiet' ? 'px-1 py-2 font-600' : ''} ${className}`;
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

// ---- Card -------------------------------------------------------------------
// White surface, thin gray-blue border, generous radius, minimal shadow (BRAND §4).
// NO colored side-borders as generic decoration (avoid-list) — accent left-borders are
// only used deliberately for Stop/Keep/Start wayfinding, handled in the report itself.
export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={`rounded-lg border border-border bg-surface p-6 ${className}`}>{children}</Tag>
  );
}

// ---- IconCircle -------------------------------------------------------------
// Line icon inside a soft blue circular container (BRAND §4). Used sparingly, NOT as
// generic section decoration on every block (avoid-list).
export function IconCircle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent ${className}`}
    >
      {children}
    </span>
  );
}

// ---- Eyebrow / section label ------------------------------------------------
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-sm font-700 uppercase tracking-[0.14em] text-accent">{children}</p>
  );
}

// ---- Illustrative / fixture badge -------------------------------------------
// Marks any placeholder/illustrative content so it is never mistaken for a real result
// (prompt §3C: illustrative findings must be labelled; §10.7: fixtures clearly marked).
export function FixtureTag({ label = 'Illustrative example' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-subtle px-2.5 py-1 text-xs font-600 text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" aria-hidden />
      {label}
    </span>
  );
}
