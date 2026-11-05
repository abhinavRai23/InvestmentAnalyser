import { LiveData } from "./providers/types";

export interface StockTarget {
  key: string; // Canonical identifier (uppercase normalized name, ticker, or isin)
  symbol?: string;
  name?: string;
  isin?: string;
  targetPrice?: number;
  stopLossPrice?: number;
  notes?: string;
  tag?: string; // 'Core Long-Term' | 'Swing Trade' | 'Dividend Bet' | 'Speculative' | string
  createdAt?: string;
  updatedAt?: string;
}

export type StockSignalType =
  | "TARGET_REACHED" // Info / Sell signal: current price >= targetPrice
  | "STOP_LOSS_HIT" // Danger alert: current price <= stopLossPrice
  | "NEAR_52W_LOW" // Danger / Breakdown warning: price <= 1.08 * 52w low (within 8-10%)
  | "NEAR_TARGET" // Approaching target: price >= 0.95 * targetPrice
  | "ABOVE_52W_AVG" // Bullish: price >= 52w Avg/Midpoint
  | "BELOW_52W_AVG" // Warning: price < 52w Avg/Midpoint
  | "NEUTRAL"; // No specific technical signal

export interface StockSignalEvaluation {
  primarySignal: StockSignalType;
  badgeLabel: string;
  badgeVariant: "info" | "destructive" | "warning" | "success" | "outline";
  badgeClass: string;
  iconName: "target" | "stop-circle" | "alert-triangle" | "trending-up" | "trending-down" | "info";
  message: string;
  targetPrice?: number;
  stopLossPrice?: number;
  distanceToTargetPct?: number; // % distance from current price to target
  distanceTo52wLowPct?: number; // % distance above 52w low
  distanceTo52wAvgPct?: number; // % distance from 52w avg
  notes?: string;
  tag?: string;
  hasCustomPlan: boolean;
}

/**
 * Resolves a normalized canonical key for indexing and finding stock targets.
 */
