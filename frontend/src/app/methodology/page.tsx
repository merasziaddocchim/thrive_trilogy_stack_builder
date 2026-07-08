import type { Metadata } from 'next';

// Methodology page: YMYL/E-E-A-T critical (TECH_DOCS §7, CLAIMS_COMPLIANCE §2).
// SSG/ISR, must carry named credentialed author + last-reviewed date + Person schema.
export const metadata: Metadata = {
  title: 'How we review the research',
  description: 'Our evidence review pipeline, scoring methodology, and evidence tiers.',
  alternates: { canonical: '/methodology' },
};

// ISR: periodically regenerate without a live backend dependency.
export const revalidate = 3600;

export default function MethodologyPage() {
  // Person schema for the founder (E-E-A-T signal, TECH_DOCS §7). Author details are
  // placeholders - confirm exact credential string with the owner before launch.
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ziad Meras',
    jobTitle: 'Founder',
    affiliation: { '@type': 'Organization', name: 'Thrive Trilogy' },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <h1 className="text-3xl font-bold">How we review the research</h1>
      <p className="mt-2 text-sm">Last reviewed by Ziad Meras — {/* date stub */}…</p>

      {/* Section stubs only - real methodology copy drawn from the docs during build. */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Evidence Tiers (A / B / C / D)</h2>
        <p className="mt-2">{/* Stub: describe tier derivation (TECH_DOCS §1). */}</p>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Review pipeline</h2>
        <p className="mt-2">{/* Stub: AI extraction → human review gate (TECH_DOCS §3). */}</p>
      </section>
    </main>
  );
}
