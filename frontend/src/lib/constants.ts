import type { EvidenceTier } from './types';

// =============================================================================
// SINGLE SOURCE OF TRUTH for the provisional evidence-tier ceilings.
//
// PROVISIONAL — pending founder sign-off (TECH_DOCS §2/§8, STATUS §9). These four
// numbers must NOT be hard-coded anywhere else in the UI, and must NOT be presented
// in copy as clinically final. When Ziad confirms the values, edit ONLY this object.
// =============================================================================
export const EVIDENCE_TIER_CEILINGS: Record<EvidenceTier, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
};

// Public-facing, locked product terminology (BRAND_GUIDELINES §3). Referenced instead
// of inline string literals so a term change is a one-line edit.
export const TERMS = {
  sei: 'Spend Efficiency Index',
  seiShort: 'SEI',
  report: 'Stack Report',
  preview: 'Preview',
  annualWaste: 'Estimated Annual Waste',
  cta: 'Begin Stack Audit',
} as const;

// Per-tier display metadata. `phrasingCeiling` documents the CLAIMS_COMPLIANCE §4
// language limit so copy authors can't overclaim above a tier.
export const TIER_META: Record<
  EvidenceTier,
  { label: string; short: string; phrasingCeiling: string }
> = {
  A: {
    label: 'Strong',
    short: 'A',
    phrasingCeiling: 'Plain dose comparison permitted (meta-analysis or ≥2 human RCTs).',
  },
  B: {
    label: 'Moderate',
    short: 'B',
    phrasingCeiling: 'Dose comparison permitted, singular source ("a clinical trial found…").',
  },
  C: {
    label: 'Limited',
    short: 'C',
    phrasingCeiling: 'Comparison must be prefaced "preliminary research suggests…".',
  },
  D: {
    label: 'Preliminary',
    short: 'D',
    phrasingCeiling: 'No dose-adequacy verdict permitted (non-human / single small study).',
  },
};

// The audit journey steps. The neutral, non-clinical progress label is prompt §9's
// required string: "Stack → Confirm → Priority → Routine → Spend → Safety → Preview".
export const JOURNEY_STEPS = [
  'Stack',
  'Confirm',
  'Priority',
  'Routine',
  'Spend',
  'Safety',
  'Preview',
] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

// The 12 legal/utility routes required by CLAIMS_COMPLIANCE §5a (+ Methodology, which
// is a product page per TECH_DOCS §7 and is listed separately in the footer).
export const LEGAL_PAGES: Array<{ slug: string; title: string }> = [
  { slug: 'about', title: 'About' },
  { slug: 'affiliate-disclosure', title: 'Affiliate Disclosure' },
  { slug: 'contact', title: 'Contact' },
  { slug: 'cookie-policy', title: 'Cookie Policy' },
  { slug: 'disclaimer', title: 'Disclaimer' },
  { slug: 'dmca-policy', title: 'DMCA Policy' },
  { slug: 'do-not-sell', title: 'Do Not Sell or Share My Info' },
  { slug: 'faq', title: 'FAQ' },
  { slug: 'how-we-review', title: 'How We Review' },
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms', title: 'Terms & Conditions' },
  { slug: 'reviews', title: 'Reviews' },
];

// Author / reviewer identity (E-E-A-T; BRAND_GUIDELINES §9, CLAIMS_COMPLIANCE §2).
export const REVIEWER = {
  name: 'Ziad Meras',
  credential: 'M.Sc. Organic Chemistry',
  lastReviewed: '2026-07-10',
} as const;
