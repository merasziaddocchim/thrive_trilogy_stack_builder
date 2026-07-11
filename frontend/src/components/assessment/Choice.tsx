'use client';
// Large single-select option control — big tap targets over free text where the schema
// allows (prompt §8). Used across the context screens.
import type { ReactNode } from 'react';

export function ChoiceButton({
  selected,
  onClick,
  children,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-accent bg-accent-soft text-headline'
          : 'border-border bg-surface text-body hover:border-accent'
      }`}
    >
      <span className="font-600">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      <span
        aria-hidden
        className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-accent bg-accent' : 'border-border'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-surface" />}
      </span>
    </button>
  );
}

export function SkipLink({ onClick, label = 'Skip for now' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 min-h-[44px] text-sm font-600 text-muted underline underline-offset-4 hover:text-body"
    >
      {label}
    </button>
  );
}
