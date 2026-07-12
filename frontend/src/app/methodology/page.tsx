import type { Metadata } from 'next';
import { PersonSchema, ArticleSchema } from '@/components/seo/StructuredData';
import { TierBadge } from '@/components/ui/EvidenceTier';
import { TERMS, TIER_META, EVIDENCE_TIER_CEILINGS, REVIEWER } from '@/lib/constants';
import type { EvidenceTier } from '@/lib/types';

// Methodology page: YMYL/E-E-A-T critical (TECH_DOCS §7, CLAIMS_COMPLIANCE §2). SSG/ISR,
// no live backend dependency. Carries a named credentialed author, a last-reviewed date,
// and Person + Article JSON-LD (in addition to the visible author block below).
export const metadata: Metadata = {
  title: 'How we review the research',
  description:
    'Our evidence review pipeline, the A–D evidence tiers, how the Spend Efficiency Index is bounded by evidence, and why the score is independent of affiliate relationships.',
  alternates: { canonical: '/methodology' },
};

export const revalidate = 3600; // ISR — regenerate without a live backend dependency.

const TIERS: EvidenceTier[] = ['A', 'B', 'C', 'D'];

const TIER_DEF: Record<EvidenceTier, string> = {
  A: '≥1 meta-analysis or ≥2 independent human RCTs, adequate combined sample, relevant population.',
  B: 'A single human RCT, or multiple consistent cohort studies.',
  C: 'Observational/cohort only, or animal studies with mechanistic plausibility.',
  D: 'In-vitro or animal-only evidence, or a single small human study.',
};

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <PersonSchema />
      <ArticleSchema
        headline="How we review the research"
        description="Evidence review pipeline, A–D tiers, and score independence."
        slug="/methodology"
      />

      <p className="text-sm font-700 uppercase tracking-[0.14em] text-accent">Methodology</p>
      <h1 className="mt-2 text-2xl font-700 text-headline">How we review the research</h1>
      <p className="mt-3 text-body">
        Every number in a {TERMS.report} traces back to a primary source that a credentialed human
        reviewed. Here is exactly how evidence gets in, how it is graded, and why the score cannot
        be bought.
      </p>

      {/* Visible author/credential block (BRAND §9) — separate from the JSON-LD above. */}
      <div className="mt-6 flex items-center gap-4 rounded-lg border border-border bg-surface-subtle p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-700 text-accent">
          ZM
        </span>
        <div>
          <p className="font-700 text-headline">
            {REVIEWER.name}, {REVIEWER.credential}
          </p>
          <p className="text-sm text-muted">Founder &amp; reviewer · Last reviewed {REVIEWER.lastReviewed}</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-700 text-headline">The review pipeline</h2>
        <ol className="mt-4 space-y-3">
          {[
            'Papers are entered into a source registry — one record per study, before anything is extracted.',
            'AI extracts dose ranges, bioavailability, and interaction data from the source text. At this stage it is never used in scoring.',
            'A credentialed reviewer checks each extracted record against the primary source, corrects errors, and marks it human-reviewed. Only reviewed records feed the score.',
            'When enough reviewed records exist for a compound, a scoring parameter (range + evidence tier) is generated and confirmed by the reviewer.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-700 text-accent">
                {i + 1}
              </span>
              <span className="text-body">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          This report was generated using AI, based on our reviewed research database, and is not a
          substitute for professional medical advice. AI is also used to read your free-text stack
          entry and match it to compounds — you confirm those matches before anything is scored.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-700 text-headline">Evidence Tiers (A / B / C / D)</h2>
        <p className="mt-3 text-body">
          Every compound-level finding shows its Evidence Tier. The tier is derived mechanically
          from the underlying studies, so it is auditable rather than a judgment call.
        </p>
        <ul className="mt-4 space-y-3">
          {TIERS.map((t) => (
            <li key={t} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <TierBadge tier={t} />
                <span className="font-700 text-headline">{TIER_META[t].label}</span>
              </div>
              <p className="mt-2 text-sm text-body">{TIER_DEF[t]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-700 text-headline">How evidence bounds the score</h2>
        <p className="mt-3 text-body">
          The {TERMS.sei} is capped by evidence tier: strong dosing on a weakly-evidenced compound
          cannot produce a high score. The ceilings below are provisional and pending review.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <TierBadge tier={t} />
              <span className="nums-tabular font-700 text-headline">
                ≤ {EVIDENCE_TIER_CEILINGS[t]}
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-700 text-headline">Why the score is independent</h2>
        <p className="mt-3 rounded-lg border-l-4 border-accent bg-accent-soft p-4 font-600 text-headline">
          Your {TERMS.sei} is calculated independently of any affiliate relationship. Products we
          link to may earn a commission — this never affects your score or evidence ratings.
        </p>
        <p className="mt-3 text-sm text-muted">
          The scoring engine and the product-recommendation engine are separate systems with no
          shared ranking logic; commission data is not an input the score can see.
        </p>
      </section>
    </main>
  );
}
