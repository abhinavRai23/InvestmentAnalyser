"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Holding } from "@/lib/types";
import { StockTarget, normalizeStockKey } from "@/lib/stockSignals";
import { Target, ShieldAlert, Sparkles, Trash2, ArrowUpRight, ArrowDownRight, Tag } from "lucide-react";

interface StockStrategyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: (Holding & {
    _fiftyTwoWeekHigh?: number;
    _fiftyTwoWeekLow?: number;
    _fiftyTwoWeekAvg?: number;
  }) | null;
  existingTarget?: StockTarget | null;
  onSave: (target: StockTarget) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

const STRATEGY_TAGS = [
  "Core Long-Term",
  "Swing Trade",
  "Growth / Momentum",
  "Dividend Bet",
  "SIP / Accumulate",
  "High Risk / Speculative",
];

export function StockStrategyModal({
  open,
  onOpenChange,
  stock,
  existingTarget,
  onSave,
  onDelete,
}: StockStrategyModalProps) {
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open && stock) {
      setTargetPrice(existingTarget?.targetPrice ? String(existingTarget.targetPrice) : "");
      setStopLossPrice(existingTarget?.stopLossPrice ? String(existingTarget.stopLossPrice) : "");
      setNotes(existingTarget?.notes || "");
      setSelectedTag(existingTarget?.tag || "Swing Trade");
    }
  }, [open, stock, existingTarget]);

  if (!stock) return null;

  const currentPrice =
    stock.marketPrice && stock.marketPrice > 0
      ? stock.marketPrice
      : stock.quantity && stock.quantity > 0
      ? stock.currentValue / stock.quantity
      : stock.currentValue;

  const numTargetPrice = parseFloat(targetPrice);
  const numStopLossPrice = parseFloat(stopLossPrice);

  const targetGainPct =
    !isNaN(numTargetPrice) && currentPrice > 0
      ? ((numTargetPrice - currentPrice) / currentPrice) * 100
      : null;

  const stopLossPct =
    !isNaN(numStopLossPrice) && currentPrice > 0
      ? ((numStopLossPrice - currentPrice) / currentPrice) * 100
      : null;

  const handleQuickTarget = (multiplier: number) => {
    if (currentPrice > 0) {
      setTargetPrice((currentPrice * multiplier).toFixed(2));
    }
  };

  const handleQuickStopLoss = (multiplier: number) => {
    if (currentPrice > 0) {
      setStopLossPrice((currentPrice * multiplier).toFixed(2));
    }
  };

  const handleSave = async () => {
    if (!stock) return;
    setIsSubmitting(true);
    try {
      const canonicalKey = normalizeStockKey(stock.isin || stock.name);
      await onSave({
        key: canonicalKey,
        name: stock.name,
        isin: stock.isin,
        targetPrice: !isNaN(numTargetPrice) && numTargetPrice > 0 ? numTargetPrice : undefined,
        stopLossPrice: !isNaN(numStopLossPrice) && numStopLossPrice > 0 ? numStopLossPrice : undefined,
        notes: notes.trim() || undefined,
        tag: selectedTag || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!stock) return;
    setIsSubmitting(true);
    try {
      const canonicalKey = normalizeStockKey(stock.isin || stock.name);
      await onDelete(canonicalKey);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Target className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Stock Strategy & Target Alert
              </DialogTitle>
            </div>
            {existingTarget && (
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                Rule Active
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Set your target sell price, stop-loss floor, and investment goal so you never forget your rationale.
          </DialogDescription>
        </DialogHeader>

        {/* Stock Info Bar */}
        <div className="bg-muted/40 p-3 rounded-lg border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-foreground text-sm block">
              {stock.name}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {stock.quantity ? `${stock.quantity} shares • ` : ""}
              Current: <strong className="font-mono text-foreground font-semibold">{formatCurrency(currentPrice)}</strong>
            </span>
          </div>
          {stock._fiftyTwoWeekHigh !== undefined && stock._fiftyTwoWeekLow !== undefined && (
            <div className="text-right text-[11px]">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                52W Range
              </span>
              <span className="font-mono font-medium">
                ₹{stock._fiftyTwoWeekLow.toFixed(0)} - ₹{stock._fiftyTwoWeekHigh.toFixed(0)}
              </span>
              {stock._fiftyTwoWeekAvg !== undefined && (
                <span className="block text-[10px] text-muted-foreground font-mono">
                  Mid: ₹{stock._fiftyTwoWeekAvg.toFixed(0)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 py-2">
          {/* Target Sell Price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="targetPrice" className="text-xs font-semibold flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Target Sell Price (₹)
              </Label>
              {targetGainPct !== null && (
                <span
                  className={`text-xs font-mono font-semibold ${
                    targetGainPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {targetGainPct >= 0 ? "+" : ""}
                  {targetGainPct.toFixed(1)}% ({targetGainPct >= 0 ? "+" : ""}{formatCurrency(numTargetPrice - currentPrice)})
                </span>
              )}
            </div>
            <Input
              id="targetPrice"
              type="number"
              step="any"
              placeholder="e.g. 2800"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="font-mono text-sm"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground font-medium">Quick Set:</span>
              <button
                type="button"
                onClick={() => handleQuickTarget(1.10)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground"
              >
                +10%
              </button>
              <button
                type="button"
                onClick={() => handleQuickTarget(1.20)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground"
              >
                +20%
              </button>
              <button
                type="button"
                onClick={() => handleQuickTarget(1.30)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground"
              >
                +30%
              </button>
              {stock._fiftyTwoWeekHigh !== undefined && (
                <button
                  type="button"
                  onClick={() => setTargetPrice(stock._fiftyTwoWeekHigh!.toFixed(2))}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground"
                >
                  52W High (₹{stock._fiftyTwoWeekHigh.toFixed(0)})
                </button>
              )}
            </div>
          </div>

          {/* Stop-Loss Price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stopLossPrice" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                Stop-Loss Exit Floor (₹) <span className="text-[10px] font-normal">(Optional)</span>
              </Label>
              {stopLossPct !== null && (
                <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                  {stopLossPct.toFixed(1)}% ({formatCurrency(numStopLossPrice - currentPrice)})
                </span>
              )}
            </div>
            <Input
              id="stopLossPrice"
              type="number"
              step="any"
              placeholder="e.g. 2100"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className="font-mono text-sm"
            />
            {/* Quick Stop Loss Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground font-medium">Quick Floor:</span>
              <button
                type="button"
                onClick={() => handleQuickStopLoss(0.95)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-rose-500/10 hover:text-rose-600 transition-colors border text-muted-foreground"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => handleQuickStopLoss(0.90)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-rose-500/10 hover:text-rose-600 transition-colors border text-muted-foreground"
              >
                -10%
              </button>
              {stock._fiftyTwoWeekLow !== undefined && (
                <button
                  type="button"
                  onClick={() => setStopLossPrice(stock._fiftyTwoWeekLow!.toFixed(2))}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-rose-500/10 hover:text-rose-600 transition-colors border text-muted-foreground"
                >
                  52W Low (₹{stock._fiftyTwoWeekLow.toFixed(0)})
                </button>
              )}
            </div>
          </div>

          {/* Strategy Tag */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Strategy Tag
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGY_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selectedTag === t
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-medium"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Goal & Investment Thesis (Notes) */}
          <div className="space-y-1.5">
            <Label htmlFor="stockNotes" className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Goal & Investment Thesis (Why did you buy?)
            </Label>
            <textarea
              id="stockNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bought for swing target of ₹2800 before Diwali. Key catalyst: Q3 revenue growth and strong order book. Review exit if earnings disappoint."
              className="w-full text-xs rounded-md border border-input bg-transparent px-3 py-2 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              These notes remain attached to this stock so you can review your original rationale anytime.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 sm:justify-between">
          <div>
            {existingTarget && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="gap-1 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Condition
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
            >
              <Target className="h-3.5 w-3.5" />
              Save Strategy & Rule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
