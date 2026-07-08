// Marketing home. SSG (default, no dynamic data) per TECH_DOCS §7 - must be servable
// entirely from Vercel with zero backend dependency (no Render call here).
//
// Copy is placeholder and follows BRAND_GUIDELINES §1 audit/optimizer framing
// (NOT the "build your stack in 3 minutes" quiz framing). No claim strings rendered here.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold">See what your stack is wasting.</h1>
      <p className="mt-4 text-lg">
        An audit of the supplements you already take — what is redundant, what is
        underdosed, and what it is costing you — measured against reviewed research.
      </p>
      <a
        href="/assessment"
        className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent-hover"
      >
        Run a Preview
      </a>
    </main>
  );
}
