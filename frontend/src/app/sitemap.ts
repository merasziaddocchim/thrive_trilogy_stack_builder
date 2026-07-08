import type { MetadataRoute } from 'next';

// Own sitemap for the app subdomain (TECH_DOCS §7). Only indexable marketing/methodology
// pages are listed - not the interactive/post-auth routes.
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com';
  return [
    { url: `${site}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/methodology`, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
