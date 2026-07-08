'use client';

// Interactive assessment flow. Client-side rendered per TECH_DOCS §7 (does not need
// to be indexed). This is the flow that calls the backend; show a designed loading
// state that gracefully absorbs a Render/Neon cold start rather than looking broken.
//
// Mobile-first, touch-friendly (large tap targets, favor selects/sliders over free text).
// No scoring logic here - stub UI only.
export default function AssessmentPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Build your audit</h1>
      <p className="mt-2">
        Add the supplements you currently take. {/* Stub: stack-entry form + photo scan. */}
      </p>
      {/* TODO: stack-item inputs, then POST /assessment -> redirect to /report/[id]. */}
    </main>
  );
}
