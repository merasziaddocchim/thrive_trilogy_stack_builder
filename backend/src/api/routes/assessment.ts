import { Router } from 'express';
import { z } from 'zod';
import { createAssessmentSession, getAssessmentSession } from '../services/session-repository.js';
import { assembleAssessment, type StoredStackItem } from '../services/assessment-service.js';
import { dbEvidenceProvider } from '../services/repository.js';
import { ClaimComplianceError } from '../../compliance/claim-guard.js';

// API contract from TECH_DOCS §6. Zod validates request bodies (the repo's locked validator).
export const assessmentRouter = Router();

const deliveryFormat = z.enum([
  'standard_capsule',
  'liposomal',
  'sublingual',
  'powder',
  'injectable',
]);

const stackItemSchema = z.object({
  compound_id: z.string().nullable().optional(),
  canonical_name: z.string().nullable().optional(),
  dose: z.object({ amount: z.number(), unit: z.string() }).nullable().optional(),
  delivery_format: deliveryFormat.nullable().optional(),
  monthly_price: z.number().nullable().optional(),
});

const assessmentSchema = z.object({
  stack_items: z.array(stackItemSchema),
  user_profile: z
    .object({ priority_goal: z.string().nullable().optional() })
    .partial()
    .optional(),
});

/** Normalize a dose to milligrams (the unit the scoring engine works in). */
function toMg(dose: { amount: number; unit: string } | null | undefined): number | null {
  if (!dose) return null;
  const u = dose.unit.toLowerCase();
  if (u === 'g') return dose.amount * 1000;
  if (u === 'mcg' || u === 'µg') return dose.amount / 1000;
  return dose.amount; // mg or unknown → treat as mg
}

// POST /assessment -> { assessment_id }
assessmentRouter.post('/', async (req, res) => {
  const parsed = assessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const stackItems: StoredStackItem[] = parsed.data.stack_items.map((s) => ({
    compoundId: s.compound_id ?? null,
    labelDoseMg: toMg(s.dose),
    deliveryFormat: s.delivery_format ?? null,
    pricePaid: s.monthly_price ?? null,
  }));
  try {
    const assessmentId = await createAssessmentSession({
      stackItems,
      goalTag: parsed.data.user_profile?.priority_goal ?? 'general',
    });
    return res.status(201).json({ assessment_id: assessmentId });
  } catch {
    // The durable save failed (DB unreachable / pool exhausted). Never pretend it succeeded —
    // return a clear 503 (not a raw 500) so the client can tell the user to retry.
    return res.status(503).json({
      error: 'session_store_unavailable',
      message: "We couldn't save your assessment right now. Please try again in a moment.",
    });
  }
});

async function respondWith(kind: 'preview' | 'report', id: string, res: import('express').Response) {
  // Load the session. A DB read failure is a 503 (transient); a missing/expired session is a
  // 404 (sessions are kept 48 hours) — never a raw 500, never silent.
  let intake;
  try {
    intake = await getAssessmentSession(id);
  } catch {
    return res.status(503).json({
      error: 'session_store_unavailable',
      message: "We couldn't load your assessment right now. Please try again in a moment.",
    });
  }
  if (!intake) {
    return res.status(404).json({
      error: 'session_not_found',
      message:
        "This assessment wasn't found or has expired. Sessions are kept for 48 hours — please start a new audit.",
    });
  }
  try {
    const outputs = await assembleAssessment(intake, dbEvidenceProvider);
    return res.json(kind === 'preview' ? outputs.preview : outputs.report);
  } catch (err) {
    if (err instanceof ClaimComplianceError) {
      // A compound reached serialization without tier/sources — refuse to serve it (CLAIMS §4).
      return res.status(422).json({ error: 'claim_not_compliant', detail: err.message });
    }
    // Most likely the DB is unreachable or unseeded — the frontend treats this as a fallback.
    return res.status(503).json({ error: 'scoring_unavailable' });
  }
}

// GET /assessment/:id/preview  (free tier, no email)
assessmentRouter.get('/:id/preview', (req, res) => {
  void respondWith('preview', req.params.id, res);
});

// GET /assessment/:id/report  (post email-capture)
assessmentRouter.get('/:id/report', (req, res) => {
  void respondWith('report', req.params.id, res);
});
