'use client';
// Screen 4 — "Confirm What We Found" (prompt §4a). Because extraction is LLM-based and
// sometimes wrong, the user reviews an editable list BEFORE anything downstream treats it
// as ground truth. Low-confidence/unmatched items are visibly flagged, not hidden. The
// user can confirm as-is, correct a match, remove an item, or add one manually. Reviewing
// is enough to continue — editing is optional. This step is what makes the §5 Preview
// honesty rule trustworthy.
import { useState } from 'react';
import { StepShell } from './StepShell';
import { Button } from '@/components/ui/primitives';
import { IconPencil, IconTrash, IconPlus, IconAlert, IconCheck } from '@/components/ui/Icon';
import { DELIVERY_LABELS, type AuditState } from './audit-state';
import type { ExtractedItem, DeliveryFormat } from '@/lib/types';
import {
  INTAKE_METHOD_NOTE,
  CONFIRM_NO_DOSE_BADGE,
  CONFIRM_NO_DOSE_BODY,
  CONFIRM_UNCERTAIN_BADGE,
  unitInferredNote,
} from '@/lib/constants';

let nextId = 1000;

// The units a dose may be entered in — the same set the backend parser understands. Listed
// explicitly so the Unit control is a choice from a known set rather than free text that could
// silently become an unrecognized unit (which the API now refuses to convert rather than
// treating as mg).
const DOSE_UNITS: Array<{ value: string; label: string }> = [
  { value: 'mg', label: 'mg' },
  { value: 'mcg', label: 'mcg' },
  { value: 'g', label: 'g' },
  { value: 'iu', label: 'IU' },
];

/** A dose only exists when BOTH parts are present. No unit means no dose — never a default. */
function composeDose(amount: string | number, unit: string): ExtractedItem['dose'] {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (amount === '' || Number.isNaN(value) || !unit) return null;
  return { amount: value, unit };
}

function blankItem(): ExtractedItem {
  return {
    clientId: `manual-${nextId++}`,
    rawText: '',
    canonicalName: '',
    compoundId: null,
    dose: null,
    deliveryFormat: null,
    monthlyPrice: null,
    confidence: 'high',
    doseState: 'missing',
    userEdited: true,
  };
}

/**
 * Badge for ONE item, expressing two independent facts (CLAIMS_COMPLIANCE §4b):
 * whether the compound was recognized, and whether it still needs a dose.
 *
 * The warning treatment is now reserved for a genuinely uncertain MATCH. A recognized compound
 * awaiting a dose gets a neutral "Add a dose" chip: nothing about it is doubtful, so styling it
 * as a problem told the user we were unsure of something we were not unsure of.
 */
