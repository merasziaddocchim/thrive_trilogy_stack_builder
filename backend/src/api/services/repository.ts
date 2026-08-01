// DB-backed EvidenceProvider + compound loader (Drizzle/Postgres). This is the production
// data path the routes use. The `db` client is imported lazily inside each function so this
// module (and the routes that import it) can load without DATABASE_URL set — only an actual
// query needs the database.
//
// UNTESTED END-TO-END in this environment: there is no DATABASE_URL and no seeded evidence
// data here, so these queries are type-checked and logically wired but not exercised against
// a live DB. The pure layers above them (scoring-engine, report-builder, assessment-service)
// are fully unit-tested.
import { and, eq, inArray } from 'drizzle-orm';
import type { EvidenceProvider, ResolvedEvidence } from './assessment-service.js';
import type { StackInteraction } from '../../scoring-engine/index.js';
import type { CompoundRef } from '../../intake-parser/index.js';
import { selectParameter } from '../../db/goals.js';

// Reviewer identity for E-E-A-T attribution (mirrors the frontend REVIEWER constant).
const REVIEWER_NAME = 'Ziad Meras';

async function getDb() {
  const { db } = await import('../../db/client.js');
  return db;
}

export const dbEvidenceProvider: EvidenceProvider = {
  async resolve(compoundIds, goalTag) {
    const map = new Map<string, ResolvedEvidence>();
    if (compoundIds.length === 0) return map;

    const db = await getDb();
    const { scoringParameters, compounds, sources } = await import('../../db/schema.js');

    const params = await db
      .select()
      .from(scoringParameters)
      .where(inArray(scoringParameters.compoundId, compoundIds))
      // The ORDER BY does not decide the selection — selectParameter() is order-independent and
      // db/select-parameter.test.ts proves it across every permutation. It is here so the query
      // itself is deterministic, because an unordered SELECT is what let row order silently
      // decide a user's Evidence Tier before 2026-08-01.
      .orderBy(scoringParameters.compoundId, scoringParameters.goalTag);

    const compoundRows = await db
      .select()
      .from(compounds)
      .where(inArray(compounds.compoundId, compoundIds));
    const nameById = new Map(compoundRows.map((c) => [c.compoundId, c.canonicalName]));

    for (const id of compoundIds) {
      const forCompound = params.filter((p) => p.compoundId === id);
      // CLAIMS_COMPLIANCE §4b: exact goal match, else highest Evidence Tier, ties by goal_tag
      // ascending. Never "whichever row came back first".
      const p = selectParameter(forCompound, goalTag);
      if (p == null) continue;

      // A readable short source name for dose-comparison copy: first contributing citation.
      let sourceShortName = 'reviewed research';
      const firstSourceId = p.contributingSourceIds?.[0];
      if (firstSourceId) {
        const [src] = await db.select().from(sources).where(eq(sources.sourceId, firstSourceId)).limit(1);
        if (src?.citation) sourceShortName = shortCitation(src.citation);
      }

      map.set(id, {
        canonicalName: nameById.get(id) ?? 'Unknown compound',
        // The outcome this evidence was actually established for — not necessarily the one the
        // user asked about. Carried up so the mismatch can be disclosed (§4b).
        goalTag: p.goalTag,
        // §4d routing input. Carried through as-is, INCLUDING null: an absent direction means
        // "not yet derived" and must stay distinguishable from the `null_no_effect` value.
        directionOfEvidence: p.directionOfEvidence,
        rangeLowMg: p.recommendedRangeLowMg,
        rangeHighMg: p.recommendedRangeHighMg,
        bioavailabilityAdjustmentFactor: p.bioavailabilityAdjustmentFactor ?? 1,
        evidenceTier: p.evidenceTier,
        contributingSourceIds: p.contributingSourceIds,
        tierRationale: p.evidenceTierRationale ?? '',
        lastReviewed: p.lastReviewedDate ? p.lastReviewedDate.toISOString().slice(0, 10) : '',
        reviewerName: REVIEWER_NAME,
        sourceShortName,
      });
    }
    return map;
  },

  async interactions(compoundIds): Promise<StackInteraction[]> {
    if (compoundIds.length === 0) return [];
    const db = await getDb();
    const { interactionRecords } = await import('../../db/schema.js');
    const rows = await db
      .select()
      .from(interactionRecords)
      .where(
        and(
          inArray(interactionRecords.compoundIdA, compoundIds),
          inArray(interactionRecords.compoundIdB, compoundIds),
        ),
      );
    return rows.map((r) => ({
      compoundIdA: r.compoundIdA,
      compoundIdB: r.compoundIdB,
      severity: r.severity,
      mechanismNote: r.mechanismNote,
      sourceIds: [r.sourceId],
    }));
  },
};

/** Load the compound registry for the intake parser to match against. */
export async function loadCompoundRefs(): Promise<CompoundRef[]> {
  const db = await getDb();
  const { compounds } = await import('../../db/schema.js');
  const rows = await db.select().from(compounds);
  return rows.map((c) => ({
    compoundId: c.compoundId,
    canonicalName: c.canonicalName,
    aliases: c.aliases ?? [],
    // Null stays null: a compound with no literature-established unit must not have one
    // inferred (CLAIMS_COMPLIANCE §4b).
    defaultUnit: c.defaultUnit,
  }));
}

function shortCitation(citation: string): string {
  // Keep the leading author/year-ish fragment for copy; full citation lives in the registry.
  return citation.split(/[.;]/)[0].slice(0, 60).trim();
}
