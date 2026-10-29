import { useState, useEffect, useCallback } from 'react';

interface GrowwCacheEntry {
  scheme_name?: string;
  fund_name?: string;
  isin?: string;
  expense_ratio?: string | number;
  groww_rating?: number;
  simple_return?: { return1y?: number; return3y?: number; return5y?: number };
  return_stats?: { return1y?: number; return3y?: number; return5y?: number }[];
  category?: string;
  sub_category?: string;
  [key: string]: any;
}

let sharedCache: Record<string, GrowwCacheEntry> = {};
let fetchPromise: Promise<void> | null = null;

/**
 * Shared Groww metadata cache. Fetches once globally, keyed by both ISIN and name.
 * Use getDisplayName() for correct fund name; getCached() for full metadata.
 */
export function useGrowwCache() {
  const [cache, setCache] = useState<Record<string, GrowwCacheEntry>>(sharedCache);

  useEffect(() => {
    if (Object.keys(sharedCache).length > 0) return; // already loaded
    if (!fetchPromise) {
      fetchPromise = fetch('/api/groww/sync')
        .then(r => r.json())
        .then(data => {
          const raw = data?.cache || data || {};
          if (!raw.error) {
            sharedCache = raw;
            // Notify all subscribers via a custom event
            window.dispatchEvent(new CustomEvent('growwCacheLoaded', { detail: raw }));
          }
        })
        .catch(console.error);
    } else {
      // Wait for the ongoing fetch
      fetchPromise.then(() => setCache({ ...sharedCache }));
    }

    const handler = (e: Event) => {
      setCache((e as CustomEvent).detail);
    };
    window.addEventListener('growwCacheLoaded', handler);
    return () => window.removeEventListener('growwCacheLoaded', handler);
  }, []);

  /** Look up by ISIN first, then by name */
  const getCached = useCallback(
    (h: { name?: string; isin?: string; fundName?: string }): GrowwCacheEntry | null => {
      const name = h.name || h.fundName || '';
      const isin = h.isin;
      return (isin && cache[isin]) || cache[name] || null;
    },
    [cache]
  );

  /** Returns the best display name: Groww scheme_name > fund_name > raw name */
  const getDisplayName = useCallback(
    (h: { name?: string; isin?: string; fundName?: string }): string => {
      const raw = h.name || h.fundName || '';
      const entry = getCached(h);
      return entry?.scheme_name || entry?.fund_name || raw;
    },
    [getCached]
  );

  return { cache, getCached, getDisplayName };
}
