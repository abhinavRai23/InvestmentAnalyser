import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logSync } from '@/lib/syncLogger';

/** Groww mutual-fund / ETF scheme search + details fetch.
 *  Only call this for mutual_fund and ETF asset types — NOT for raw stocks or SGBs. */
async function fetchGrowwDetails(holdingName: string, isin?: string): Promise<{ data: any; debugInfo: any } | null> {
  const debug: any = {
    holdingName,
    isin,
    searchAttempts: [],
    searchIdFound: null,
    detailsUrl: null,
    detailsStatus: null,
    normalizedFields: null,
  };

  const nameLower = holdingName.toLowerCase();
  const isMfScheme = nameLower.includes('direct') || nameLower.includes('growth') || nameLower.includes('plan') || nameLower.includes('fund');
  const isEtf = nameLower.includes('etf') && !nameLower.includes('fund of fund') && !nameLower.includes('fof');

  try {
    let candidateList: any[] = [];

    const getCandidates = (results: any[]) => {
      if (!results || results.length === 0) return [];
      const list: any[] = [];
      const isFof = nameLower.includes('fund of fund') || nameLower.includes('fof');

      if (isFof) {
        results.filter((item: any) =>
          item.entity_type === 'Scheme' &&
          (item.search_id?.includes('fof') || item.search_id?.includes('fund-of-fund') || item.title?.toLowerCase().includes('fund'))
        ).forEach(item => list.push(item));
      }

      results.filter((item: any) => item.title?.toLowerCase() === holdingName.toLowerCase())
        .forEach(item => { if (!list.includes(item)) list.push(item); });

      if (isMfScheme) {
        results.filter((item: any) => item.entity_type === 'Scheme')
          .forEach(item => { if (!list.includes(item)) list.push(item); });
      }

      if (isEtf) {
        results.filter((item: any) => item.entity_type === 'ETF')
          .forEach(item => { if (!list.includes(item)) list.push(item); });
      }

      results.filter((item: any) => item.entity_type === 'Scheme' || item.entity_type === 'ETF')
        .forEach(item => { if (!list.includes(item)) list.push(item); });

      return list;
    };

    // ATTEMPT 1: Search by ISIN
    if (isin) {
      const isinUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(isin)}&size=5&web=true`;
      debug.searchAttempts.push({ attempt: 1, type: 'ISIN', query: isin, url: isinUrl });

      const searchRes = await fetch(isinUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow'
      });
      const searchData = searchRes.ok ? await searchRes.json() : null;
      candidateList = getCandidates(searchData?.data?.content || []);
    }

    // ATTEMPT 2: Search by full holding name
    if (candidateList.length === 0) {
      const nameUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(holdingName)}&size=5&web=true`;
      debug.searchAttempts.push({ attempt: 2, type: 'Name', query: holdingName, url: nameUrl });

      const searchRes = await fetch(nameUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow'
      });
      const searchData = searchRes.ok ? await searchRes.json() : null;
      candidateList = getCandidates(searchData?.data?.content || []);
    }

    // ATTEMPT 3: Cleaned name (strip plan/growth suffixes)
    if (candidateList.length === 0) {
      const cleanedName = holdingName
        .replace(/^[A-Z0-9]+-\s+/i, '')
        .replace(/\b(Direct|Regular|Plan|Growth|Option|DirectGrowth|Fund of Fund|Fund of Funds|FoF)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedName && cleanedName !== holdingName) {
        const cleanUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(cleanedName)}&size=5&web=true`;
        debug.searchAttempts.push({ attempt: 3, type: 'CleanedName', query: cleanedName, url: cleanUrl });

        const searchRes = await fetch(cleanUrl, {
          headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow'
        });
        const searchData = searchRes.ok ? await searchRes.json() : null;
        candidateList = getCandidates(searchData?.data?.content || []);
      }
    }

    if (candidateList.length === 0) {
      debug.outcome = 'NO_SCHEME_FOUND';
      return { data: null, debugInfo: debug };
    }

    // Loop through candidates until details API returns OK 200
    for (const candidate of candidateList) {
      debug.searchIdFound = candidate.search_id;
      debug.schemeEntityType = candidate.entity_type;

      let detailsUrl = '';
      if (candidate.entity_type === 'ETF') {
        detailsUrl = `https://groww.in/v1/api/stocks_data/v1/company/search_id/${candidate.search_id}?is_etf=true`;
      } else {
        detailsUrl = `https://groww.in/v1/api/data/mf/web/v4/scheme/search/${candidate.search_id}`;
      }

      debug.detailsUrl = detailsUrl;

      const detailsRes = await fetch(detailsUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow'
      });

      debug.detailsStatus = detailsRes.status;

      if (detailsRes.ok) {
        const details = await detailsRes.json();
        let normalized = details;
        if (candidate.entity_type === 'ETF') {
          const dispName = details.header?.displayName || candidate.title;
          normalized = {
            isin: details.header?.isin || candidate.isin,
            scheme_name: dispName,
            fund_name: dispName,
            category: "ETF",
            ...details
          };
        }
        debug.outcome = 'SUCCESS';
        return { data: normalized, debugInfo: debug };
      }
    }

    debug.outcome = 'DETAILS_FETCH_FAILED';
    return { data: null, debugInfo: debug };
  } catch (error) {
    console.error(`Groww fetch error for ${holdingName}:`, error);
    return null;
  }
}

