// Live typed client for the backend API (TECH_DOCS §6 + the /intake endpoint from §1a).
// Throws on any non-2xx or when no backend URL is configured, so the data layer
// (lib/mock-api.ts) can catch and fall back to fixtures. Only the interactive flow uses
// this — marketing/methodology pages must not depend on the backend being warm (§5/§7).
import type {
  AssessmentPayload,
  ExtractedItem,
  PreviewResponse,
  ReportResponse,
} from './types';

// Accept EITHER env-var name. The code was written against NEXT_PUBLIC_API_BASE_URL, but
// the deployment (Vercel) was documented with NEXT_PUBLIC_API_URL (STATUS §4) — a name
// mismatch means BASE is empty at build time, so every live call throws
// 'no_backend_configured' and the UI silently falls back to fixtures forever. Reading both
// names makes the client work whichever one is set. (NEXT_PUBLIC_* is inlined at BUILD time,
// so a Vercel redeploy is required after changing/adding the variable.)
const BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ''
).replace(/\/+$/, ''); // tolerate a trailing slash on the configured URL

function requireBase(): string {
  if (!BASE) throw new Error('no_backend_configured');
  return BASE;
}

async function json<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** POST /intake → confirmable, mixed-confidence extracted items (§1a). */
export async function parseIntake(text: string): Promise<ExtractedItem[]> {
  const res = await fetch(`${requireBase()}/intake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await json<{ items: ExtractedItem[] }>(res, 'parseIntake');
  return data.items;
}

/** POST /assessment → { assessment_id }. */
export async function createAssessment(payload: AssessmentPayload): Promise<{ assessment_id: string }> {
  const res = await fetch(`${requireBase()}/assessment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return json(res, 'createAssessment');
}

/** GET /assessment/:id/preview (free tier). */
export async function getPreview(id: string): Promise<PreviewResponse> {
  const res = await fetch(`${requireBase()}/assessment/${id}/preview`);
  return json<PreviewResponse>(res, 'getPreview');
}

/** GET /assessment/:id/report (post email-capture). */
export async function getReport(id: string): Promise<ReportResponse> {
  const res = await fetch(`${requireBase()}/assessment/${id}/report`);
  return json<ReportResponse>(res, 'getReport');
}
