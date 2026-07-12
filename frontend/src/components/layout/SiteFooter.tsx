import Link from 'next/link';
import { LEGAL_PAGES, REVIEWER } from '@/lib/constants';

// Footer nav scaffolds all 12 legal/utility routes (CLAIMS_COMPLIANCE §5a) plus the
// Methodology product page (TECH_DOCS §7). The footer's Affiliate Disclosure link does
// NOT replace per-link disclosure inside the Stack Report (prompt §3H, BRAND §7).
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-lavender">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-base font-700 text-headline">Thrive Trilogy</p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              An audit of the supplements you already take, measured against a human-reviewed
              research database.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="mb-3 text-xs font-700 uppercase tracking-[0.14em] text-muted">Product</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/assessment" className="text-body hover:text-headline">
                  Begin Stack Audit
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="text-body hover:text-headline">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/how-we-review" className="text-body hover:text-headline">
                  How We Review
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company" className="sm:col-span-2 lg:col-span-2">
            <p className="mb-3 text-xs font-700 uppercase tracking-[0.14em] text-muted">
              Legal &amp; Company
            </p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {LEGAL_PAGES.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="text-body hover:text-headline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted">
          <p>
            Reviewed by {REVIEWER.name}, {REVIEWER.credential}. This site is for informational
            purposes only and is not medical advice. Products we link to may earn a commission; this
            never affects your score or evidence ratings.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Thrive Trilogy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
