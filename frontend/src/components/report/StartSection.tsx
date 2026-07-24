'use client';
// Affiliate "Start" surface, rendered from the firewalled affiliate-engine's start_section
// (backend selects products; this is a pure renderer). Three visually + textually distinct tiers:
//   Tier 1 "Start"                — evidence-reviewed compounds in the stack, with tier badge.
//   Tier 2 "Also available"       — NOT evidence-scored, no badge, explicitly flagged as such.
//   Tier 3 "Bundles worth considering" — only when the stack overlaps a bundle's contents.
// EVERY product link is an affiliate link, so EVERY link carries its OWN adjacent disclosure in
// the same body size/font (CLAIMS_COMPLIANCE §6 four-factor test; BRAND §7) and rel="sponsored
// nofollow". The evidence tier badge reflects the COMPOUND, never the product/brand.
// Roundup ARTICLE links (thrivetrilogy.com "Best X" posts + single-brand reviews) also render
// here and ONLY here — CLAIMS_COMPLIANCE §6 extension treats them as affiliate-adjacent, so
// they are Start-section-only with per-link disclosure. They are NOT paid links themselves, so
// they carry no rel="sponsored"; they DO leave this subdomain, so they open in a new tab with
// rel="noopener noreferrer".
import type { ArticleGroup, StartProduct, StartSectionData } from '@/lib/types';
import { TierBadge } from '@/components/ui/EvidenceTier';
import { AffiliateDisclosure, ContentLinkDisclosure } from './AffiliateDisclosure';

// One affiliate product line: "Brand — Product" link + its own inline disclosure.
function ProductLink({ item, suffix }: { item: StartProduct; suffix?: string }) {
  return (
    <li className="text-sm">
      <a
        href={item.href}
        rel="sponsored nofollow"
        className="font-600 text-accent underline underline-offset-4"
      >
        {item.brand} — {item.product}
      </a>
      {suffix && <span className="text-muted"> · {suffix}</span>}
      <AffiliateDisclosure />
    </li>
  );
}

// One roundup-article line: title link + its own inline disclosure. No rel="sponsored" (not a
// paid link); opens in a new tab because it leaves app.thrivetrilogy.com for the blog.
function RoundupLink({ title, href }: { title: string; href: string }) {
  return (
    <li className="text-sm">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-600 text-accent underline underline-offset-4"
      >
        {title}
      </a>
      <ContentLinkDisclosure />
    </li>
  );
}

export function StartSection({
  section,
  roundups = [],
}: {
  section: StartSectionData;
  /** Per-compound roundup articles. Start-section-only by compliance rule (CLAIMS §6). */
  roundups?: ArticleGroup[];
}) {
  const { tier1, tier2, tier3 } = section;
  const nothing =
    tier1.length === 0 && tier2.length === 0 && tier3.length === 0 && roundups.length === 0;
  if (nothing) return null;

  return (
    <div className="mt-4 space-y-4">
      {/* TIER 1 — the branded "Start" section, evidence-tier badges present. */}
      {tier1.length > 0 && (
        <section className="rounded-lg border border-border border-l-4 border-l-start bg-surface p-4">
          <div className="flex items-center gap-2">
            <h3 className="rounded-pill bg-start-soft px-2.5 py-1 text-sm font-700 text-start">Start</h3>
            <p className="text-sm text-muted">
              Where to get the compounds in your report. The Evidence Tier reflects the compound,
              not any specific product or brand — brands are listed equally, in no order.
            </p>
          </div>
          <div className="mt-3 space-y-3">
            {tier1.map((g) => (
              <div key={g.compound_id} className="rounded-lg border border-border bg-surface-subtle p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-700 text-headline">{g.compound}</span>
                  <TierBadge tier={g.evidence_tier} />
                </div>
                <ul className="mt-2 space-y-1.5">
                  {g.products.map((p) => (
                    <ProductLink key={p.href} item={p} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TIER 2 — "Also available": deliberately distinct (no left-accent, no badges) and honest
          that these have NOT been evidence-scored. */}
      {tier2.length > 0 && (
        <section className="rounded-lg border border-dashed border-border bg-surface-subtle p-4">
          <h3 className="text-sm font-700 text-headline">Also available</h3>
          <p className="mt-1 text-sm text-muted">
            These have not been evidence-scored and carry no Evidence Tier — they haven’t been
            through the same review as the compounds above. Listed for convenience, not as a graded
            recommendation.
          </p>
          <ul className="mt-3 space-y-1.5">
            {tier2.map((i) => (
              <ProductLink key={i.href} item={i} suffix={i.category} />
            ))}
          </ul>
        </section>
      )}

      {/* ROUNDUP ARTICLES — grouped per compound, Start-section-only (CLAIMS §6 extension).
          Visually separated from the product tiers because these are reading, not products:
          no tier badges (an article isn't evidence-scored) and no purchase framing. A
          dual-tagged roundup appears under each compound it covers — see article-engine. */}
      {roundups.length > 0 && (
        <section className="rounded-lg border border-dashed border-border bg-surface-subtle p-4">
          <h3 className="text-sm font-700 text-headline">Product guides from our blog</h3>
          <p className="mt-1 text-sm text-muted">
            Our own reviews and comparisons for the compounds in your report. These rank specific
            products and earn commission, so they live here rather than in your findings — your
            score and Evidence Tiers are calculated independently of them.
          </p>
          <div className="mt-3 space-y-3">
            {roundups.map((g) => (
              <div key={g.compound_id}>
                <span className="text-sm font-700 text-headline">{g.compound}</span>
                <ul className="mt-1.5 space-y-1.5">
                  {g.articles.map((a) => (
                    <RoundupLink key={a.href} title={a.title} href={a.href} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TIER 3 — bundles, only present when relevant to the stack. Not evidence-scored; the
          contents are stated so the user can judge relevance themselves. */}
      {tier3.length > 0 && (
        <section className="rounded-lg border border-dashed border-border bg-surface-subtle p-4">
          <h3 className="text-sm font-700 text-headline">Bundles worth considering</h3>
          <p className="mt-1 text-sm text-muted">
            Shown because your stack overlaps what these contain. A bundle isn’t itself
            evidence-scored, so it carries no Evidence Tier — check the contents against your goals.
          </p>
          <ul className="mt-3 space-y-1.5">
            {tier3.map((b) => (
              <li key={b.href} className="text-sm">
                <a
                  href={b.href}
                  rel="sponsored nofollow"
                  className="font-600 text-accent underline underline-offset-4"
                >
                  {b.brand} — {b.product}
                </a>
                <span className="text-muted"> · Contains: {b.contains}</span>
                <AffiliateDisclosure />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
