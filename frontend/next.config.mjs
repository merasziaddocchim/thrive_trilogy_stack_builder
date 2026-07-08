/** @type {import('next').NextConfig} */
// Generic config - no Vercel-specific lock-in required; deploys as a standard Next app.
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Public base URL of the backend API (Render). Set per-environment in Vercel.
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

export default nextConfig;
