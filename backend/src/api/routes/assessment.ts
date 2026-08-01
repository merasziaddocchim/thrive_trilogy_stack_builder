import { Router } from 'express';
import { z } from 'zod';
import { createAssessmentSession, getAssessmentSession } from '../services/session-repository.js';
import { assembleAssessment, type StoredStackItem } from '../services/assessment-service.js';
import { dbEvidenceProvider } from '../services/repository.js';
import { ClaimComplianceError } from '../../compliance/claim-guard.js';
import { GOAL_TAGS, isGoalTag } from '../../db/goals.js';
import { normalizeUnit } from '../../intake-parser/index.js';

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
    .object({
      // A CANONICAL GOAL TAG (db/goals.ts) or null — never a display label. Validated rather
      // than accepted-and-ignored: this field used to be `z.string()`, so the frontend's
      // 'Healthy aging' was stored verbatim, never matched any `goal_tag`, and every user was
      // silently scored against an arbitrary parameter row. An unknown value is now a 400.
      //
      // Null is legitimate and distinct from invalid: "Not sure yet" and "Simplifying my
      // stack" are Priority-screen choices that name no outcome.
      priority_goal: z
        .string()
        .refine(isGoalTag, {
          message: `priority_goal must be one of: ${GOAL_TAGS.join(', ')}`,
        })
        .nullable()
        .optional(),
    })
    .partial()
    .optional(),
});

/**
 * Normalize a dose to milligrams (the unit the scoring engine works in), or null when it
 * cannot be expressed in milligrams.
 *
 * `iu` RETURNS NULL and the item goes to confirmation unscored. International Units are a
 * measure of biological activity, not mass: the mg equivalent differs per substance (and per
 * isomer), so there is no conversion to apply here. This previously fell through to
 * `return dose.amount`, silently scoring "5000 IU" as 5000 mg — a claim about a dose the user
 * never gave. An unconvertible dose is missing data, and missing data must stay missing.
 *
 * Anything else unrecognized is treated the same way, for the same reason: the old trailing
 * `return dose.amount` made every unknown unit mean milligrams by default.
 */
export function toMg(dose: { amount: number; unit: string } | null | undefined): number | null {
  if (!dose) return null;
  const u = normalizeUnit(dose.unit);
  if (u === 'mg') return dose.amount;
  if (u === 'g') return dose.amount * 1000;
  if (u === 'mcg') return dose.amount / 1000;
  return null; // 'iu' or unrecognized → not expressible in mg; do not guess.
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
      // No stated outcome priority stays NULL. It used to default to the string 'general',
      // which is not a goal_tag, matched nothing, and was indistinguishable downstream from a
      // real goal that simply had no parameter row.
      goalTag: parsed.data.user_profile?.priority_goal ?? null,
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
