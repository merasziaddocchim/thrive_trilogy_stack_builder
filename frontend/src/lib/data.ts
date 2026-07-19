// =============================================================================
// DATA LAYER — live-first, fixture-fallback. This replaces the old fixture-only
// mock-api. Each function tries the real backend (lib/api.ts, TECH_DOCS §6) and, only if
// that fails (no backend configured, cold start error, unseeded evidence DB → 503, etc.),
// falls back to the fixtures. Preview/Report results carry `isSample: true` on fallback so
// the UI can show the "Preview build — sample data" banner ONLY when the numbers aren't real.
// When live data flows, isSample is false and the banner disappears.
//
// lib/fixtures.ts is intentionally kept for this fallback and for tests/demos.
// =============================================================================
import * as live from './api';
import {
  FIXTURE_EXTRACTION,
  FIXTURE_PREVIEW_STATE_A,
  FIXTURE_PREVIEW_STATE_B,
  FIXTURE_REPORT,
} from './fixtures';
import type { AssessmentPayload, ExtractedItem, PreviewResponse, ReportResponse } from './types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Surface WHY a live call failed instead of silently showing sample data. Visible in the
// browser console / Network tab, so the next diagnosis doesn't require code-reading:
//   'no_backend_configured'  → the API base URL env var isn't set on the deploy (Vercel)
//   'Failed to fetch' / TypeError → network, CORS, or a Render cold start that never answered
//   '... failed: 500' (or 503) → the backend responded with an error (e.g. DB unreachable)
function logFallback(fn: string, err: unknown): void {
  const reason = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn(`[data] live ${fn} failed → ${reason}`, err);
}

// When NO backend URL is configured (local dev / a preview build), honestly show sample
// fixtures + the banner. But when a backend IS configured and it errored (a real save/load
// failure, an expired session, a 5xx), do NOT silently substitute sample data — that would
// hide data loss. In that case we rethrow so the screen shows a clear, retryable error.
function isNoBackendConfigured(err: unknown): boolean {
  return err instanceof Error && err.message === 'no_backend_configured';
}

/** Wraps a payload result with whether it came from fixtures (sample) or the live backend. */
export interface Sourced<T> {
  data: T;
  isSample: boolean;
}

/** Intake extraction (TECH_DOCS §1a). Live POST /intake, else deterministic fixture set. */
export async function extractStack(rawText: string): Promise<ExtractedItem[]> {
  try {
    return await live.parseIntake(rawText);
  } catch (err) {
    logFallback('parseIntake', err);
    await delay(700); // keep the "reading your entries" beat when falling back
    return FIXTURE_EXTRACTION.map((i) => ({ ...i, dose: i.dose ? { ...i.dose } : null }));
  }
}

/** POST /assessment. Falls back to a local demo id so the flow still advances offline. */
export async function createAssessment(payload: AssessmentPayload): Promise<{ assessment_id: string }> {
  try {
    return await live.createAssessment(payload);
  } catch (err) {
    logFallback('createAssessment', err);
    // No backend → demo mode. A configured backend that failed to save → surface it (do not
    // pretend the save worked and proceed to a broken report).
    if (isNoBackendConfigured(err)) return { assessment_id: 'demo' };
    throw err;
  }
}

/** GET preview. `hasSpend` only selects which fixture state to show on fallback. */
export async function getPreview(
  id: string,
  opts: { hasSpend?: boolean } = {},
): Promise<Sourced<PreviewResponse>> {
  try {
    return { data: await live.getPreview(id), isSample: false };
  } catch (err) {
    logFallback('getPreview', err);
    if (!isNoBackendConfigured(err)) throw err; // configured-backend error → let the UI show it
    await delay(400);
    return { data: opts.hasSpend ? FIXTURE_PREVIEW_STATE_A : FIXTURE_PREVIEW_STATE_B, isSample: true };
  }
}

/** GET report. Falls back to the fixture report, flagged as sample. */
export async function getReport(id: string): Promise<Sourced<ReportResponse>> {
  try {
    return { data: await live.getReport(id), isSample: false };
  } catch (err) {
    logFallback('getReport', err);
    if (!isNoBackendConfigured(err)) throw err; // configured-backend error → let the UI show it
    await delay(500);
    return { data: FIXTURE_REPORT, isSample: true };
  }
}

// ---- Analysis staging (unchanged — pure UI pacing for the cold-start screen) ------------
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
