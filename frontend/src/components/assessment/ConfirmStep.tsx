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

let nextId = 1000;

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
    userEdited: true,
  };
}

function ConfidenceFlag({ confidence }: { confidence: ExtractedItem['confidence'] }) {
  if (confidence === 'high') {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-keep-soft px-2 py-0.5 text-xs font-600 text-keep">
        <IconCheck className="h-3.5 w-3.5" /> Recognized
      </span>
    );
  }
  const label = confidence === 'unmatched' ? 'Not recognized' : 'Low confidence';
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-tier-c-soft px-2 py-0.5 text-xs font-600 text-tier-c">
      <IconAlert className="h-3.5 w-3.5" /> {label} — please check
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
  const flagged = item.confidence !== 'high';

  return (
    <li
      className={`rounded-lg border bg-surface p-4 ${
        flagged ? 'border-tier-c' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ConfidenceFlag confidence={item.confidence} />
          {!editing ? (
            <>
              <p className="mt-2 font-700 text-headline">
                {item.canonicalName || <span className="text-muted">Unnamed item</span>}
              </p>
              <p className="mt-0.5 text-sm text-body">
                {item.dose ? `${item.dose.amount} ${item.dose.unit}` : 'Dose not recognized'}
                {item.deliveryFormat ? ` · ${DELIVERY_LABELS[item.deliveryFormat]}` : ''}
              </p>
              {item.rawText && (
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-600 text-muted">Dose</label>
                  <input
                    inputMode="decimal"
                    value={item.dose?.amount ?? ''}
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      onChange({
                        ...item,
                        dose: e.target.value ? { amount, unit: item.dose?.unit ?? 'mg' } : null,
                        userEdited: true,
                      });
                    }}
                    placeholder="250"
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs font-600 text-muted">Unit</label>
                  <input
                    value={item.dose?.unit ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...item,
                        dose: item.dose
                          ? { ...item.dose, unit: e.target.value }
                          : { amount: 0, unit: e.target.value },
                        userEdited: true,
                      })
                    }
                    placeholder="mg"
                    className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-headline focus:border-accent"
                  />
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

  const lowCount = items.filter((i) => i.confidence !== 'high').length;

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
        <p className="text-xs text-muted">
          We use AI to read your free-text entry and match it to compounds. You&apos;re confirming
          those matches now, before anything is scored.
        </p>
      }
    >
      {lowCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-tier-c-soft px-3 py-2 text-sm text-tier-c">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {lowCount} item{lowCount > 1 ? 's' : ''} need a quick look — we weren&apos;t confident
            about {lowCount > 1 ? 'them' : 'it'}.
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
