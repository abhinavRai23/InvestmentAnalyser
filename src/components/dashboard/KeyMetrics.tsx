"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useFilteredHoldings } from "@/store/portfolioStore";
import { useGrowwCache } from "@/hooks/useGrowwCache";
import { calculatePortfolioPeriodReturns } from "@/lib/engine";
import { TrendingUp, ShieldAlert, Award } from "lucide-react";

interface KeyMetricsProps {
  summary: {
    totalInvested: number;
    totalCurrent: number;
    absoluteReturn: number;
    returnPercentage: number;
  };
}

export function KeyMetrics({ summary }: KeyMetricsProps) {
  const holdings = useFilteredHoldings();
  const { cache: growwCache } = useGrowwCache();

  const periodReturns = useMemo(() => {
    return calculatePortfolioPeriodReturns(holdings, growwCache);
  }, [holdings, growwCache]);

  const periodsList = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  // Calculate Inflation-Adjusted (Real) Return assuming standard 6% Indian CPI annual inflation benchmark
  const inflationRatePct = 6.0;
  const nominalPct = summary.returnPercentage;
  const realReturnPct = nominalPct > 0
    ? ((1 + nominalPct / 100) / (1 + inflationRatePct / 100) - 1) * 100
    : nominalPct - inflationRatePct;
  const realReturnGain = summary.totalInvested * (realReturnPct / 100);

  return (
    <div className="space-y-3.5">
      {/* High-Density Primary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="shadow-2xs bg-card hover:border-primary/30 transition-colors">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Current Value</p>
            <div className="text-xl font-extrabold mt-1 text-foreground font-mono">{formatCurrency(summary.totalCurrent)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs bg-card hover:border-primary/30 transition-colors">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Invested</p>
            <div className="text-xl font-extrabold mt-1 text-foreground font-mono">{formatCurrency(summary.totalInvested)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs bg-card hover:border-primary/30 transition-colors">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nominal Return</p>
            <div className={`text-xl font-extrabold mt-1 font-mono ${summary.absoluteReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.absoluteReturn > 0 ? '+' : ''}{formatCurrency(summary.absoluteReturn)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
              {summary.returnPercentage >= 0 ? '+' : ''}{summary.returnPercentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        {/* Real / Inflation-Adjusted Return Card */}
        <Card className="shadow-2xs bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/50 transition-colors">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3 w-3" /> Real (Inf-Adj @6%)
              </p>
            </div>
            <div className={`text-xl font-extrabold mt-1 font-mono ${realReturnGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {realReturnGain > 0 ? '+' : ''}{formatCurrency(realReturnGain)}
            </div>
            <p className="text-[10px] text-indigo-600/90 dark:text-indigo-300 mt-0.5 font-semibold">
              Real Yield: {realReturnPct >= 0 ? '+' : ''}{realReturnPct.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs bg-card hover:border-primary/30 transition-colors">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Return Rate</p>
            <div className={`text-xl font-extrabold mt-1 font-mono ${summary.returnPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.returnPercentage > 0 ? '+' : ''}{summary.returnPercentage.toFixed(2)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Portfolio ROI</p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Portfolio Returns Compact Strip */}
      <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Portfolio Historical Benchmark Returns
          </span>
          <span className="text-[10px] text-muted-foreground">Weighted benchmark across all holdings</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {periodsList.map((p) => {
            const item = periodReturns[p];
            if (!item) return null;
            const isPositive = item.gain >= 0;

            return (
              <div
                key={p}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">{item.period}</span>
                  <span className={`text-xs font-bold font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPositive ? '+' : ''}{formatCurrency(item.gain)}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isPositive ? '+' : ''}{item.percentage.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
