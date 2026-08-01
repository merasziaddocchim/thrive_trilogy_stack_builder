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
import { normalizeUnit } from './units.js';

const DELIVERY_KEYWORDS: Array<[RegExp, DeliveryFormat]> = [
  [/liposom/i, 'liposomal'],
  [/sublingual|under the tongue/i, 'sublingual'],
  [/inject|subcutaneous|\bsub-?q\b/i, 'injectable'],
  [/powder|scoop/i, 'powder'],
  [/capsule|cap\b|tablet|tab\b|softgel|pill/i, 'standard_capsule'],
];

// A dose like "250mg", "1 g", "500 mcg", "5000 IU". First match on the line wins.
const DOSE_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|iu)\b/i;
// A dose with NO unit — "NMN 250", the single most common way users type a stack. Captured as
// its own state (`unitlessAmount`) rather than folded into `dose`, because the extractor runs
// BEFORE compound matching and therefore cannot know which unit applies: that is resolved in
// parseIntake from the matched compound's `default_unit` (CLAIMS_COMPLIANCE §4b).
//
// `\b` on both sides means a digit welded to letters is NOT a bare dose — "D3", "B12", "CoQ10"
// have no word boundary between the letter and the digit, so they are left alone.
const BARE_NUMBER_RE = /\b(\d+(?:\.\d+)?)\b/;
// A COUNT of dosage forms — "1 scoop", "2 capsules", "3 softgels". A count is not a dose: how
// much is in a scoop is exactly what we don't know. Same nouns the COMMENTARY_WORDS stripper
// below already treats as non-name tokens.
const COUNT_RE =
  /\b\d+(?:\.\d+)?\s*(?:scoops?|caps?|capsules?|tabs?|tablets?|softgels?|pills?|servings?|drops?|sprays?|pumps?|gummies|gummy|sachets?|sticks?)\b/gi;
// A "2x/day" or "twice a day" multiplier, so "500mg 2x day" resolves to a daily 1000mg.
const TWICE_RE = /(?:2x|2 x|twice)\b/i;
const THRICE_RE = /(?:3x|3 x|three times|thrice)\b/i;
// A price like "$45", "$45/mo", "about $45".
const PRICE_RE = /\$\s?(\d+(?:\.\d+)?)/;

