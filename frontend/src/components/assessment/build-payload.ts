// Map the client-side audit state into the POST /assessment payload (TECH_DOCS §6 shape).
// Kept separate so the request contract lives in one place.
import type { AssessmentPayload } from '@/lib/types';
import type { AuditState } from './audit-state';

export function buildAssessmentPayload(state: AuditState): AssessmentPayload {
  return {
    stack_items: state.extracted
      // Only send items the user kept that resolved to (or were named as) a compound.
      .filter((i) => i.canonicalName || i.compoundId)
      .map((i) => ({
        compound_id: i.compoundId,
        canonical_name: i.canonicalName,
        dose: i.dose,
        delivery_format: i.deliveryFormat,
        monthly_price: i.monthlyPrice,
      })),
    user_profile: {
      priority_goal: state.priority,
      routine: state.routine,
      monthly_spend: state.spend,
      audit_focus: state.auditFocus,
      safety_flag: state.safety,
    },
  };
}
