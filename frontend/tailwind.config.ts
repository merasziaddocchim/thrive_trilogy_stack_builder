import type { Config } from 'tailwindcss';

// Mobile-first is Tailwind's default (unprefixed = smallest breakpoint), matching
// TECH_DOCS §7's mobile-first requirement. Design tokens below are ESTIMATES from
// BRAND_GUIDELINES §4 - confirm exact hex/font values against live CSS before finalizing.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary accent - royal blue (~blue-600). CONFIRM exact value (BRAND_GUIDELINES §4).
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        // Headline near-black/dark navy with cool undertone (not pure #000).
        headline: '#0F172A',
        // Body muted slate/blue-gray.
        body: '#475569',
      },
      fontFamily: {
        // Display: bold high-contrast serif (editorial). Body/UI: rounded sans.
        // Placeholder stacks - swap for the site's actual families (BRAND_GUIDELINES §4/§10).
        display: ['Georgia', 'ui-serif', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
