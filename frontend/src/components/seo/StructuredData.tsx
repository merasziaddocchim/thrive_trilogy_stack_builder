// JSON-LD structured data for E-E-A-T / YMYL search ranking (TECH_DOCS §7, §8;
// CLAIMS_COMPLIANCE §2). This is invisible markup, not visual design — it is in
// ADDITION to the visible Author Credential block (prompt §3F / §8).
import { REVIEWER } from '@/lib/constants';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization schema — site-wide (rendered in root layout). */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Thrive Trilogy',
        url: SITE,
        description:
          'Evidence-tiered audit of the supplements you already take, against a human-reviewed research database.',
        founder: { '@type': 'Person', name: REVIEWER.name },
      }}
    />
  );
}

/** Person schema — methodology / authorship pages only (direct E-E-A-T signal). */
export function PersonSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: REVIEWER.name,
        jobTitle: 'Founder & Reviewer',
        hasCredential: REVIEWER.credential,
        affiliation: { '@type': 'Organization', name: 'Thrive Trilogy' },
      }}
    />
  );
}

/** Article schema — long-form methodology content only. */
export function ArticleSchema({
  headline,
  description,
  slug,
}: {
  headline: string;
  description: string;
  slug: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        author: { '@type': 'Person', name: REVIEWER.name },
        publisher: { '@type': 'Organization', name: 'Thrive Trilogy' },
        dateModified: REVIEWER.lastReviewed,
        mainEntityOfPage: `${SITE}${slug}`,
      }}
    />
  );
}
