// Thin typed client for the backend API (TECH_DOCS §6). No business logic.
// Only the interactive flow uses this - marketing/methodology pages must not depend
// on the backend being warm (TECH_DOCS §5/§7).
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export async function createAssessment(payload: unknown): Promise<{ assessment_id: string }> {
  const res = await fetch(`${BASE}/assessment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createAssessment failed: ${res.status}`);
  return res.json();
}

export async function getPreview(id: string) {
  const res = await fetch(`${BASE}/assessment/${id}/preview`);
  if (!res.ok) throw new Error(`getPreview failed: ${res.status}`);
  return res.json();
}

export async function getReport(id: string) {
  const res = await fetch(`${BASE}/assessment/${id}/report`);
  if (!res.ok) throw new Error(`getReport failed: ${res.status}`);
  return res.json();
}
