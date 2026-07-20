// =============================================================================
// DATA CORRECTION SCRIPT — batch-1 founder review, 2026-07-20
//
// Applies two founder-confirmed corrections to the LIVE evidence data. This is the
// proper vehicle for a data fix (not a manual DB edit and not a re-seed): the seed
// runner uses ON CONFLICT DO NOTHING, so re-seeding never UPDATEs existing rows —
// corrections must be explicit UPDATEs.
//
// Idempotent: sets absolute target values keyed by the stable source UUIDs, so running
// it more than once is safe and leaves the same result. Read requires nothing; writes
// require DATABASE_URL. Run once against production (like db:seed) with:
//   npm run db:correct:batch1
// then re-verify with `npm run db:counts` (row counts are unchanged — these are UPDATEs).
//
// NOTE: not executed here (no DATABASE_URL / Neon reachable in the authoring env); it
// type-checks and mirrors seed-data.ts exactly. The founder runs it against the real DB.
//
// Corrections (seed-data.ts already carries the same values, so a future re-seed on a
// fresh DB reproduces them):
//   1. McRae 2013 (TMG) — citation journal/volume/pages were wrong (had
//      "Nutr Res. 2013;33(2):159-165"); correct is J Chiropr Med. 2013;12(1):20-25,
//      doi:10.1016/j.jcm.2012.11.001. PMC link and the underlying science unchanged.
//   2. Dollerup 2018 (NR) — sample_size was null; founder-confirmed n=40.
//
// Deliberately does NOT touch extraction_status — the founder review is IN PROGRESS and
// nothing is being flipped to human_reviewed yet.
// =============================================================================
import { eq } from 'drizzle-orm';
import { db } from '../client.js';
import { sources } from '../schema.js';
import { SEED_SOURCE_IDS } from '../seed-data.js';

const MCRAE_CITATION =
  'McRae MP. Betaine supplementation decreases plasma homocysteine in healthy adult participants: a meta-analysis. J Chiropr Med. 2013;12(1):20-25. doi:10.1016/j.jcm.2012.11.001 (5 RCTs, 2002-2010).';
const MCRAE_REVIEW_NOTES =
  'Citation corrected by founder review 2026-07-20: journal/volume/pages were wrong (had Nutr Res 2013;33(2):159-165); correct is J Chiropr Med 2013;12(1):20-25, doi:10.1016/j.jcm.2012.11.001. PMC3610948 link and the underlying science (5 RCTs, 2002-2010, >=4 g/day, 6-24 wk, pooled homocysteine reduction ~1.23 umol/L) unchanged and founder-confirmed.';
const DOLLERUP_REVIEW_NOTES =
  'Existence + metadata verified via web search 2026-07-13; DOI not fetched directly (resolver blocked). Sample size founder-confirmed 2026-07-20: n=40 (healthy sedentary men, BMI>30, ages 40-70).';

async function main() {
  // 1. McRae 2013 — fix citation (journal/volume/pages) + review note. Science unchanged.
  const mcrae = await db
    .update(sources)
    .set({ citation: MCRAE_CITATION, reviewNotes: MCRAE_REVIEW_NOTES })
    .where(eq(sources.sourceId, SEED_SOURCE_IDS.mcrae2013))
    .returning({ id: sources.sourceId });

  // 2. Dollerup 2018 — set the confirmed sample size + review note.
  const dollerup = await db
    .update(sources)
    .set({ sampleSize: 40, reviewNotes: DOLLERUP_REVIEW_NOTES })
    .where(eq(sources.sourceId, SEED_SOURCE_IDS.dollerup2018))
    .returning({ id: sources.sourceId });

  const mcraeN = mcrae.length;
  const dollerupN = dollerup.length;
  console.log(
    `batch1 corrections applied: McRae citation rows updated=${mcraeN}, Dollerup sample_size rows updated=${dollerupN}.`,
  );
  if (mcraeN !== 1 || dollerupN !== 1) {
    throw new Error(
      `Expected exactly 1 row updated per correction (got McRae=${mcraeN}, Dollerup=${dollerupN}). ` +
        'Is the batch-1 seed loaded in this database?',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
