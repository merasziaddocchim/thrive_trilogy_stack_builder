import type { Metadata } from 'next';
import { Button, Card, IconCircle, Eyebrow, FixtureTag } from '@/components/ui/primitives';
import { TierBadge } from '@/components/ui/EvidenceTier';
import { IconLayers, IconScale, IconShield } from '@/components/ui/Icon';

// Deliverable #1 (prompt §10): a design-system proof — the type scale, color, and spacing
// tokens rendered on one page. Internal/reference only (noindex via robots). Light mode
// only (prompt §7). Status: proposed — pending final token approval.
export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
};

const SWATCHES: Array<{ name: string; varName: string; onDark?: boolean }> = [
  { name: 'accent', varName: '--accent', onDark: true },
  { name: 'accent-hover', varName: '--accent-hover', onDark: true },
  { name: 'accent-soft', varName: '--accent-soft' },
  { name: 'headline', varName: '--headline', onDark: true },
  { name: 'body', varName: '--body', onDark: true },
  { name: 'muted', varName: '--muted', onDark: true },
  { name: 'surface-subtle', varName: '--surface-subtle' },
  { name: 'surface-lavender', varName: '--surface-lavender' },
  { name: 'border', varName: '--border' },
  { name: 'stop', varName: '--stop', onDark: true },
  { name: 'keep', varName: '--keep', onDark: true },
  { name: 'start', varName: '--start', onDark: true },
];

const TYPE_SCALE: Array<{ token: string; cls: string; note: string }> = [
  { token: '--text-3xl', cls: 'text-3xl', note: 'Marketing hero only' },
  { token: '--text-2xl', cls: 'text-2xl', note: 'Marketing section headings' },
  { token: '--text-xl', cls: 'text-xl', note: 'Web-app heading CAP (24–36px)' },
  { token: '--text-lg', cls: 'text-lg', note: 'Lead paragraph' },
  { token: '--text-base', cls: 'text-base', note: 'Body' },
  { token: '--text-sm', cls: 'text-sm', note: 'Meta / labels' },
  { token: '--text-xs', cls: 'text-xs', note: 'Fine meta' },
];

const SPACE = [1, 2, 3, 4, 6, 8, 12];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <FixtureTag label="Internal reference — proposed, pending token approval" />
      <h1 className="mt-4 text-2xl font-700 text-headline">Design system proof</h1>
      <p className="mt-2 text-body">
        Tokens reconstructed from BRAND_GUIDELINES §4. Colors in OKLCH, fluid clamp() type,
        4px spacing grid, WCAG AA targets. Light mode only for V1.
      </p>

      {/* Typography ---------------------------------------------------------- */}
      <section className="mt-12">
        <Eyebrow>Type scale</Eyebrow>
        <h2 className="text-xl font-700 text-headline">Editorial serif + rounded sans</h2>
        <div className="mt-4 space-y-3">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="border-b border-border pb-3">
              <p className={`font-display font-700 text-headline ${t.cls}`}>Spend ≠ efficiency</p>
              <p className="text-xs text-muted">
                <code>{t.token}</code> · {t.note}
              </p>
            </div>
          ))}
          <p className="font-sans text-base text-body">
            Body copy is set in a warm rounded sans (Nunito), distinctly rounder than Inter — this
            is the UI/label/button voice.
          </p>
        </div>
      </section>

      {/* Color --------------------------------------------------------------- */}
      <section className="mt-12">
        <Eyebrow>Color</Eyebrow>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-lg border border-border">
              <div className="h-16 w-full" style={{ background: `var(${s.varName})` }} />
              <div className="bg-surface px-3 py-2">
                <p className="text-sm font-700 text-headline">{s.name}</p>
                <code className="text-xs text-muted">{s.varName}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing ------------------------------------------------------------- */}
      <section className="mt-12">
        <Eyebrow>Spacing — 4px grid</Eyebrow>
        <div className="mt-4 space-y-2">
          {SPACE.map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-14 text-sm text-muted">{n * 4}px</span>
              <div className="h-4 rounded bg-accent" style={{ width: `${n * 4}px` }} />
            </div>
          ))}
        </div>
      </section>

      {/* Components ----------------------------------------------------------- */}
      <section className="mt-12">
        <Eyebrow>Components</Eyebrow>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="quiet">Quiet link</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TierBadge tier="A" />
          <TierBadge tier="B" />
          <TierBadge tier="C" />
          <TierBadge tier="D" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <IconLayers className="h-6 w-6" />, label: 'Overlap' },
            { icon: <IconScale className="h-6 w-6" />, label: 'Dose vs. research' },
            { icon: <IconShield className="h-6 w-6" />, label: 'Independence' },
          ].map((c) => (
            <Card key={c.label}>
              <IconCircle>{c.icon}</IconCircle>
              <p className="mt-3 font-700 text-headline">{c.label}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
