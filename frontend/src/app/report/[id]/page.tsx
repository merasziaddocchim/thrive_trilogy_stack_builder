'use client';

// Stack Report + Spend Efficiency Index screen. Client-side rendered (post-auth,
// not indexed - TECH_DOCS §7). Financial-dashboard density within the brand palette
// (BRAND_GUIDELINES §5). No business logic - layout stub only.
import { SpendEfficiencyIndex } from '@/components/report/SpendEfficiencyIndex';
import { StopKeepStart } from '@/components/report/StopKeepStart';
import { Disclaimer } from '@/components/compliance/Disclaimer';

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Disclaimer renders at the TOP of every report, body-size (CLAIMS_COMPLIANCE §5, BRAND §7). */}
      <Disclaimer />
      <SpendEfficiencyIndex assessmentId={params.id} />
      <StopKeepStart assessmentId={params.id} />
    </main>
  );
}