// Closed lexicon of "filler" words: grammar/stopwords, uncertainty/hedges, and dose nouns.
// Used only to tell a trailing COMMENTARY fragment ("not sure of the dose") apart from a
// possible unrecognized COMPOUND name. A fragment merges into the preceding compound only when
// ALL of its residual name tokens are filler; a single non-filler word (a plausible name)
// keeps it as its own flagged row. Bias is deliberately toward surfacing — never silently drop.
const COMMENTARY_WORDS = new Set<string>([
  // grammar / stopwords
  'a', 'an', 'the', 'of', 'on', 'in', 'at', 'to', 'for', 'with', 'and', 'or', 'per',
  'my', 'its', 'it', 'is', 'was', 'im', 'i', 'am', 'me', 'that', 'this', 'as', 'but',
  // uncertainty / hedges
  'not', 'no', 'sure', 'unsure', 'maybe', 'perhaps', 'probably', 'possibly', 'unknown',
  'idk', 'dunno', 'dont', 'do', 'know', 'knew', 'remember', 'forget', 'forgot', 'cant',
  'cannot', 'wont', 'didnt', 'doesnt', 'havent', 'recall', 'idea', 'think', 'thinking',
  'guess', 'roughly', 'about', 'around', 'approx', 'approximately', 'ish', 'some', 'sort',
  'kind', 'bit', 'little', 'few', 'couple', 'several', 'various', 'whatever', 'something',
  'anything', 'stuff', 'thing', 'things', 'not_sure', 'unsure',
  // dose / quantity nouns (the substance of a "how much?" note, not a compound name)
  'dose', 'doses', 'dosage', 'amount', 'amounts', 'quantity', 'serving', 'servings', 'much',
]);

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
  //   • a fragment that only qualifies or comments on the previous compound (a dose/format/
  //     frequency with no name of its own — "1 scoop", "5000 IU", "at night" — OR a free-text
  //     note whose only words are filler/uncertainty — "not sure of the dose") is merged back
  //     into it, so we neither emit a nameless candidate, over-split "Vitamin D, 5000 IU", nor
  //     surface commentary as a spurious "Not recognized" row.
  // A fragment with any plausible name word of its own (e.g. "quercetin", "Vitamin D", "NR")
  // is NEVER merged — it stays a flagged item so a real-but-unrecognized compound is never
  // silently dropped. Bias throughout is toward surfacing.
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
      if (segments.length > 0 && this.mergesIntoPreceding(part)) {
        segments[segments.length - 1] += ` ${part}`;
      } else {
        segments.push(part);
      }
    }
    return segments;
  }

  // Decide whether a trailing fragment belongs to the preceding compound (merge) or is its own
  // item (keep). It merges only when it has NO plausible compound-name word of its own — i.e.
  // once dose/price/format/frequency tokens are stripped, every remaining word is either
  // nothing (a pure qualifier like "5000 IU"/"1 scoop") or a filler/uncertainty word (a comment
  // like "not sure of the dose"). Any residual "content word" — a token ≥2 letters not in the
  // COMMENTARY_WORDS lexicon — means the fragment could be a real compound we don't recognize,
  // so it is kept and surfaced as a flagged row rather than silently absorbed.
  private mergesIntoPreceding(fragment: string): boolean {
    return this.contentWords(fragment).length === 0;
  }

  /** Residual name tokens after removing dose/price/format/frequency, numbers, and filler. */
  private contentWords(fragment: string): string[] {
    return fragment
      .replace(DOSE_RE, ' ')
      .replace(/\$\s?\d+(?:\.\d+)?(\s*\/?\s*mo(?:nth)?)?/gi, ' ')
      .replace(/\b\d+\s*x\b|\btwice\b|\bthree times\b|\bthrice\b|\bper day\b|\ba day\b|\bat night\b|\bdaily\b/gi, ' ')
      .replace(
        /\b(?:iu|mg|mcg|µg|g|scoops?|caps?|capsules?|tabs?|tablets?|softgels?|pills?|powder|liposomal|sublingual|subcutaneous|injections?|injectable)\b/gi,
        ' ',
      )
      .replace(/\d+(?:\.\d+)?/g, ' ')
      .replace(/['’]/g, '') // fold contractions: "don't" -> "dont" so it matches the lexicon
      .toLowerCase()
      .split(/[^a-z]+/)
      // A content word is ≥2 letters and not filler. Single letters (e.g. the "D" in
      // "Vitamin D", stray plural/contraction artifacts) are ignored — no compound name is one
      // character, so ignoring them cannot drop a real compound.
      .filter((t) => t.length >= 2 && !COMMENTARY_WORDS.has(t));
  }

  /** Apply a "2x/day" or "3x/day" multiplier so a per-serving figure becomes a daily one. */
  private perDay(amount: number, line: string): number {
    if (TWICE_RE.test(line)) return amount * 2;
    if (THRICE_RE.test(line)) return amount * 3;
    return amount;
  }

  /**
   * The unitless quantity on a line, or null. Only consulted when DOSE_RE found nothing, so a
   * line that states its unit never reaches here.
   *
   * Everything that is a number but NOT a dose is removed first, because each of these would
   * otherwise be resolved into a dose that the user never gave:
   *   • a price      — "$45"       would become 45 mg
   *   • a frequency  — "2x/day"    would become 2 mg
   *   • a COUNT      — "1 scoop"   would become 1 mg
   * The count case is the one that matters most: a serving count is the commonest way to write
   * a dose you don't know ("1 scoop", "2 capsules"), so reading it as a quantity would turn
   * "I don't know my dose" into a confident, and absurd, 1 mg.
   */
  private bareAmount(line: string): number | null {
    const stripped = line
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\$\s?\d+(?:\.\d+)?(\s*\/?\s*mo(?:nth)?)?/gi, ' ')
      .replace(/\b\d+\s*x\b|\btwice\b|\bthree times\b|\bthrice\b/gi, ' ')
      .replace(COUNT_RE, ' ');
    const m = stripped.match(BARE_NUMBER_RE);
    return m ? Number(m[1]) : null;
  }

  private parseLine(line: string): RawCandidate {
    let dose: RawCandidate['dose'] = null;
    let unitlessAmount: number | null = null;
    const doseMatch = line.match(DOSE_RE);
    if (doseMatch) {
      const unit = doseMatch[2].toLowerCase().replace('µg', 'mcg');
      dose = { amount: this.perDay(Number(doseMatch[1]), line), unit };
    } else {
      const bare = this.bareAmount(line);
      if (bare != null) unitlessAmount = this.perDay(bare, line);
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
    let nameGuess = line
      .replace(/\([^)]*\)/g, ' ')
      .replace(DOSE_RE, ' ')
      .replace(/\$\s?\d+(?:\.\d+)?(\s*\/?\s*mo(?:nth)?)?/gi, ' ')
      .replace(/\b\d+\s*x\b|\btwice\b|\bthree times\b|\bthrice\b|\bper day\b|\ba day\b|\bat night\b|\bdaily\b/gi, ' ')
      .replace(/[-–,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // A bare number we took as a quantity must not also be read as part of the name: without
    // this, "NMN 250" is matched as the phrase "NMN 250". It matched anyway, but only because
    // similarity() rewards token containment — leaving the digits in makes the match depend on
    // that, and removing them is what makes it a match on the name itself.
    if (unitlessAmount != null) {
      nameGuess = nameGuess.replace(BARE_NUMBER_RE, ' ').replace(/\s+/g, ' ').trim();
    }

    return { rawText: line, nameGuess, dose, unitlessAmount, deliveryFormat, monthlyPrice };
  }
}

/** Signature for an injected LLM completion (provider-agnostic). */
export type Complete = (prompt: string) => Promise<string>;

export const EXTRACTION_PROMPT_PREFIX = [
  'Extract each supplement or compound the user lists from the text below.',
  'Return ONLY a JSON array; each element: {"rawText","nameGuess","dose":{"amount","unit"}|null,',
  '"unitlessAmount":number|null,',
  '"deliveryFormat":("standard_capsule"|"liposomal"|"sublingual"|"powder"|"injectable")|null,',
  '"monthlyPrice":number|null}. Do not infer values that are not present.',
  'If the user gave a number with no unit, put it in unitlessAmount and set dose to null.',
  'Never guess a unit. Text:',
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
  // An amount whose unit the model omitted or invented is NOT a dose. This used to read
  // `String(c.dose.unit ?? 'mg')` — a global mg fallback in the parser, the exact thing
  // CLAIMS_COMPLIANCE §4b forbids, and unreviewable because it happened inside a JSON
  // normalizer. Such an amount is now demoted to `unitlessAmount`, where it can only become a
  // dose via the matched compound's stored default_unit, and only with the inference disclosed.
  const amount = typeof c.dose?.amount === 'number' ? c.dose.amount : null;
  const unit = normalizeUnit(c.dose?.unit);
  const bare = typeof c.unitlessAmount === 'number' ? c.unitlessAmount : null;

  return {
    rawText: String(c.rawText ?? ''),
    nameGuess: String(c.nameGuess ?? ''),
    dose: amount != null && unit != null ? { amount, unit } : null,
    unitlessAmount: amount != null && unit == null ? amount : bare,
    deliveryFormat: c.deliveryFormat ?? null,
    monthlyPrice: typeof c.monthlyPrice === 'number' ? c.monthlyPrice : null,
  };
}
