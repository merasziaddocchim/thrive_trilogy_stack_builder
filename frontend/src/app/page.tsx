// Marketing home — SSG (no backend dependency, TECH_DOCS §7). Builds the exact narrative
// in prompt §3, Sections A–H. Audit/optimizer framing throughout (BRAND §1) — never the
// "build your stack in 3 minutes" quiz framing. No compound claim strings are rendered
// here; the illustrative findings are explicitly labelled (prompt §3C, CLAIMS_COMPLIANCE §3).
import Link from 'next/link';
import { Button, Card, Eyebrow, IconCircle, FixtureTag } from '@/components/ui/primitives';
import { TierBadge } from '@/components/ui/EvidenceTier';
import {
  IconLayers,
  IconScale,
  IconMagnifier,
  IconShield,
  IconReceipt,
  IconArrowRight,
} from '@/components/ui/Icon';
import { TERMS, REVIEWER } from '@/lib/constants';

export default function HomePage() {
  return (
    <main>
      {/* ============================ SECTION A — HERO ============================
          Financial-audit-meets-clinical-review tone. NO molecule/DNA/AI-brain imagery
          and NO gradient-mesh background in the hero (prompt §3A) — a faint dotted
          "ledger" grid instead. Headline reframes spend ≠ efficiency in our own words. */}
      <section className="bg-ledger border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow>An audit, not a quiz</Eyebrow>
            <h1 className="text-3xl font-900 leading-[1.05] text-headline">
              What you spend on supplements isn&apos;t what you&apos;re getting back.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-body">
              Bring the stack you already take. We check it against reviewed research and show you
              what&apos;s redundant, what&apos;s underdosed, and what it&apos;s quietly costing you —
              in dollars, with the evidence behind every finding.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button href="/assessment" variant="primary" className="text-lg">
                {TERMS.cta}
                <IconArrowRight className="h-5 w-5" />
              </Button>
              <Link href="/methodology" className="font-600 text-accent underline underline-offset-4 hover:text-accent-hover">
                See how the audit works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION B — THE DIAGNOSTIC PREMISE ==================== */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-2xl">
          <Eyebrow>What the audit checks</Eyebrow>
          <h2 className="text-2xl font-700 text-headline">Three checks on the stack you already own</h2>
          <p className="mt-4 text-body">
            Not a wishlist. We start from your inventory and run it against the same three
            questions, every time.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: <IconLayers className="h-6 w-6" />,
              title: 'Overlap',
              body: 'Duplicate or overlapping active ingredients across the products you take — the same compound paid for twice.',
            },
            {
              icon: <IconScale className="h-6 w-6" />,
              title: 'Dose vs. research',
              body: 'Where the evidence allows, your dose compared against the range actually used in human research — above, below, or within.',
            },
            {
              icon: <IconMagnifier className="h-6 w-6" />,
              title: 'Evidence Tier',
              body: 'The quality of human evidence behind each compound, graded A to D, shown on every finding — strong dosing can’t fake a strong tier.',
            },
          ].map((c) => (
            <Card key={c.title}>
              <IconCircle>{c.icon}</IconCircle>
              <h3 className="mt-4 text-lg font-700 text-headline">{c.title}</h3>
              <p className="mt-2 text-sm text-body">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ==================== SECTION C — ILLUSTRATIVE FINDINGS ====================
          2–3 realistic findings, EXPLICITLY labelled illustrative — never a real result.
          No "improves/treats/reverses/prevents" language (prompt §3C). */}
      <section className="border-y border-border bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-2xl">
              <Eyebrow>What a finding looks like</Eyebrow>
              <h2 className="text-2xl font-700 text-headline">Findings read like a ledger line, not an ad</h2>
            </div>
            <FixtureTag label="Illustrative examples — not a real user's result" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Card>
              <TierBadge tier="B" />
              <p className="mt-3 font-600 text-headline">
                Your NMN dose is 17% below the range used in human research (300–500 mg).
              </p>
              <p className="mt-2 text-sm text-muted">Based on a single human trial. Tier B.</p>
            </Card>
            <Card>
              <span className="inline-flex rounded-pill bg-stop-soft px-2.5 py-1 text-xs font-700 text-stop">
                Overlap
              </span>
              <p className="mt-3 font-600 text-headline">
                2 products in this stack each contain a NAD+ precursor — about $72/month on
                overlapping sources.
              </p>
              <p className="mt-2 text-sm text-muted">Redundant spend, not a benefit.</p>
            </Card>
            <Card>
              <TierBadge tier="C" />
              <p className="mt-3 font-600 text-headline">
                Preliminary, non-human research on this compound has used varied doses. Human
                dosing data isn&apos;t available yet.
              </p>
              <p className="mt-2 text-sm text-muted">Tier C — not yet confirmed in human trials.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ==================== SECTION D — OUTPUT PREVIEW ====================
          Blurred / partially redacted look at the SEI, Annual Waste RANGE, and the
          Stop/Keep/Start structure. Uses the word "Preview" (prompt §3D). */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>{TERMS.preview}</Eyebrow>
            <h2 className="text-2xl font-700 text-headline">
              You see the shape of the result before anything is required
            </h2>
            <p className="mt-4 text-body">
              A free {TERMS.preview} shows what we recognized and how strong the evidence is. The
              full {TERMS.sei}, {TERMS.annualWaste}, and your Stop / Keep / Start report unlock after
              you enter a little more.
            </p>
            <p className="mt-3 text-sm text-muted">
              {TERMS.annualWaste} is always shown as a range — never a single false-precision number.
            </p>
          </div>

          {/* Redacted mock dashboard — decorative, not a real score. */}
          <Card className="relative overflow-hidden">
            <FixtureTag label="Preview mock" />
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-700 uppercase tracking-[0.14em] text-muted">
                  {TERMS.sei}
                </p>
                <p className="font-display text-5xl font-900 text-headline">
                  <span className="redacted">00</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-700 uppercase tracking-[0.14em] text-muted">
                  {TERMS.annualWaste}
                </p>
                <p className="font-display text-2xl font-700 text-headline">
                  $<span className="redacted">000</span>–<span className="redacted">000</span>
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {(['Stop', 'Keep', 'Start'] as const).map((s) => (
                <div
                  key={s}
                  className={`flex items-center gap-3 rounded-md border-l-4 bg-surface-subtle px-3 py-2 ${
                    s === 'Stop' ? 'border-stop' : s === 'Keep' ? 'border-keep' : 'border-start'
                  }`}
                >
                  <span className="w-12 text-sm font-700 text-headline">{s}</span>
                  <span className="redacted h-3 flex-1">redacted content line placeholder</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ============ SECTION E — METHODOLOGY & INDEPENDENCE ============ */}
      <section className="border-y border-border bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <IconCircle><IconShield className="h-6 w-6" /></IconCircle>
              <h2 className="mt-4 text-2xl font-700 text-headline">How the evidence gets in</h2>
              <p className="mt-3 text-body">
                Research is extracted from primary sources, then verified against the source by a
                credentialed human reviewer before it enters our database. Nothing reaches your
                report on extraction alone.
              </p>
              <p className="mt-4 text-sm text-muted">
                This report was generated using AI, based on our reviewed research database, and is
                not a substitute for professional medical advice. AI is also used to read your
                free-text entry and match it to compounds — you confirm those matches before
                anything is scored.
              </p>
            </div>
            <div>
              <IconCircle><IconReceipt className="h-6 w-6" /></IconCircle>
              <h2 className="mt-4 text-2xl font-700 text-headline">Why the score is independent</h2>
              <Card className="mt-4 border-accent bg-surface">
                <p className="font-600 text-headline">
                  Your {TERMS.sei} is calculated independently of any affiliate relationship.
                  Products we link to may earn a commission — this never affects your score or
                  evidence ratings.
                </p>
              </Card>
              <p className="mt-4 text-sm text-muted">
                The scoring engine and the product-recommendation engine are separate systems. The
                score can&apos;t see commission data, by design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION F — AUTHOR CREDENTIAL BLOCK ====================
          Prominent, NOT footer-buried (prompt §3F, BRAND §9). */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <Card className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-2xl font-700 text-accent">
            ZM
          </span>
          <div className="flex-1">
            <p className="text-xs font-700 uppercase tracking-[0.14em] text-muted">Reviewed by</p>
            <p className="font-display text-xl font-700 text-headline">
              {REVIEWER.name}, {REVIEWER.credential}
            </p>
            <p className="mt-1 text-sm text-body">
              Every evidence tier and dose range is reviewed against the primary source before it
              ships. Last reviewed {REVIEWER.lastReviewed}.
            </p>
          </div>
          <Link
            href="/methodology"
            className="font-600 text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            Read the methodology
          </Link>
        </Card>
      </section>

      {/* ==================== SECTION G — FINAL CTA ==================== */}
      <section className="border-t border-border bg-surface-lavender">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <h2 className="mx-auto max-w-2xl text-2xl font-700 text-headline">
            See what your stack is actually returning on what you spend
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body">
            You&apos;ll enter what you&apos;re currently taking, answer a few quick questions, and see
            a {TERMS.preview} before anything is required.
          </p>
          <div className="mt-8">
            <Button href="/assessment" variant="primary" className="text-lg">
              {TERMS.cta}
              <IconArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      {/* SECTION H — Footer & legal scaffold is the global <SiteFooter/> (all 12 routes). */}
    </main>
  );
}
