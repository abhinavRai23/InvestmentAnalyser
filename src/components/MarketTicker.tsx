"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isIndianMarketOpen } from "@/lib/marketHours";

interface TickerItem {
  key: string;
  name: string;
  symbol: string;
  unit: string;
  price: number;
  change: number;
  changePct: number;
}

export function MarketTicker() {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(() => isIndianMarketOpen());
  const [marketStatusMsg, setMarketStatusMsg] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTicker = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/market-ticker");
      if (res.ok) {
        const data = await res.json();
        setTickerData(data.tickerData || []);
        const open = typeof data.isMarketOpen === "boolean" ? data.isMarketOpen : isIndianMarketOpen();
        setIsMarketOpen(open);
        if (data.marketStatus) setMarketStatusMsg(data.marketStatus);
        return open;
      }
    } catch (e) {
      console.error("Failed to fetch market ticker", e);
    } finally {
      setIsLoading(false);
    }
    const fallbackOpen = isIndianMarketOpen();
    setIsMarketOpen(fallbackOpen);
    return fallbackOpen;
  }, []);

  const handleManualRefresh = async () => {
    const open = await fetchTicker();
    if (open && !intervalRef.current) {
      intervalRef.current = setInterval(async () => {
        if (!isIndianMarketOpen()) {
          setIsMarketOpen(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        const stillOpen = await fetchTicker();
        if (!stillOpen && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 60000);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startPollingIfOpen = async () => {
      // 1. First call is always made on load to display quotes
      const open = await fetchTicker();
      if (!isMounted) return;

      // 2. Only start 1-minute recurring calls if market is open (9:30 AM - 3:30 PM IST, Mon-Fri)
      if (open) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
          if (!isIndianMarketOpen()) {
            setIsMarketOpen(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }

          const stillOpen = await fetchTicker();
          if (!stillOpen && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, 60000);
      } else {
        // Market is closed; do not poll every minute
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    startPollingIfOpen();

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchTicker]);

  if (tickerData.length === 0 && !isLoading) return null;

  const formatPrice = (item: TickerItem) => {
    if (item.key === "usdinr") return `₹${item.price.toFixed(2)}`;
    if (item.key === "gold" || item.key === "silver") {
      return `₹${Math.round(item.price).toLocaleString("en-IN")}`;
    }
    return item.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border/80 shadow-2xs transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3">
        {/* Live / Closed Indicator */}
        <div
          className="flex items-center space-x-2 shrink-0 cursor-default"
          title={
            isMarketOpen
              ? "Live Indian Market Hours (09:30 AM - 03:30 PM IST, Mon - Fri)"
              : marketStatusMsg || "Market Closed (Indian Market Hours: 09:30 AM - 03:30 PM IST, Mon - Fri)"
          }
        >
          <span className="relative flex h-2 w-2">
            {isMarketOpen ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500"></span>
            )}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline-block">
            {isMarketOpen ? "Live Markets" : "Market Closed"}
          </span>
        </div>

        {/* Permanent Compact Horizontal Ticker Items */}
        <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
          {tickerData.length === 0 && isLoading ? (
            ["Nifty 50", "Sensex", "Gold (10g)", "Silver (1kg)", "USD / INR"].map((name) => (
              <div
                key={name}
                className="flex items-center space-x-2 bg-muted/40 px-2.5 py-1 rounded-md text-xs whitespace-nowrap border border-border/40 shrink-0 animate-pulse"
              >
                <span className="font-semibold text-foreground/60">{name}:</span>
                <div className="h-3 w-14 bg-muted-foreground/20 rounded"></div>
              </div>
            ))
          ) : (
            tickerData.map((item) => {
              const isPos = item.change >= 0;
              return (
                <div
                  key={item.key}
                  className="flex items-center space-x-2 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors border border-border/40 shrink-0"
                >
                  <span className="font-semibold text-foreground">{item.name}:</span>
                  <span className="font-mono font-medium text-foreground">{formatPrice(item)}</span>
                  <div className="flex items-center space-x-0.5">
                    {isPos ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        isPos
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isPos ? "+" : ""}
                      {item.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ticker Refresh Action & Theme Toggle */}
        <div className="flex items-center space-x-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Refresh Market Indices"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <div className="h-4 w-px bg-border my-auto"></div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
