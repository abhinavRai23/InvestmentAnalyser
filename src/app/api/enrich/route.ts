import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logSync } from '@/lib/syncLogger';
import { fetchMfapiNav } from '@/lib/providers/mfapi';
import {
  fetchYahooStockPrice,
  fetchYahooStockPricesBatch,
  resolveYahooTicker,
} from '@/lib/providers/yahooFinance';
import { fetchSgbLivePrice } from '@/lib/providers/sgb';
import { LiveData } from '@/lib/providers/types';

export async function POST(req: Request) {
  try {
    const { assets } = await req.json();

    // Read Groww cache from SQLite (single source of truth)
    let growwCache: Record<string, any> = {};
    try {
      const db = getDb();
      const rows = db.prepare('SELECT key, data_json FROM groww_cache').all() as { key: string; data_json: string }[];
      for (const r of rows) {
        try {
          growwCache[r.key] = JSON.parse(r.data_json);
        } catch {
          // ignore corrupted row
        }
      }
    } catch (dbErr) {
      console.warn('Could not read groww_cache from SQLite in /api/enrich', dbErr);
    }

    // 1. Separate assets into categories
    const stockEtfAssets: { id: string; name: string; type: string; isin?: string; symbol?: string }[] = [];
    const sgbAssets: { id: string; name: string; type: string; isin?: string }[] = [];
    const mfAssets: { id: string; name: string; type: string; isin?: string }[] = [];

    for (const asset of assets) {
      const upperName = asset.name.toUpperCase();
      if (asset.type === 'sgb' || upperName.includes('GOLDBOND') || upperName.includes('SGB')) {
        sgbAssets.push(asset);
      } else if (asset.type === 'mutual_fund') {
        mfAssets.push(asset);
      } else if (['stock', 'etf', 'gold', 'silver'].includes(asset.type)) {
        const symbol = resolveYahooTicker(asset.name);
        stockEtfAssets.push({ ...asset, symbol: symbol || undefined });
      }
    }

    // 2. Batch fetch stock and ETF symbols via Yahoo Finance
    const symbolsToBatch = stockEtfAssets
      .map((a) => a.symbol)
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    const batchQuoteMap = await fetchYahooStockPricesBatch(symbolsToBatch);

    // 3. Resolve enriched data for each asset
    const loggedWarnings = new Set<string>();
    const results = await Promise.all(
      assets.map(async (asset: { id: string; name: string; type: string; isin?: string }) => {
        let liveData: LiveData | null = null;
        const upperName = asset.name.toUpperCase();

        if (asset.type === 'mutual_fund') {
          // Check Groww cache for exact scheme NAV
          const entry = (asset.isin && growwCache[asset.isin]) || growwCache[asset.name];
          if (entry && typeof entry.nav === 'number' && entry.nav > 0) {
            const changePct = entry.return_stats?.[0]?.return1d ?? entry.simple_return?.return1d;
            const return1y = entry.return_stats?.[0]?.return1y ?? entry.simple_return?.return1y;
            const change =
              typeof changePct === 'number' ? Number(((entry.nav * changePct) / 100).toFixed(4)) : undefined;

            liveData = {
              price: entry.nav,
              date: entry.nav_date || new Date().toISOString(),
              change,
              changePct: typeof changePct === 'number' ? changePct : undefined,
              return1y: typeof return1y === 'number' ? return1y : undefined,
            };
          } else {
            liveData = await fetchMfapiNav(asset.name);
          }
        } else if (asset.type === 'sgb' || upperName.includes('GOLDBOND') || upperName.includes('SGB')) {
          liveData = await fetchSgbLivePrice(asset.isin, asset.name);
        } else if (['stock', 'etf', 'gold', 'silver'].includes(asset.type)) {
          const symbol = resolveYahooTicker(asset.name);
          if (symbol && batchQuoteMap.has(symbol.toUpperCase())) {
            liveData = batchQuoteMap.get(symbol.toUpperCase()) || null;
          } else {
            // Fallback to single fetch
            liveData = await fetchYahooStockPrice(asset.name);
          }
        }

        const warnKey = `${asset.type}:${asset.isin || asset.name.toUpperCase()}`;
        if (!liveData) {
          if (!loggedWarnings.has(`MISSING:${warnKey}`)) {
            loggedWarnings.add(`MISSING:${warnKey}`);
            logSync({
              level: 'WARN',
              source: asset.type === 'mutual_fund' ? 'MFAPI' : 'YAHOO',
              assetName: asset.name,
              assetType: asset.type,
              isin: asset.isin,
              message: `Could not fetch live price or NAV for security "${asset.name}".`,
            });
          }
        } else if (liveData.changePct === undefined && asset.type !== 'sgb') {
          if (!loggedWarnings.has(`NO1D:${warnKey}`)) {
            loggedWarnings.add(`NO1D:${warnKey}`);
            logSync({
              level: 'WARN',
              source: 'YAHOO',
              assetName: asset.name,
              assetType: asset.type,
              isin: asset.isin,
              message: `Price available (₹${liveData.price}), but 1-Day change was unavailable from feed.`,
            });
          }
        }

        return {
          id: asset.id,
          isin: asset.isin,
          name: asset.name,
          liveData,
        };
      })
    );

    // Convert to a dictionary indexed by id, isin, and name so aggregated holdings can look it up
    const enrichedData: Record<string, LiveData> = {};
    for (const curr of results) {
      if (curr.liveData) {
        enrichedData[curr.id] = curr.liveData;
        if (curr.isin) {
          enrichedData[curr.isin] = curr.liveData;
        }
        enrichedData[curr.name] = curr.liveData;
      }
    }

    return NextResponse.json({ enrichedData });
  } catch (error: any) {
    console.error("Enrichment API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
