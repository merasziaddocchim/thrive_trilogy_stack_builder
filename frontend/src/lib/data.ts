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

/** Wraps a payload result with whether it came from fixtures (sample) or the live backend. */
export interface Sourced<T> {
  data: T;
  isSample: boolean;
}

/** Intake extraction (TECH_DOCS §1a). Live POST /intake, else deterministic fixture set. */
export async function extractStack(rawText: string): Promise<ExtractedItem[]> {
  try {
    return await live.parseIntake(rawText);
  } catch {
    await delay(700); // keep the "reading your entries" beat when falling back
    return FIXTURE_EXTRACTION.map((i) => ({ ...i, dose: i.dose ? { ...i.dose } : null }));
  }
}

/** POST /assessment. Falls back to a local demo id so the flow still advances offline. */
export async function createAssessment(payload: AssessmentPayload): Promise<{ assessment_id: string }> {
  try {
    return await live.createAssessment(payload);
  } catch {
    return { assessment_id: 'demo' };
  }
}

/** GET preview. `hasSpend` only selects which fixture state to show on fallback. */
export async function getPreview(
  id: string,
  opts: { hasSpend?: boolean } = {},
): Promise<Sourced<PreviewResponse>> {
  try {
    return { data: await live.getPreview(id), isSample: false };
  } catch {
    await delay(400);
    return { data: opts.hasSpend ? FIXTURE_PREVIEW_STATE_A : FIXTURE_PREVIEW_STATE_B, isSample: true };
  }
}

/** GET report. Falls back to the fixture report, flagged as sample. */
export async function getReport(id: string): Promise<Sourced<ReportResponse>> {
  try {
    return { data: await live.getReport(id), isSample: false };
  } catch {
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