/**
 * Fetch the Groww equity search_id for a stock/ETF holding (used only for Groww deep-link URLs).
 * Does NOT fetch NAV/pricing — that's Yahoo's job.
 */
async function fetchGrowwEquitySearchId(
  holdingName: string,
  isin?: string
): Promise<{ searchId: string | null; displayName: string | null; debugInfo: any }> {
  const debug: any = { holdingName, isin, searchAttempts: [], outcome: 'NOT_FOUND' };

  const headers = { 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0' };

  const trySearch = async (query: string, type: string, attempt: number) => {
    const url = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(query)}&size=8&web=true`;
    debug.searchAttempts.push({ attempt, type, query, url });
    try {
      const res = await fetch(url, { headers, redirect: 'follow' });
      if (!res.ok) return null;
      const json = await res.json();
      // Prefer equity 'Stock' entity, fall back to any result
      const content: any[] = json?.data?.content || [];
      return (
        content.find((c: any) => c.entity_type === 'Stock') ||
        content.find((c: any) => c.entity_type === 'ETF') ||
        content[0] ||
        null
      );
    } catch {
      return null;
    }
  };

  // 1. ISIN search
  let hit = isin ? await trySearch(isin, 'ISIN', 1) : null;

  // 2. Full name search
  if (!hit) hit = await trySearch(holdingName, 'Name', 2);

  // 3. Abbreviated name (remove "LTD", "LIMITED", "CO", punctuation)
  if (!hit) {
    const abbrev = holdingName
      .replace(/\b(LIMITED|LTD|LTD\.|CO\.|CORP|CORPORATION|PVTLTD|PVT)\b/gi, '')
      .replace(/[().]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (abbrev && abbrev !== holdingName) hit = await trySearch(abbrev, 'AbbrevName', 3);
  }

  if (hit?.search_id) {
    debug.outcome = 'SUCCESS';
    return { searchId: hit.search_id, displayName: hit.title || null, debugInfo: debug };
  }

  return { searchId: null, displayName: null, debugInfo: debug };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support { holdings: [{name, isin?, assetType?}] } and legacy { fundNames: string[] }
    let holdingsToSync: { name: string; isin?: string; assetType?: string }[] = [];

    if (body.holdings && Array.isArray(body.holdings)) {
      holdingsToSync = body.holdings;
    } else if (body.fundNames && Array.isArray(body.fundNames)) {
      holdingsToSync = body.fundNames.map((n: string) => ({ name: n, assetType: 'mutual_fund' }));
    } else {
      return NextResponse.json({ error: 'Provide holdings array [{name, isin?, assetType?}] or fundNames array' }, { status: 400 });
    }

    // Deduplicate by ISIN or name
    const seenHoldings = new Set<string>();
    const uniqueHoldings: { name: string; isin?: string; assetType?: string }[] = [];
    for (const h of holdingsToSync) {
      if (!h || !h.name) continue;
      const key = (h.isin || h.name).trim().toUpperCase();
      if (!seenHoldings.has(key)) {
        seenHoldings.add(key);
        uniqueHoldings.push(h);
      }
    }
    holdingsToSync = uniqueHoldings;

    const db = getDb();
    let updatedCount = 0;
    const debugSummary: any[] = [];

    const insertCacheStmt = db.prepare(`
      INSERT OR REPLACE INTO groww_cache 
      (key, isin, name, nav, nav_date, category, sub_category, groww_rating, expense_ratio, aum, exit_load, logo_url, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Build the full cache object to return to the client (read existing rows first)
    const existingRows = db.prepare('SELECT key, data_json FROM groww_cache').all() as { key: string; data_json: string }[];
    const newCache: Record<string, any> = {};
    for (const r of existingRows) {
      try { newCache[r.key] = JSON.parse(r.data_json); } catch { /* skip */ }
    }

    for (const holding of holdingsToSync) {
      const upperName = holding.name.toUpperCase();
      const isSgb =
        holding.assetType === 'sgb' ||
        upperName.includes('GOLDBOND') ||
        upperName.includes('%GOLDBONDS') ||
        upperName.startsWith('SGB');

      // SGBs: no Groww metadata needed — skip entirely
      if (isSgb) {
        debugSummary.push({ name: holding.name, isin: holding.isin, outcome: 'SKIPPED_SGB' });
        continue;
      }

      const isStock =
        holding.assetType === 'stock' ||
        holding.assetType === 'gold' ||
        holding.assetType === 'silver';

      await new Promise(res => setTimeout(res, 350));

      if (isStock) {
        // Stocks: only fetch searchId for Groww deep-link URL — no NAV needed (Yahoo handles pricing)
        const { searchId, displayName, debugInfo } = await fetchGrowwEquitySearchId(holding.name, holding.isin);

        if (searchId) {
          const now = new Date().toISOString();
          const stockData = {
            search_id: searchId,
            searchId,
            scheme_name: displayName || holding.name,
            fund_name: displayName || holding.name,
            category: 'Stock',
            isin: holding.isin || null,
          };

          const keys = [holding.isin, holding.name].filter(Boolean) as string[];
          for (const k of keys) {
            insertCacheStmt.run(
              k, holding.isin || null, displayName || holding.name,
              null, null, 'Stock', null, null, null, null, null, null,
              JSON.stringify(stockData), now
            );
            newCache[k] = stockData;
          }

          updatedCount++;
          logSync({
            level: 'SUCCESS',
            source: 'GROWW',
            assetName: holding.name,
            isin: holding.isin,
            message: `Resolved stock Groww link: ${displayName || holding.name} → /stocks/${searchId}`,
            details: { searchId },
          });
          debugSummary.push({ name: holding.name, isin: holding.isin, outcome: 'SUCCESS', searchId });
        } else {
          // Stock not found on Groww — not a critical error (Yahoo still prices it)
          logSync({
            level: 'INFO',
            source: 'GROWW',
            assetName: holding.name,
            isin: holding.isin,
            message: `Groww link unavailable for stock "${holding.name}" — Groww search returned no match. Yahoo Finance still provides live pricing.`,
            details: debugInfo,
          });
          debugSummary.push({ name: holding.name, isin: holding.isin, outcome: 'NO_GROWW_LINK', debugInfo });
        }
        continue;
      }

      // Mutual funds and ETFs: full metadata fetch (NAV, expense ratio, returns, etc.)
      const result = await fetchGrowwDetails(holding.name, holding.isin);

      if (result?.data) {
        const details = result.data;
        const cacheIsin = details.isin || holding.isin;
        const now = new Date().toISOString();

        if (cacheIsin) {
          insertCacheStmt.run(
            cacheIsin, cacheIsin, details.scheme_name || holding.name,
            typeof details.nav === 'number' ? details.nav : null,
            details.nav_date || null,
            details.category || null,
            details.sub_category || null,
            typeof details.groww_rating === 'number' ? details.groww_rating : null,
            typeof details.expense_ratio === 'number' ? details.expense_ratio : null,
            typeof details.aum === 'number' ? details.aum : null,
            details.exit_load || null,
            details.logo_url || null,
            JSON.stringify(details),
            now
          );
          newCache[cacheIsin] = details;
        }

        insertCacheStmt.run(
          holding.name, cacheIsin || null, details.scheme_name || holding.name,
          typeof details.nav === 'number' ? details.nav : null,
          details.nav_date || null,
          details.category || null,
          details.sub_category || null,
          typeof details.groww_rating === 'number' ? details.groww_rating : null,
          typeof details.expense_ratio === 'number' ? details.expense_ratio : null,
          typeof details.aum === 'number' ? details.aum : null,
          details.exit_load || null,
          details.logo_url || null,
          JSON.stringify(details),
          now
        );
        newCache[holding.name] = details;

        updatedCount++;
        logSync({
          level: 'SUCCESS',
          source: 'GROWW',
          assetName: holding.name,
          isin: cacheIsin,
          message: `Synced fund details: ${details.scheme_name || holding.name}`,
          details: { nav: details.nav, expense_ratio: details.expense_ratio, rating: details.groww_rating },
        });
        debugSummary.push({
          name: holding.name, isin: cacheIsin, outcome: 'SUCCESS',
          scheme_name: details.scheme_name,
          expense_ratio: details.expense_ratio,
          return1y: details.simple_return?.return1y,
        });
      } else {
        logSync({
          level: 'WARN',
          source: 'GROWW',
          assetName: holding.name,
          isin: holding.isin,
          message: `Could not find fund on Groww: ${result?.debugInfo?.outcome || 'Details not found'}`,
          details: result?.debugInfo,
        });
        debugSummary.push({ name: holding.name, isin: holding.isin, outcome: 'FAILED', debugInfo: result?.debugInfo });
      }
    }

    return NextResponse.json({ success: true, updatedCount, cache: newCache, debugSummary });
  } catch (error: any) {
    console.error('Groww Sync Error:', error);
    logSync({
      level: 'ERROR',
      source: 'GROWW',
      message: `Fatal error in Groww sync API: ${error.message}`,
      details: { stack: error.stack }
    });
    return NextResponse.json({ error: error.message || 'Failed to sync' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, data_json FROM groww_cache').all() as { key: string; data_json: string }[];
    const cache: Record<string, any> = {};
    for (const r of rows) {
      try { cache[r.key] = JSON.parse(r.data_json); } catch { /* skip corrupted */ }
    }
    return NextResponse.json({ cache });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