function ItemFlag({ item }: { item: ExtractedItem }) {
  if (item.confidence === 'unmatched') {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-tier-c-soft px-2 py-0.5 text-xs font-600 text-tier-c">
        <IconAlert className="h-3.5 w-3.5" /> Not recognized — please check
      </span>
    );
  }
  if (item.confidence === 'low') {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-tier-c-soft px-2 py-0.5 text-xs font-600 text-tier-c">
        <IconAlert className="h-3.5 w-3.5" /> {CONFIRM_UNCERTAIN_BADGE}
      </span>
    );
  }
  // Recognized. The only remaining question is the dose — a neutral prompt, not a warning.
  if (item.doseState === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-surface-subtle px-2 py-0.5 text-xs font-600 text-body">
        <IconPlus className="h-3.5 w-3.5" /> {CONFIRM_NO_DOSE_BADGE}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-keep-soft px-2 py-0.5 text-xs font-600 text-keep">
      <IconCheck className="h-3.5 w-3.5" /> Recognized
    </span>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: ExtractedItem;
  onChange: (next: ExtractedItem) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(item.confidence !== 'high' && !item.canonicalName);
  // Held locally so a half-entered dose ("250", no unit yet) survives a re-render without
  // being written to state as a dose. Only composeDose() promotes the pair to a real dose.
  const [amountDraft, setAmountDraft] = useState(item.dose ? String(item.dose.amount) : '');
  const [unitDraft, setUnitDraft] = useState(item.dose?.unit ?? '');
  // The yellow border marks an uncertain MATCH only. A recognized compound waiting on a dose is
  // not a problem to flag — it is a field to fill.
  const flagged = item.confidence !== 'high';

  return (
    <li
      className={`rounded-lg border bg-surface p-4 ${
        flagged ? 'border-tier-c' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ItemFlag item={item} />
          {!editing ? (
            <>
              <p className="mt-2 font-700 text-headline">
                {item.canonicalName || <span className="text-muted">Unnamed item</span>}
              </p>
              <p className="mt-0.5 text-sm text-body">
                {item.dose ? `${item.dose.amount} ${item.dose.unit}` : 'Dose not recognized'}
                {item.deliveryFormat ? ` · ${DELIVERY_LABELS[item.deliveryFormat]}` : ''}
              </p>
              {/* §4b: an inferred unit MUST be shown, stating the value as entered and the unit
                  applied, and must stay editable — an inference the user cannot see must not be
                  scored. The resolved dose renders normally above; this sits beneath it. */}
              {item.doseState === 'assumed' && item.dose && (
                <p className="mt-1 text-xs text-body">
                  {unitInferredNote(item.rawText, item.dose.unit)}
                </p>
              )}
              {item.doseState === 'missing' && item.confidence === 'high' && (
                <p className="mt-1 text-xs text-muted">{CONFIRM_NO_DOSE_BODY}</p>
              )}
              {item.rawText && item.doseState !== 'assumed' && (
                <p className="mt-1 text-xs text-muted">You typed: “{item.rawText}”</p>
              )}
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-600 text-muted">Compound name</label>
                <input
                  value={item.canonicalName ?? ''}
                  onChange={(e) => onChange({ ...item, canonicalName: e.target.value, userEdited: true })}
                  placeholder="e.g. Resveratrol"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                />
              </div>
              {/* A dose exists only when BOTH an amount and a unit are present.
                  The Dose box used to write `unit: item.dose?.unit ?? 'mg'` — a global mg
                  fallback applied invisibly, with no unit rendered anywhere, which is exactly
                  what CLAIMS_COMPLIANCE §4b forbids: an inferred unit the user cannot see must
                  not be scored, and a unit may only come from the compound's own stored default
                  or from an explicit choice. There is no compound default to reach for here, so
                  the choice is the user's, made visibly, or there is no dose. */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-600 text-muted">Dose</label>
                  <input
                    inputMode="decimal"
                    value={item.dose?.amount ?? amountDraft}
                    onChange={(e) => {
                      setAmountDraft(e.target.value);
                      onChange({ ...item, dose: composeDose(e.target.value, unitDraft), userEdited: true });
                    }}
                    placeholder="250"
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                  />
                </div>
                <div className="w-28">
                  <label className="text-xs font-600 text-muted">Unit</label>
                  <select
                    value={item.dose?.unit ?? unitDraft}
                    onChange={(e) => {
                      setUnitDraft(e.target.value);
                      onChange({
                        ...item,
                        dose: composeDose(item.dose?.amount ?? amountDraft, e.target.value),
                        userEdited: true,
                      });
                    }}
                    className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                  >
                    <option value="">Not sure</option>
                    {DOSE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-600 text-muted">Format</label>
                <select
                  value={item.deliveryFormat ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...item,
                      deliveryFormat: (e.target.value || null) as DeliveryFormat | null,
                      userEdited: true,
                    })
                  }
                  className="mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                >
                  <option value="">Not sure</option>
                  {Object.entries(DELIVERY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label={editing ? 'Done editing' : 'Correct this match'}
            onClick={() => setEditing((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-subtle hover:text-accent"
          >
            {editing ? <IconCheck className="h-5 w-5" /> : <IconPencil className="h-5 w-5" />}
          </button>
          <button
            aria-label="Remove this item"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-stop-soft hover:text-stop"
          >
            <IconTrash className="h-5 w-5" />
          </button>
        </div>
      </div>
    </li>
  );
}

export function ConfirmStep({
  state,
  patch,
  onBack,
  onContinue,
}: {
  state: AuditState;
  patch: (p: Partial<AuditState>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [items, setItems] = useState<ExtractedItem[]>(state.extracted);

  const update = (next: ExtractedItem[]) => {
    setItems(next);
    patch({ extracted: next });
  };

  // Counts genuinely uncertain MATCHES only. It used to count `confidence !== 'high'`, which
  // — because a doseless item was demoted to 'low' — announced "2 items need a quick look"
  // over two compounds we had matched exactly. Items awaiting a dose are prompted on the row
  // itself and are not counted here; at zero the banner does not render at all.
  const uncertainCount = items.filter((i) => i.confidence !== 'high').length;

  return (
    <StepShell
      step="Confirm"
      title="Here's what we found — anything to fix?"
      subtext="We read your entry and matched it to compounds in our database. Check the flagged items, then continue. You don't have to change anything."
      onBack={onBack}
      onContinue={() => {
        patch({ extracted: items, reviewedExtraction: true });
        onContinue();
      }}
      continueLabel="Looks right — continue"
      footnote={
        <p className="text-xs text-muted">{INTAKE_METHOD_NOTE}</p>
      }
    >
      {uncertainCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-tier-c-soft px-3 py-2 text-sm text-tier-c">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {uncertainCount} item{uncertainCount > 1 ? 's' : ''} need a quick look — we
            weren&apos;t confident about {uncertainCount > 1 ? 'them' : 'it'}.
          </span>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <ItemRow
            key={item.clientId}
            item={item}
            onChange={(next) => update(items.map((i) => (i.clientId === item.clientId ? next : i)))}
            onRemove={() => update(items.filter((i) => i.clientId !== item.clientId))}
          />
        ))}
      </ul>

      <button
        onClick={() => update([...items, blankItem()])}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-600 text-accent hover:border-accent"
      >
        <IconPlus className="h-4 w-4" /> Add something we missed
      </button>
    </StepShell>
  );
}
