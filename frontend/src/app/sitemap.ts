import type { MetadataRoute } from 'next';
import { LEGAL_PAGES } from '@/lib/constants';

// Own sitemap for the app subdomain (TECH_DOCS §7). Only indexable marketing/methodology/
// legal pages are listed — not the interactive/post-auth routes.

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com';
  return [
    { url: `${site}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/methodology`, changeFrequency: 'monthly', priority: 0.8 },
    // The 12 legal/utility pages are static and indexable (TECH_DOCS §7).
    ...LEGAL_PAGES.map((p) => ({
      url: `${site}/${p.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}
