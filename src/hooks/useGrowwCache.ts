"use client";

import { useState, useEffect, useCallback } from "react";
import { staticDisplayName } from "@/lib/etfNames";

// Singleton cache shared across all components on a page
let _sharedCache: Record<string, any> = {};
let _listeners: Array<(cache: Record<string, any>) => void> = [];
let _loaded = false;

function notifyListeners() {
  _listeners.forEach((fn) => fn({ ..._sharedCache }));
}

/**
 * Resolves the best display name for a holding.
 * Priority: Groww cache (by ISIN) > Groww cache (by name) > static ETF map > raw name
 */
export function resolveDisplayName(
  holding: { name: string; isin?: string },
  cache: Record<string, any>,
): string {
  const entry = (holding.isin && cache[holding.isin]) || cache[holding.name];
  if (entry) return entry.scheme_name || entry.fund_name || holding.name;
  return staticDisplayName(holding.name) || holding.name;
}

/**
 * Resolves external page URL on Groww for a given holding.
 * Uses search_id from Groww cache if available, or falls back to Groww search URL.
 */
export function getGrowwUrl(
  holding: { name: string; isin?: string; assetType?: string },
  cache: Record<string, any>,
): string {
  const entry = (holding.isin && cache[holding.isin]) || cache[holding.name];
  const searchId =
    entry?.search_id || entry?.header?.searchId || entry?.searchId;
  const isStockOrEtf =
    holding.assetType === "stock" ||
    holding.assetType === "etf" ||
    entry?.category === "ETF";

  if (searchId) {
    if (isStockOrEtf) {
      return `https://groww.in/stocks/${searchId}`;
    } else {
      return `https://groww.in/mutual-funds/${searchId}`;
    }
  }

  const cleaned = holding.name
    .replace(/^[A-Z0-9]+-\s+/i, "")
    .replace(/\b(Direct|Regular|Plan|Growth|Option|DirectGrowth)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return `https://groww.in/search?q=${encodeURIComponent(cleaned || holding.name)}`;
}

/**
 * Shared hook — loads the Groww cache once and broadcasts updates to all subscribers.
 * Returns [cache, syncFn, isSyncing].
 */
export function useGrowwCache() {
  const [cache, setCache] = useState<Record<string, any>>(_sharedCache);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const listener = (updated: Record<string, any>) => setCache(updated);
    _listeners.push(listener);

    // Only fetch once
    if (!_loaded) {
      _loaded = true;
      fetch("/api/groww/sync")
        .then((res) => res.json())
        .then((data) => {
          const incoming = data?.cache || data || {};
          if (!incoming.error) {
            _sharedCache = incoming;
            notifyListeners();
          }
        })
        .catch(console.error);
    } else {
      setCache({ ..._sharedCache });
    }

    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  const sync = useCallback(
    async (holdings: { name: string; isin?: string }[]) => {
      setIsSyncing(true);
      try {
        const unique = Array.from(
          new Map(holdings.map((h) => [h.name, h])).values(),
        );
        const res = await fetch("/api/groww/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings: unique }),
        });
        const data = await res.json();
        if (data.cache) {
          _sharedCache = data.cache;
          notifyListeners();
        }
        if (data.debugSummary) {
          console.log("[GROWW SYNC]", data.debugSummary);
        }
        return data;
      } catch (e) {
        console.error(e);
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );

  return { cache, sync, isSyncing };
}
