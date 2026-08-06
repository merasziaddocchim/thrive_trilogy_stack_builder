// CLAIMS_COMPLIANCE §4e — compounds the registry recognises and the evidence review has not
// reached.
//
// DELIBERATELY NOT A FIFTH ACTION SECTION. Stop, Adjust and Keep each assert something about a
// compound's evidence, and §4e is explicit: "Absence of review is not a finding, and must never
// be rendered as one." So this renders as a plain list — no coloured left border, no action
// pill, no tier badge, no cost. It sits after Start because it is the least actionable thing on
// the page, not because it ranks below it.
//
// The heading and description come from the API rather than being written here: they are
// founder-approved copy held once in the backend's claim-templates, so this component cannot
// drift from the approved wording.
import type { NotYetReviewed as NotYetReviewedData } from '@/lib/types';

export function NotYetReviewed({ data }: { data: NotYetReviewedData | undefined }) {
  if (!data || data.compounds.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-700 text-headline">{data.heading}</h2>
      <p className="mt-1.5 text-sm text-body">{data.description}</p>
      <ul className="mt-3 space-y-1.5">
        {data.compounds.map((c) => (
          <li
            key={c.compound_id}
            className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-body"
          >
            {c.compound}
          </li>
        ))}
      </ul>
    </section>
  );
}
