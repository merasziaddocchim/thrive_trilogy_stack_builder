import type { Config } from 'tailwindcss';

// Mobile-first is Tailwind's default (unprefixed = smallest breakpoint), matching
// TECH_DOCS §7. Tokens are wired to the CSS custom properties in globals.css so the
// single source of truth for color/type stays there. Status: proposed — pending token
// approval (BRAND_GUIDELINES §4/§11: values reconstructed from docs, not live CSS).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface)',
          subtle: 'var(--surface-subtle)',
          lavender: 'var(--surface-lavender)',
        },
        border: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          contrast: 'var(--accent-contrast)',
        },
        headline: 'var(--headline)',
        body: 'var(--body)',
        muted: 'var(--muted)',
        // Stop / Keep / Start structural wayfinding.
        stop: { DEFAULT: 'var(--stop)', soft: 'var(--stop-soft)' },
        keep: { DEFAULT: 'var(--keep)', soft: 'var(--keep-soft)' },
        start: { DEFAULT: 'var(--start)', soft: 'var(--start-soft)' },
        // Evidence tiers.
        'tier-a': { DEFAULT: 'var(--tier-a)', soft: 'var(--tier-a-soft)' },
        'tier-b': { DEFAULT: 'var(--tier-b)', soft: 'var(--tier-b-soft)' },
        'tier-c': { DEFAULT: 'var(--tier-c)', soft: 'var(--tier-c-soft)' },
        'tier-d': { DEFAULT: 'var(--tier-d)', soft: 'var(--tier-d-soft)' },
      },
      fontFamily: {
        // Editorial serif display + rounded sans body — wired to next/font in layout.tsx.
        display: ['var(--font-display)', 'Georgia', 'ui-serif', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        // Numeric weight utilities (font-400 … font-900) used across the UI.
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
        900: '900',
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
};

export default config;
