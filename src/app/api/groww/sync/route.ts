import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEBUG_FUNDS = new Set([
  'HDFCAMC - HDFCNIFTY',
  'MOTILAL OS NASDAQ100 ETF',
  'ICICIPRAMC - ICICINXT50',
  'ICICIPRAMC - BHARATIWIN',
  'UTIAMC-NIFTYBETA',
  'NIP IND ETF NIFTY BEES',
  'NIP IND ETF BANK BEES',
  'SBI-ETF NIFTY 50',
]);

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

  const isDebug = DEBUG_FUNDS.has(holdingName);
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

    // ATTEMPT 3: Cleaned name
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support { holdings: [{name, isin?}] } and legacy { fundNames: string[] }
    let holdingsToSync: { name: string; isin?: string }[] = [];
    
    if (body.holdings && Array.isArray(body.holdings)) {
      holdingsToSync = body.holdings;
    } else if (body.fundNames && Array.isArray(body.fundNames)) {
      holdingsToSync = body.fundNames.map((n: string) => ({ name: n }));
    } else {
      return NextResponse.json({ error: 'Provide holdings array [{name, isin?}] or fundNames array' }, { status: 400 });
    }

    const cachePath = path.join(process.cwd(), 'public', 'data', 'growwCache.json');
    let cache: Record<string, any> = {};
    
    if (fs.existsSync(cachePath)) {
      const fileData = fs.readFileSync(cachePath, 'utf8');
      cache = JSON.parse(fileData);
    }

    const newCache = { ...cache };
    let updatedCount = 0;
    const debugSummary: any[] = [];

    for (const holding of holdingsToSync) {
      await new Promise(res => setTimeout(res, 400));
      
      const result = await fetchGrowwDetails(holding.name, holding.isin);
      
      if (result?.data) {
        const details = result.data;
        const cacheIsin = details.isin || holding.isin;
        // Index by ISIN (primary) and name (fallback)
        if (cacheIsin) newCache[cacheIsin] = details;
        newCache[holding.name] = details;
        
        updatedCount++;
        debugSummary.push({
          name: holding.name,
          isin: cacheIsin,
          outcome: 'SUCCESS',
          scheme_name: details.scheme_name,
          expense_ratio: details.expense_ratio,
          return1y: details.simple_return?.return1y,
        });
      } else {
        debugSummary.push({
          name: holding.name,
          isin: holding.isin,
          outcome: 'FAILED',
          debugInfo: result?.debugInfo,
        });
      }
    }

    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(newCache, null, 2));

    console.log('\n[GROWW SYNC SUMMARY]', JSON.stringify(debugSummary, null, 2));

    return NextResponse.json({ success: true, updatedCount, cache: newCache, debugSummary });
  } catch (error: any) {
    console.error('Groww Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cachePath = path.join(process.cwd(), 'public', 'data', 'growwCache.json');
    if (fs.existsSync(cachePath)) {
      const fileData = fs.readFileSync(cachePath, 'utf8');
      return NextResponse.json({ cache: JSON.parse(fileData) });
    }
    return NextResponse.json({ cache: {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


