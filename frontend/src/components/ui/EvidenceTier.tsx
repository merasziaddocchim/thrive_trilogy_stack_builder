// Evidence Tier display (BRAND §3 locked label; CLAIMS_COMPLIANCE §4/§9). Every
// compound-level claim must show its tier without a click (prompt §7). The full
// disclosure string follows the §9 template exactly:
//   "Evidence Tier [X]. [rationale]. Last reviewed [date] by [reviewer]."
import type { EvidenceTier } from '@/lib/types';
import { TIER_META } from '@/lib/constants';

const CHIP: Record<EvidenceTier, string> = {
  A: 'bg-tier-a-soft text-tier-a',
  B: 'bg-tier-b-soft text-tier-b',
  C: 'bg-tier-c-soft text-tier-c',
  D: 'bg-tier-d-soft text-tier-d',
};

/** Compact chip — always visible on a compound row. */
export function TierBadge({ tier, className = '' }: { tier: EvidenceTier; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-700 ${CHIP[tier]} ${className}`}
      title={`Evidence Tier ${tier} — ${TIER_META[tier].label}`}
    >
      <span aria-hidden>Tier {tier}</span>
      <span className="sr-only">Evidence Tier {tier}, {TIER_META[tier].label}</span>
    </span>
  );
}

/** Full disclosure line — rendered wherever a tier's rationale is shown (§9 template). */
export function TierDisclosure({
  tier,
  rationale,
  lastReviewed,
  reviewer,
}: {
  tier: EvidenceTier;
  rationale: string;
  lastReviewed: string;
  reviewer: string;
}) {
  return (
    <p className="text-sm text-muted">
      <span className="font-700 text-body">Evidence Tier {tier}.</span> {rationale} Last reviewed{' '}
      {lastReviewed} by {reviewer}.
    </p>
  );
}