export function normalizeStockKey(nameOrSymbolOrIsin: string): string {
  return nameOrSymbolOrIsin.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Finds a saved stock target matching a holding by name, symbol, or ISIN.
 */
export function findMatchingStockTarget(
  holding: { name: string; isin?: string },
  symbol?: string | null,
  targetsMap?: Record<string, StockTarget>
): StockTarget | undefined {
  if (!targetsMap) return undefined;

  const keysToTry: string[] = [];
  if (holding.name) keysToTry.push(normalizeStockKey(holding.name));
  if (holding.isin) keysToTry.push(normalizeStockKey(holding.isin));
  if (symbol) keysToTry.push(normalizeStockKey(symbol));

  for (const k of keysToTry) {
    if (targetsMap[k]) return targetsMap[k];
  }
  return undefined;
}

/**
 * Evaluates market status and custom goals for a stock holding.
 */
export function evaluateStockSignal(
  currentPrice: number,
  liveData?: LiveData | null,
  target?: StockTarget | null
): StockSignalEvaluation {
  const targetPrice = target?.targetPrice && target.targetPrice > 0 ? target.targetPrice : undefined;
  const stopLossPrice = target?.stopLossPrice && target.stopLossPrice > 0 ? target.stopLossPrice : undefined;
  const notes = target?.notes?.trim() || undefined;
  const tag = target?.tag || undefined;
  const hasCustomPlan = Boolean(targetPrice || stopLossPrice || notes);

  const fiftyTwoLow = liveData?.fiftyTwoWeekLow;
  const fiftyTwoHigh = liveData?.fiftyTwoWeekHigh;
  const fiftyTwoAvg =
    liveData?.fiftyTwoWeekAvg ??
    (fiftyTwoHigh !== undefined && fiftyTwoLow !== undefined ? (fiftyTwoHigh + fiftyTwoLow) / 2 : undefined);

  // Distances
  const distToTarget = targetPrice && currentPrice > 0 ? ((targetPrice - currentPrice) / currentPrice) * 100 : undefined;
  const distTo52Low = fiftyTwoLow && fiftyTwoLow > 0 ? ((currentPrice - fiftyTwoLow) / fiftyTwoLow) * 100 : undefined;
  const distTo52Avg = fiftyTwoAvg && fiftyTwoAvg > 0 ? ((currentPrice - fiftyTwoAvg) / fiftyTwoAvg) * 100 : undefined;

  // 1. User Target Reached (Highest priority: actionable sell / take-profit condition)
  if (targetPrice && currentPrice >= targetPrice) {
    const diffPct = Math.abs(distToTarget ?? 0).toFixed(1);
    return {
      primarySignal: "TARGET_REACHED",
      badgeLabel: "Target Met: Sell",
      badgeVariant: "info",
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
      iconName: "info",
      message: `Price (₹${currentPrice}) has reached your target of ₹${targetPrice} (${diffPct}% exceeded). Consider taking profit.`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 2. User Stop Loss Breached (Top risk priority)
  if (stopLossPrice && currentPrice <= stopLossPrice) {
    return {
      primarySignal: "STOP_LOSS_HIT",
      badgeLabel: "Stop Loss Hit",
      badgeVariant: "destructive",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      iconName: "stop-circle",
      message: `Price (₹${currentPrice}) dropped below your stop-loss floor of ₹${stopLossPrice}. Review risk tolerance.`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 3. Near 52-Week Low (Danger alert / Breakdown risk: within 8% of 52w low)
  if (distTo52Low !== undefined && distTo52Low <= 8.0 && distTo52Low >= -5.0) {
    return {
      primarySignal: "NEAR_52W_LOW",
      badgeLabel: `Near 52W Low (+${Math.max(0, distTo52Low).toFixed(1)}%)`,
      badgeVariant: "destructive",
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
      iconName: "alert-triangle",
      message: `Trading at ₹${currentPrice}, only ${distTo52Low.toFixed(1)}% above 52-week low (₹${fiftyTwoLow}). Downside breakdown risk.`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 4. Approaching Target Sell Price (Within 5% of target)
  if (targetPrice && distToTarget !== undefined && distToTarget > 0 && distToTarget <= 5.0) {
    return {
      primarySignal: "NEAR_TARGET",
      badgeLabel: `Near Target (${distToTarget.toFixed(1)}% away)`,
      badgeVariant: "info",
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      iconName: "target",
      message: `Approaching target: ₹${targetPrice} (${distToTarget.toFixed(1)}% remaining).`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 5. Above 52-Week Average (Bullish technical momentum)
  if (fiftyTwoAvg !== undefined && currentPrice >= fiftyTwoAvg) {
    const abovePct = Math.abs(distTo52Avg ?? 0).toFixed(1);
    return {
      primarySignal: "ABOVE_52W_AVG",
      badgeLabel: `Above 52W Avg (+${abovePct}%)`,
      badgeVariant: "success",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      iconName: "trending-up",
      message: `Trading at ₹${currentPrice}, above 52-week average midpoint (₹${fiftyTwoAvg?.toFixed(1)}). Bullish trend.`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 6. Below 52-Week Average (Warning technical flag)
  if (fiftyTwoAvg !== undefined && currentPrice < fiftyTwoAvg) {
    const belowPct = Math.abs(distTo52Avg ?? 0).toFixed(1);
    return {
      primarySignal: "BELOW_52W_AVG",
      badgeLabel: `Below 52W Avg (-${belowPct}%)`,
      badgeVariant: "warning",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      iconName: "alert-triangle",
      message: `Trading at ₹${currentPrice}, below 52-week average midpoint (₹${fiftyTwoAvg?.toFixed(1)}). Consolidation/lagging trend.`,
      targetPrice,
      stopLossPrice,
      distanceToTargetPct: distToTarget,
      distanceTo52wLowPct: distTo52Low,
      distanceTo52wAvgPct: distTo52Avg,
      notes,
      tag,
      hasCustomPlan,
    };
  }

  // 7. Neutral default
  return {
    primarySignal: "NEUTRAL",
    badgeLabel: "Neutral",
    badgeVariant: "outline",
    badgeClass: "bg-muted/40 text-muted-foreground border-border",
    iconName: "info",
    message: "No technical 52-week threshold or target breached.",
    targetPrice,
    stopLossPrice,
    distanceToTargetPct: distToTarget,
    distanceTo52wLowPct: distTo52Low,
    distanceTo52wAvgPct: distTo52Avg,
    notes,
    tag,
    hasCustomPlan,
  };
}

