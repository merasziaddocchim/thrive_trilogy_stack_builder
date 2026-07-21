// Free-text → candidate extraction (TECH_DOCS §1a). Two implementations of `Extractor`:
//
//  1. HeuristicExtractor — deterministic regex/keyword parsing. No network, no secrets, so
//     the module is fully testable and runnable without an LLM key. Used as the default and
//     as a graceful fallback.
//  2. LlmExtractor — the production path: an injected `complete()` function (any provider,
//     e.g. an Anthropic client wired at the API/config layer) turns free text into the same
//     RawCandidate JSON. The concrete provider is an integration decision left to the caller
//     (FLAGGED: the prompt specifies "an LLM call" but not which model/provider).
//
// Compliance: nothing here emits user-facing claim text; it only produces structured data.
import type { Extractor, RawCandidate, DeliveryFormat } from './types.js';

const DELIVERY_KEYWORDS: Array<[RegExp, DeliveryFormat]> = [
  [/liposom/i, 'liposomal'],
  [/sublingual|under the tongue/i, 'sublingual'],
  [/inject|subcutaneous|\bsub-?q\b/i, 'injectable'],
  [/powder|scoop/i, 'powder'],
  [/capsule|cap\b|tablet|tab\b|softgel|pill/i, 'standard_capsule'],
];

// A dose like "250mg", "1 g", "500 mcg", "5000 IU". First match on the line wins.
const DOSE_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|iu)\b/i;
// A "2x/day" or "twice a day" multiplier, so "500mg 2x day" resolves to a daily 1000mg.
const TWICE_RE = /(?:2x|2 x|twice)\b/i;
const THRICE_RE = /(?:3x|3 x|three times|thrice)\b/i;
// A price like "$45", "$45/mo", "about $45".
const PRICE_RE = /\$\s?(\d+(?:\.\d+)?)/;

export class HeuristicExtractor implements Extractor {
  async extract(text: string): Promise<RawCandidate[]> {
    return this.segment(text).map((segment) => this.parseLine(segment));
  }

  // One segment per compound. Users separate compounds by newlines OR by commas/semicolons on
  // a single line ("NMN 500mg, Berberine 500mg, TMG 500"). Splitting on newlines alone (the old
  // behavior) collapsed a comma-separated stack into a single segment, matched only the first
  // compound, and silently dropped the rest — the reported bug. So split on newlines,
  // semicolons, and commas, with two guards that keep the split from mangling normal input:
  //   • a comma inside parentheses never splits — brand/format notes like
  //     "(Renue by Science, sublingual)" stay intact; and
  //   • a fragment that only qualifies the previous compound (a dose/price/format/frequency
  //     with no name of its own, e.g. "1 scoop", "5000 IU", "at night") is merged back into it,
  //     so we neither emit a nameless candidate nor over-split "Vitamin D, 5000 IU".
  // Anything that isn't a clear qualifier becomes its own confirmable item — nothing is dropped.
  private segment(text: string): string[] {
    const rawParts: string[] = [];
    let buf = '';
    let parenDepth = 0;
    for (const ch of text) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      const isTopLevelDelimiter =
        parenDepth === 0 && (ch === ',' || ch === ';' || ch === '\n' || ch === '\r');
      if (isTopLevelDelimiter) {
        const trimmed = buf.trim();
        if (trimmed) rawParts.push(trimmed);
        buf = '';
      } else {
        buf += ch;
      }
    }
    const tail = buf.trim();
    if (tail) rawParts.push(tail);

