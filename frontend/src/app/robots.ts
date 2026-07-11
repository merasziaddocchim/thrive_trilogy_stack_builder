import type { MetadataRoute } from 'next';

// app.thrivetrilogy.com gets its OWN robots.txt, submitted separately in GSC (TECH_DOCS §7).
// Interactive/post-auth routes are disallowed from indexing; marketing/methodology allowed.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/methodology'],
      // Interactive/post-auth routes and the internal design-system proof are not indexed.
      disallow: ['/assessment', '/report', '/design-system'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
