// Client-side state for the audit journey (Screens 3–11). Persisted to sessionStorage
// only (prompt §8): stack/health-adjacent detail must not outlive the session, so we
// deliberately avoid localStorage for this data. No scoring here — UI state only.
import type { ExtractedItem, DeliveryFormat } from '@/lib/types';

export type StepKey =
  | 'capture'
  | 'confirm'
  | 'priority'
  | 'routine'
  | 'spend'
  | 'safety'
  | 'analysis'
  | 'preview'
  | 'email';

export const STEP_ORDER: StepKey[] = [
  'capture',
  'confirm',
  'priority',
  'routine',
  'spend',
  'safety',
  'analysis',
  'preview',
  'email',
];

export interface AuditState {
  rawText: string;
  extracted: ExtractedItem[];
  reviewedExtraction: boolean; // true once the user has seen the Confirm screen
  priority: string | null;
  routine: { diet: string | null; activity: string | null; sleep: string | null };
  spend: { low: number; high: number } | null;
  auditFocus: string | null;
  safety: 'yes' | 'no' | 'prefer_not_to_say' | null;
}

export const INITIAL_STATE: AuditState = {
  rawText: '',
  extracted: [],
  reviewedExtraction: false,
  priority: null,
  routine: { diet: null, activity: null, sleep: null },
  spend: null,
  auditFocus: null,
  safety: null,
};

export const DELIVERY_LABELS: Record<DeliveryFormat, string> = {
  standard_capsule: 'Capsule / tablet',
  liposomal: 'Liposomal',
  sublingual: 'Sublingual',
  powder: 'Powder',
  injectable: 'Injectable',
};

// Preview is State A (sufficient) only when we actually collected spend — otherwise the
// UI must NOT fabricate an SEI or Annual Waste (prompt §5). This is the single predicate
// the flow uses to decide which preview to request.
export function hasSufficientSpend(state: AuditState): boolean {
  if (state.spend && state.spend.high > 0) return true;
  return state.extracted.some((i) => typeof i.monthlyPrice === 'number' && i.monthlyPrice > 0);
}

const KEY = 'tt_audit_state_v1';

export function loadState(): AuditState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuditState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AuditState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sessionStorage unavailable (private mode / quota) — non-fatal for UI state. */
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
