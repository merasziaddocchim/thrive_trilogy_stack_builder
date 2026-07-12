// TECH_DOCS §2 Step 3 — Estimated Annual Waste. Kept SEPARATE from the 0–100 score,
// never folded in. Always a low–high RANGE, never a false-precision single number.
import { UNDERDOSE_WASTE_BAND, MONTHS_PER_YEAR } from './constants.js';
import type { ScoredCompoundInput, CompoundSubScore, DollarWaste } from './types.js';

/** A stack item paired with its computed sub-score, so waste can read both cost and dosing. */
export interface ScoredItem {
  item: ScoredCompoundInput;
  sub: CompoundSubScore;
}

/**
 * Redundancy Waste: within each group of products sharing an active ingredient, keep the
 * single best-dosed, lowest-cost product; every other product in that group is redundant
 * spend. Products with no sharedIngredientKey are never redundant. Monthly dollars.
 */
export function redundancyWasteMonthly(scored: ScoredItem[]): number {
  const groups = new Map<string, ScoredItem[]>();
  for (const s of scored) {
    const key = s.item.sharedIngredientKey;
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }

  let waste = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Keeper: highest dosing accuracy, tie-break lowest cost.
    const keeper = [...group].sort(
      (a, b) =>
        b.sub.dosingAccuracy - a.sub.dosingAccuracy ||
        a.item.dollarsSpent - b.item.dollarsSpent,
    )[0];
    for (const s of group) {
      if (s === keeper) continue;
      waste += Math.max(0, s.item.dollarsSpent);
    }
  }
  return waste;
}

/**
 * Underdosing Waste: for products scoring below full dosing accuracy, an estimated portion
 * of their spend is not producing the intended structure/function benefit. Expressed as a
 * band (TECH_DOCS §2 Step 3 requires a range). Redundant products are excluded here so their
 * spend is not double-counted against the redundancy figure.
 */
export function underdosingWasteMonthly(
  scored: ScoredItem[],
  redundantItemIds: ReadonlySet<ScoredItem>,
): { low: number; high: number } {
  let point = 0;
  for (const s of scored) {
    if (redundantItemIds.has(s)) continue;
    const da = s.sub.dosingAccuracy;
    if (da >= 100) continue;
    const shortfall = (100 - da) / 100;
    point += Math.max(0, s.item.dollarsSpent) * shortfall;
  }
  return {
    low: point * UNDERDOSE_WASTE_BAND.lowFactor,
    high: point * UNDERDOSE_WASTE_BAND.highFactor,
  };
}

/** Identify which scored items are the redundant (non-keeper) products in their group. */
export function redundantItems(scored: ScoredItem[]): Set<ScoredItem> {
  const groups = new Map<string, ScoredItem[]>();
  for (const s of scored) {
    const key = s.item.sharedIngredientKey;
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  const redundant = new Set<ScoredItem>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keeper = [...group].sort(
      (a, b) =>
        b.sub.dosingAccuracy - a.sub.dosingAccuracy ||
        a.item.dollarsSpent - b.item.dollarsSpent,
    )[0];
    for (const s of group) if (s !== keeper) redundant.add(s);
  }
  return redundant;
}

export function computeDollarWaste(scored: ScoredItem[]): DollarWaste {
  const redundant = redundantItems(scored);
  const redundancyMonthly = redundancyWasteMonthly(scored);
  const under = underdosingWasteMonthly(scored, redundant);

  const monthlyLow = redundancyMonthly + under.low;
  const monthlyHigh = redundancyMonthly + under.high;
  return {
    redundancyMonthly: round2(redundancyMonthly),
    underdosingMonthlyLow: round2(under.low),
    underdosingMonthlyHigh: round2(under.high),
    annualLow: Math.round(monthlyLow * MONTHS_PER_YEAR),
    annualHigh: Math.round(monthlyHigh * MONTHS_PER_YEAR),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
