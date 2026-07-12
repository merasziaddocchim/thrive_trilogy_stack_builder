import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LEGAL_PAGES, REVIEWER } from '@/lib/constants';

// The 12 legal/utility routes required by CLAIMS_COMPLIANCE §5a. Routing + footer links
// must EXIST now; the actual legal copy is written later, adapted from the root site (NOT
// copied verbatim — the app collects different data than the blog). SSG, backend-independent
// (TECH_DOCS §7). dynamicParams=false → only these 12 slugs render; anything else 404s.
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

// A few pages carry an app-specific compliance note now (CLAIMS_COMPLIANCE §5a) so the
// placeholder already signals what the finished copy must cover.
const NOTES: Record<string, string> = {
  'affiliate-disclosure':
    'This page will cover the per-link disclosures used inside the Stack Report’s Start section, and the firewall between your Spend Efficiency Index and any affiliate relationship.',
  'privacy-policy':
    'This page will disclose the stack and health-adjacent inputs the assessment collects (goals, budget, current supplements) — materially different from the blog, so it is adapted, not copied.',
  terms:
    'This page will reflect the tool’s actual function — an informational comparison/audit tool, not medical advice.',
  disclaimer:
    'This report compares your stack against published research and is for informational purposes only. It is not medical advice, has not been evaluated by the FDA, and is not intended to diagnose, treat, cure, or prevent any disease.',
};

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = pageFor(params.slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <p className="text-sm font-600 text-muted">
        <Link href="/" className="text-accent underline underline-offset-4">
          Home
        </Link>{' '}
        / {page.title}
      </p>
      <h1 className="mt-4 text-2xl font-700 text-headline">{page.title}</h1>

      <p className="mt-6 text-body">
        {NOTES[params.slug] ??
          `This is the ${page.title} page for the Thrive Trilogy Stack Optimizer. The full text is being adapted from thrivetrilogy.com for the app’s specific data and function.`}
      </p>

      <div className="mt-8 rounded-lg border border-border bg-surface-subtle p-4 text-sm text-muted">
        Placeholder page — routing and footer links are in place; final copy is pending review
        (CLAIMS_COMPLIANCE §5a). Last reviewed {REVIEWER.lastReviewed} by {REVIEWER.name}.
      </div>
    </main>
  );
}
