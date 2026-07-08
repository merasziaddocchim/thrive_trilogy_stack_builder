import type { MetadataRoute } from 'next';

// app.thrivetrilogy.com gets its OWN robots.txt, submitted separately in GSC (TECH_DOCS §7).
// Interactive/post-auth routes are disallowed from indexing; marketing/methodology allowed.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/methodology'],
      disallow: ['/assessment', '/report'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