    const segments: string[] = [];
    for (const part of rawParts) {
      if (segments.length > 0 && this.isQualifierOnlyFragment(part)) {
        segments[segments.length - 1] += ` ${part}`;
      } else {
        segments.push(part);
      }
    }
    return segments;
  }

  // True when a fragment carries only dose/price/format/frequency info and no compound name —
  // it belongs to the preceding compound, not a standalone item. Used to undo an over-split on
  // a comma that separated a compound from its own dose ("Vitamin D, 5000 IU" / "resv, 1 scoop").
  private isQualifierOnlyFragment(fragment: string): boolean {
    const residue = fragment
      .replace(DOSE_RE, ' ')
      .replace(/\$\s?\d+(?:\.\d+)?(\s*\/?\s*mo(?:nth)?)?/gi, ' ')
      .replace(/\b\d+\s*x\b|\btwice\b|\bthree times\b|\bthrice\b|\bper day\b|\ba day\b|\bat night\b|\bdaily\b/gi, ' ')
      .replace(
        /\b(?:iu|mg|mcg|µg|g|scoops?|caps?|capsules?|tabs?|tablets?|softgels?|pills?|powder|liposomal|sublingual|subcutaneous|injections?|injectable)\b/gi,
        ' ',
      )
      .replace(/\d+(?:\.\d+)?/g, ' ')
      .replace(/[^a-z]+/gi, ' ')
      .trim();
    return residue.length === 0;
  }

  private parseLine(line: string): RawCandidate {
    let dose: RawCandidate['dose'] = null;
    const doseMatch = line.match(DOSE_RE);
    if (doseMatch) {
      let amount = Number(doseMatch[1]);
      const unit = doseMatch[2].toLowerCase().replace('µg', 'mcg');
      if (TWICE_RE.test(line)) amount *= 2;
      else if (THRICE_RE.test(line)) amount *= 3;
      dose = { amount, unit };
    }

    let monthlyPrice: number | null = null;
    const priceMatch = line.match(PRICE_RE);
    if (priceMatch) monthlyPrice = Number(priceMatch[1]);

    let deliveryFormat: DeliveryFormat | null = null;
    for (const [re, format] of DELIVERY_KEYWORDS) {
      if (re.test(line)) {
        deliveryFormat = format;
        break;
      }
    }

    // Name guess: strip parentheticals (brand/format notes), dose, price, and frequency
    // fragments, leaving roughly the compound name.
    const nameGuess = line
      .replace(/\([^)]*\)/g, ' ')
      .replace(DOSE_RE, ' ')
      .replace(/\$\s?\d+(?:\.\d+)?(\s*\/?\s*mo(?:nth)?)?/gi, ' ')
      .replace(/\b\d+\s*x\b|\btwice\b|\bthree times\b|\bthrice\b|\bper day\b|\ba day\b|\bat night\b|\bdaily\b/gi, ' ')
      .replace(/[-–,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { rawText: line, nameGuess, dose, deliveryFormat, monthlyPrice };
  }
}

/** Signature for an injected LLM completion (provider-agnostic). */
export type Complete = (prompt: string) => Promise<string>;

export const EXTRACTION_PROMPT_PREFIX = [
  'Extract each supplement or compound the user lists from the text below.',
  'Return ONLY a JSON array; each element: {"rawText","nameGuess","dose":{"amount","unit"}|null,',
  '"deliveryFormat":("standard_capsule"|"liposomal"|"sublingual"|"powder"|"injectable")|null,',
  '"monthlyPrice":number|null}. Do not infer values that are not present. Text:',
].join(' ');

export class LlmExtractor implements Extractor {
  constructor(
    private readonly complete: Complete,
    private readonly fallback: Extractor = new HeuristicExtractor(),
  ) {}

  async extract(text: string): Promise<RawCandidate[]> {
    try {
      const raw = await this.complete(`${EXTRACTION_PROMPT_PREFIX}\n${text}`);
      const parsed = JSON.parse(extractJsonArray(raw)) as RawCandidate[];
      if (!Array.isArray(parsed)) throw new Error('LLM did not return an array');
      return parsed.map(normalizeCandidate);
    } catch {
      // On any LLM/parse failure, degrade to deterministic extraction rather than error out.
      return this.fallback.extract(text);
    }
  }
}

function extractJsonArray(s: string): string {
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  return start >= 0 && end > start ? s.slice(start, end + 1) : '[]';
}

function normalizeCandidate(c: RawCandidate): RawCandidate {
  return {
    rawText: String(c.rawText ?? ''),
    nameGuess: String(c.nameGuess ?? ''),
    dose:
      c.dose && typeof c.dose.amount === 'number'
        ? { amount: c.dose.amount, unit: String(c.dose.unit ?? 'mg') }
        : null,
    deliveryFormat: c.deliveryFormat ?? null,
    monthlyPrice: typeof c.monthlyPrice === 'number' ? c.monthlyPrice : null,
  };
}
