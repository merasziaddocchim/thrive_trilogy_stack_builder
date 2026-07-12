// =============================================================================
// MOCK API — simulates the TECH_DOCS §6 endpoints against fixtures. This is the
// ONLY seam between the UI and "the backend" for this UI/UX task. When the real
// scoring backend + intake-parser module exist, replace each function body here
// with a fetch() to the live endpoint (see lib/api.ts for the real client stubs).
// The function signatures and return shapes are the contract — keep them stable.
// =============================================================================
import type {
  AssessmentPayload,
  ExtractedItem,
  PreviewResponse,
  ReportResponse,
} from './types';
import {
  FIXTURE_EXTRACTION,
  FIXTURE_PREVIEW_STATE_A,
  FIXTURE_PREVIEW_STATE_B,
  FIXTURE_REPORT,
} from './fixtures';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simulates the intake-parser LLM extraction (TECH_DOCS §1a). In production this is
 * a call into backend/src/intake-parser/. Returns a mixed high/low-confidence list.
 * `simulateError` lets the Confirm screen demo its error state.
 */
export async function extractStack(
  rawText: string,
  opts: { simulateError?: boolean } = {},
): Promise<ExtractedItem[]> {
  await delay(900);
  if (opts.simulateError) throw new Error('extraction_failed');
  // The mock ignores rawText content and returns a representative fixture set; the
  // real parser would key off rawText. Deep-clone so callers can edit freely.
  return FIXTURE_EXTRACTION.map((i) => ({ ...i, dose: i.dose ? { ...i.dose } : null }));
}

/** POST /assessment → { assessment_id }. */
export async function createAssessment(_payload: AssessmentPayload): Promise<{ assessment_id: string }> {
  await delay(400);
  return { assessment_id: 'demo' };
}

/**
 * GET /assessment/{id}/preview. Which state is returned depends on whether the intake
 * gave enough to score (prompt §5). We infer it here from whether a monthly spend was
 * captured; the real backend makes the same determination server-side.
 */
export async function getPreview(
  _id: string,
  opts: { hasSpend?: boolean } = {},
): Promise<PreviewResponse> {
  await delay(600);
  return opts.hasSpend ? FIXTURE_PREVIEW_STATE_A : FIXTURE_PREVIEW_STATE_B;
}

/** GET /assessment/{id}/report (post email-capture). */
export async function getReport(_id: string): Promise<ReportResponse> {
  await delay(700);
  return FIXTURE_REPORT;
}

// ---- Cold-start simulation (prompt §7/§8) -----------------------------------
// The Analysis screen must gracefully absorb a 30–60s Render/Neon cold start with
// sequential stage messages. This helper runs a staged pipeline whose total duration
// is configurable; the UI drives the stage copy, this just paces the promise.
export const ANALYSIS_STAGES = [
  'Organizing your entries',
  'Checking dose ranges in reviewed records',
  'Looking for ingredient overlap',
  'Preparing your Preview',
] as const;

export async function runAnalysis(
  onStage: (index: number) => void,
  opts: { perStageMs?: number; simulateError?: boolean } = {},
): Promise<void> {
  const per = opts.perStageMs ?? 1200;
  for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
    onStage(i);
    await delay(per);
    if (opts.simulateError && i === 1) throw new Error('analysis_failed');
  }
}
