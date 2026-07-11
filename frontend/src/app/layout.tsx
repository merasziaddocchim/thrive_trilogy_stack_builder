import type { Metadata } from 'next';
import { Fraunces, Nunito } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { OrganizationSchema } from '@/components/seo/StructuredData';

// Typography (BRAND_GUIDELINES §4): bold high-contrast editorial serif for display +
// a warm rounded sans (distinctly rounder than Inter) for body/UI. Self-hosted via
// next/font — no external font request at runtime, keeps marketing pages fast (TECH §7).
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

// Organization schema is site-wide per TECH_DOCS §7 (E-E-A-T). Person + Article schema
// for the founder/methodology live on the methodology page, not here.
export const metadata: Metadata = {
  title: {
    default: 'Thrive Trilogy — Stack Optimizer',
    template: '%s — Thrive Trilogy',
  },
  description:
    'Audit the supplements you already take against reviewed research. See what is redundant, underdosed, and wasting money — before anything is required.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <OrganizationSchema />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
