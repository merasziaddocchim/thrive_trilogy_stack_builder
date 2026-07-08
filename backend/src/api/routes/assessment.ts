import { Router } from 'express';

// API contract from TECH_DOCS §6. Handlers are stubs (501) - no business logic yet.
export const assessmentRouter = Router();

// POST /assessment  -> { assessment_id }
assessmentRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'not_implemented', endpoint: 'POST /assessment' });
});

// GET /assessment/:id/preview  (free tier, no email)
// -> { stack_waste_score, headline_finding, evidence_tier_summary }
// headline_finding MUST come from a CLAIMS_COMPLIANCE §9 template - no freehand text.
assessmentRouter.get('/:id/preview', (_req, res) => {
  res.status(501).json({ error: 'not_implemented', endpoint: 'GET /assessment/:id/preview' });
});

// GET /assessment/:id/report  (post email-capture)
// -> { composite_score, safety_flag, stop[], keep[], start[], total_estimated_annual_waste }
// Every stop/keep/start object MUST include evidence_tier + source_ids (enforced via
// compliance/claim-guard.ts per TECH_DOCS §4).
assessmentRouter.get('/:id/report', (_req, res) => {
  res.status(501).json({ error: 'not_implemented', endpoint: 'GET /assessment/:id/report' });
});
