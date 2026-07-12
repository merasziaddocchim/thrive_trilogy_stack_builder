// Flat ESLint config (ESLint 9). Lints the TypeScript source without type-aware rules so it
// stays fast and does not duplicate `tsc`. The compliance firewall is a separate check
// (scripts/check-firewall.mjs), run alongside this via `npm run lint`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Node globals for plain-JS tooling scripts (the .mjs firewall check). TS files use the
// typescript-eslint parser, which disables no-undef, so they don't need this.
const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  URL: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'drizzle/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{mjs,js}'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    rules: {
      // Allow intentionally-unused args/vars prefixed with underscore (used across stubs).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files use node:test globals via imports; nothing special needed, but relax any.
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
