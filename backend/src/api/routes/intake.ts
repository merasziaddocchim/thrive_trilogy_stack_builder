import { Router } from 'express';
import { z } from 'zod';
import { parseIntake, describeParser } from '../../intake-parser/index.js';
import { loadCompoundRefs } from '../services/repository.js';

// Intake parsing endpoint (TECH_DOCS §1a). Feeds the frontend "Confirm What We Found" screen
// with a mixed high/low/unmatched confidence array. Not in the original §6 contract — added
// for the free-text + LLM-extraction capture method (decision logged in TECH_DOCS §1a/§8).
export const intakeRouter = Router();

const bodySchema = z.object({ text: z.string().min(1) });

// POST /intake -> { items, notice }
intakeRouter.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  try {
    const compounds = await loadCompoundRefs();
    // NOTE: the default HeuristicExtractor is used here. To enable the LLM extractor, inject
    // an LlmExtractor with a configured `complete()` — a provider integration left to config
    // (FLAGGED: model/provider not specified in the governing docs).
    const items = await parseIntake(parsed.data.text, compounds);
    return res.json({ items, notice: describeParser() });
  } catch {
    return res.status(503).json({ error: 'intake_unavailable' });
  }
});
