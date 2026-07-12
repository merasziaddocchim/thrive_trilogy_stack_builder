import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LEGAL_PAGES, REVIEWER } from '@/lib/constants';
import { LEGAL_CONTENT, type LegalBlock } from '@/lib/legal-content';

// The 12 legal/utility routes required by CLAIMS_COMPLIANCE §5a. Copy is adapted (not
// copied verbatim) from the root site for what THIS app collects — see lib/legal-content.ts.
// SSG, backend-independent (TECH_DOCS §7). dynamicParams=false → only these 12 slugs render.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

function pageFor(slug: string) {
  return LEGAL_PAGES.find((p) => p.slug === slug) ?? null;
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = pageFor(params.slug);
  return { title: page?.title ?? 'Not found', alternates: { canonical: `/${params.slug}` } };
}

function Block({ block }: { block: LegalBlock }) {
  return (
    <div className="mt-8">
      {block.heading && <h2 className="text-lg font-700 text-headline">{block.heading}</h2>}
      {block.paragraphs?.map((p, i) => (
        <p key={i} className="mt-3 text-body">
          {p}
        </p>
      ))}
      {block.bullets && (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-body">
          {block.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {block.note && (
        // Founder-review flag — visibly marked so it is never mistaken for final copy.
        <p className="mt-4 rounded-lg border border-tier-c bg-tier-c-soft p-3 text-sm text-tier-c">
          <span className="font-700">Flagged for review: </span>
          {block.note}
        </p>
      )}
    </div>
  );
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = pageFor(params.slug);
  if (!page) notFound();
  const doc = LEGAL_CONTENT[params.slug];

  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <p className="text-sm font-600 text-muted">
        <Link href="/" className="text-accent underline underline-offset-4">
          Home
        </Link>{' '}
        / {page.title}
      </p>
      <h1 className="mt-4 text-2xl font-700 text-headline">{page.title}</h1>

      {/* Draft banner — this is engineering draft copy, not final legal text. */}
      <div className="mt-4 rounded-lg border border-border bg-surface-subtle p-4 text-sm text-body">
        <span className="font-700 text-headline">Draft for founder review.</span> This copy was
        adapted from thrivetrilogy.com for what this app actually collects and does
        (CLAIMS_COMPLIANCE §5a). It is not final legal text and has not been reviewed by an
        attorney. Sections flagged in amber need specific facts confirmed before launch.
      </div>

      {doc ? (
        <>
          <p className="mt-8 text-lg text-body">{doc.intro}</p>
          {doc.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </>
      ) : (
        <p className="mt-8 text-body">
          Content for this page is being adapted from thrivetrilogy.com.
        </p>
      )}

      <p className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Last reviewed {REVIEWER.lastReviewed} by {REVIEWER.name}, {REVIEWER.credential}. Questions?
        See our{' '}
        <Link href="/contact" className="text-accent underline underline-offset-4">
          Contact
        </Link>{' '}
        page.
      </p>
    </main>
  );
}
