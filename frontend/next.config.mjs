/** @type {import('next').NextConfig} */
// Generic config - no Vercel-specific lock-in required; deploys as a standard Next app.
//
// NOTE: the backend API URL is NOT mapped here on purpose. `NEXT_PUBLIC_*` env vars are
// inlined automatically by Next at build time wherever they're referenced in code, so an
// explicit `env` block is redundant AND a footgun — it previously mapped only
// NEXT_PUBLIC_API_BASE_URL, which would blank out the value if Vercel had set the var under
// the other documented name (NEXT_PUBLIC_API_URL). lib/api.ts now reads either name.
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
