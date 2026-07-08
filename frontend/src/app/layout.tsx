import type { Metadata } from 'next';
import './globals.css';

// Organization schema is site-wide per TECH_DOCS §7 (E-E-A-T). Person schema for the
// founder lives on methodology/authorship pages, not here.
export const metadata: Metadata = {
  title: {
    default: 'Thrive Trilogy — Stack Optimizer',
    template: '%s — Thrive Trilogy',
  },
  description:
    'Audit your supplement stack against reviewed research. See what is redundant, underdosed, and wasting money.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.thrivetrilogy.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
