'use client';
// Homepage FAQ accordion — accessible expand/collapse for the curated HOMEPAGE_FAQ subset.
// Design language matches the report's ExpandableRow (rounded card, border-border, bg-surface).
// Accessibility: each question is a real <button> inside an <h3> (native Enter/Space + focus),
// with aria-expanded and aria-controls wired to the answer panel; the answer is a role="region"
// labelled by its question. Answers stay in the DOM (toggled via `hidden`) so the static HTML
// carries the full text — matching the FAQPage JSON-LD and readable without JS.
import { useState } from 'react';
import Link from 'next/link';
import { HOMEPAGE_FAQ } from '@/lib/faq';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

function FaqRow({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const buttonId = `faq-q-${index}`;
  const panelId = `faq-a-${index}`;
  return (
    <li className="rounded-lg border border-border bg-surface">
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="font-700 text-headline">{q}</span>
          <ChevronIcon open={open} />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <p className="border-t border-border px-4 py-3 text-body">{a}</p>
      </div>
    </li>
  );
}

export function FaqSection() {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-700 text-headline">Frequently asked questions</h2>
        <Link
          href="/faq"
          className="font-600 text-accent underline underline-offset-4 hover:text-accent-hover"
        >
          Read the full FAQ
        </Link>
      </div>
      <ul className="mt-6 space-y-3">
        {HOMEPAGE_FAQ.map((item, i) => (
          <FaqRow key={item.q} q={item.q} a={item.a} index={i} />
        ))}
      </ul>
    </>
  );
}
