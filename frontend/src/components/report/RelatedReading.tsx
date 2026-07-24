// Related reading — EDUCATIONAL articles only, grouped per compound, plus the general research
// hubs. Educational content explains a mechanism, dose, or delivery format and recommends no
// purchasable product, so it is functionally a citation: linkable anywhere in the Report with
// NO disclosure (CLAIMS_COMPLIANCE §6 extension; BRAND_GUIDELINES §8 — "plain further-reading
// links, same tone as any other citation").
//
// Two rules this component exists to hold:
//   1. No roundup or single-brand review may render here — those are Start-section-only. The
//      backend never puts one in `related_reading`, and nothing here bypasses that.
//   2. Hub pages render as a GENERAL block, never inside a per-compound group (task §6) — they
//      are pillar pages covering multiple compounds, so slotting them under one would misstate
//      what they are.
// Links leave app.thrivetrilogy.com for the blog, so they open in a new tab.
import type { ArticleGroup, HubPage } from '@/lib/types';

function BlogLink({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-4"
    >
      {title}
    </a>
  );
}

export function RelatedReading({
  groups,
  hubs,
}: {
  groups: ArticleGroup[];
  hubs: HubPage[];
}) {
  if (groups.length === 0 && hubs.length === 0) return null;

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-700 text-headline">Related reading</h3>
      <p className="mt-1 text-sm text-muted">
        Mechanism, dosing, and delivery explainers from our research library. These recommend no
        product — they are background for the findings above.
      </p>

      {groups.length > 0 && (
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <div key={g.compound_id}>
              <span className="text-sm font-700 text-headline">{g.compound}</span>
              <ul className="mt-1.5 space-y-1.5">
                {g.articles.map((a) => (
                  <li key={a.href} className="text-sm">
                    <BlogLink title={a.title} href={a.href} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* General hubs — deliberately outside the per-compound groups above. */}
      {hubs.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <span className="text-sm font-700 text-headline">Research hubs</span>
          <ul className="mt-1.5 space-y-1.5">
            {hubs.map((h) => (
              <li key={h.href} className="text-sm">
                <BlogLink title={h.title} href={h.href} />
                <span className="text-muted"> · {h.relevance}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
