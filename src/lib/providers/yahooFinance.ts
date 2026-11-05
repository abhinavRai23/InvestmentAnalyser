import YahooFinance from 'yahoo-finance2';
import { LiveData } from './types';

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const KNOWN_TICKER_MAP: Record<string, string> = {
  // Gold ETFs
  "NIP IND ETF GOLD BEES": "GOLDBEES.NS",
  "NIPPON INDIA ETF GOLD BEES": "GOLDBEES.NS",
  "GOLDBEES": "GOLDBEES.NS",
  "AXISAMC-GOLDAXIS": "GOLDAXIS.NS",
  "AXIS GOLD ETF": "GOLDAXIS.NS",
  "AXIS GOLD": "GOLDAXIS.NS",
  "TATAAML-TATAGOLD": "TATAGOLD.NS",
  "TATA GOLD ETF": "TATAGOLD.NS",
  "HDFCAMC - HDFCGOLD": "HDFCGOLD.NS",
  "HDFC GOLD ETF": "HDFCGOLD.NS",
  "KOTAK GOLD ETF": "GOLD1.NS",
  "KOTAKGOLD": "GOLD1.NS",
  "SBI-ETF GOLD": "SETFGOLD.NS",
  "SBI GOLD ETF": "SETFGOLD.NS",
  "UTIAMC-GOLDSHARE": "GOLDBETA.NS",
  "UTI GOLD ETF": "GOLDBETA.NS",

  // Silver ETFs
  "NIPPONAMC - NETFSILVER": "SILVERBEES.NS",
  "NIPPON SILVER ETF": "SILVERBEES.NS",
  "NIPPON INDIA SILVER ETF": "SILVERBEES.NS",
  "SILVERBEES": "SILVERBEES.NS",
  "HDFCAMC - HDFCSILVER": "HDFCSILVER.NS",
  "HDFC SILVER ETF": "HDFCSILVER.NS",
  "TATAAML-TATSILV": "TATSILV.NS",
  "TATA SILVER ETF": "TATSILV.NS",
  "KOTAKSILVER": "SILVER.NS",
  "KOTAK SILVER ETF": "SILVER.NS",

  // Equity & Sectoral ETFs
  "NIP IND ETF NIFTY BEES": "NIFTYBEES.NS",
  "NIFTYBEES": "NIFTYBEES.NS",
  "NIFBEES": "NIFTYBEES.NS",
  "NIP IND ETF BANK BEES": "BANKBEES.NS",
  "BANKBEES": "BANKBEES.NS",
  "NIP IND ETF JUNIOR": "JUNIORBEES.NS",
  "JUNIORBEES": "JUNIORBEES.NS",
  "ICICIPRAMC - BHARATIWIN": "ICICIB22.NS",
  "BHARATIWIN": "ICICIB22.NS",
  "ICICIPRAMC - ICICINXT50": "NEXT50IETF.NS",
  "ICIPRAMC - ICICINXT50": "NEXT50IETF.NS",
  "HDFCAMC - HDFCNIFTY": "HDFCNIFTY.NS",
  "HDFCAMC - HDFCSML250": "HDFCSML250.NS",
  "HDFCSML250": "HDFCSML250.NS",
  "MIRAEAMC - MAM150ETF": "MIDCAPETF.NS",
  "MAM150ETF": "MIDCAPETF.NS",
  "MIRAEAMC - MASPTOP50": "MASPTOP50.NS",
  "MASPTOP50": "MASPTOP50.NS",
  "UTIAMC-NIFTYBETA": "NIFTYBETA.NS",
  "NIFTYBETA": "NIFTYBETA.NS",
  "MOTILAL OS NASDAQ100 ETF": "MON100.NS",
  "MON100": "MON100.NS",
  "MAFANG": "MAFANG.NS",
  "SBI-ETF NIFTY 50": "SETFNIF50.NS",
  "CPSE ETF": "CPSEETF.NS",

  // Direct Equity Stocks
  "AVENUE SUPERMARTS LIMITED": "DMART.NS",
  "AVENUE SUPERMARTS": "DMART.NS",
  "BHARAT PETROLEUM CORP  LT": "BPCL.NS",
  "BHARAT PETROLEUM CORP LTD": "BPCL.NS",
  "BHARAT PETROLEUM": "BPCL.NS",
  "BHARTI AIRTEL LIMITED": "BHARTIARTL.NS",
  "BHARTI AIRTEL": "BHARTIARTL.NS",
  "BOROSIL RENEWABLES LTD": "BORORENEW.NS",
  "COAL INDIA LTD": "COALINDIA.NS",
  "COAL INDIA": "COALINDIA.NS",
  "EXIDE INDUSTRIES LTD": "EXIDEIND.NS",
  "GAIL (INDIA) LTD": "GAIL.NS",
  "GAIL INDIA": "GAIL.NS",
  "GOKUL AGRO RESOURCES LTD": "GOKULAGRO.NS",
  "GUJARAT ENERGY LIMITED": "GIPCL.NS",
  "HINDALCO  INDUSTRIES  LTD": "HINDALCO.NS",
  "HINDALCO INDUSTRIES LTD": "HINDALCO.NS",
  "HINDALCO": "HINDALCO.NS",
  "HINDUSTAN UNILEVER LTD.": "HINDUNILVR.NS",
  "HINDUSTAN UNILEVER LTD": "HINDUNILVR.NS",
  "HINDUSTAN UNILEVER": "HINDUNILVR.NS",
  "HINDUSTAN ZINC LIMITED": "HINDZINC.NS",
  "IDBI BANK LIMITED": "IDBI.NS",
  "IDFC FIRST BANK LIMITED": "IDFCFIRSTB.NS",
  "INDIAN OIL CORP LTD": "IOC.NS",
  "INDIAN OIL CORP": "IOC.NS",
  "INDIAN RAIL TOUR CORP LTD": "IRCTC.NS",
  "IRCTC": "IRCTC.NS",
  "INDRAPRASTHA GAS LTD": "IGL.NS",
  "ITC HOTELS LIMITED": "ITCHOTELS.NS",
  "ITC LTD": "ITC.NS",
  "ITC": "ITC.NS",
  "JIO FIN SERVICES LTD": "JIOFIN.NS",
  "JIO FINANCIAL SERVICES": "JIOFIN.NS",
  "JSW STEEL LIMITED": "JSWSTEEL.NS",
  "JSW STEEL": "JSWSTEEL.NS",
  "KOTAK MAHINDRA BANK LTD": "KOTAKBANK.NS",
  "KOTAK MAHINDRA BANK": "KOTAKBANK.NS",
  "LIFE INSURA CORP OF INDIA": "LICI.NS",
  "LIC OF INDIA": "LICI.NS",
  "NHPC LTD": "NHPC.NS",
  "NTPC GREEN ENERGY LIMITED": "NTPCGREEN.NS",
  "NTPC LTD": "NTPC.NS",
  "OIL AND NATURAL GAS CORP.": "ONGC.NS",
  "OIL AND NATURAL GAS CORP": "ONGC.NS",
  "ONGC": "ONGC.NS",
  "ORIENT GREEN POWER CO LTD": "GREENPOWER.NS",
  "PUNJAB NATIONAL BANK": "PNB.NS",
  "PNB": "PNB.NS",
  "RELIANCE INDUSTRIES LTD": "RELIANCE.NS",
  "RELIANCE INDUSTRIES": "RELIANCE.NS",
  "RELIANCE POWER LTD.": "RPOWER.NS",
  "RELIANCE POWER LTD": "RPOWER.NS",
  "TATA CHEMICALS LTD": "TATACHEM.NS",
  "TATA CONSULTANCY SERV LT": "TCS.NS",
  "TATA CONSULTANCY SERVICES": "TCS.NS",
  "TCS": "TCS.NS",
  "TATA POWER CO LTD": "TATAPOWER.NS",
  "TATA POWER": "TATAPOWER.NS",
  "VEDANTA LIMITED": "VEDL.NS",
  "VEDANTA": "VEDL.NS",
  "YES BANK LIMITED": "YESBANK.NS",
  "YES BANK": "YESBANK.NS",
};

export function resolveYahooTicker(query: string): string | null {
  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();

  let targetSymbol: string | undefined = KNOWN_TICKER_MAP[trimmed] || KNOWN_TICKER_MAP[upper];
  if (targetSymbol) return targetSymbol;

  const cleanUpper = upper.replace(/[^A-Z0-9]/g, '');
  for (const [key, sym] of Object.entries(KNOWN_TICKER_MAP)) {
    const cleanKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanUpper === cleanKey) return sym;
    if (cleanUpper.length >= 6 && cleanKey.length >= 6) {
      if (cleanUpper.includes(cleanKey) || cleanKey.includes(cleanUpper)) {
        return sym;
      }
    }
  }
  return null;
}

export async function fetchYahooStockPricesBatch(symbols: string[]): Promise<Map<string, LiveData>> {
  const results = new Map<string, LiveData>();
  if (symbols.length === 0) return results;

  const unique = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()))).filter(Boolean);
  const chunkSize = 20;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    try {
      const quotes: any = await yahoo.quote(chunk);
      const list = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of list) {
        if (q && q.symbol && Number.isFinite(q.regularMarketPrice) && q.regularMarketPrice > 0) {
          const price = q.regularMarketPrice;
          const change = Number.isFinite(q.regularMarketChange) ? q.regularMarketChange : undefined;
          const changePct = Number.isFinite(q.regularMarketChangePercent) ? q.regularMarketChangePercent : undefined;
          const return1y = Number.isFinite(q.fiftyTwoWeekChangePercent)
            ? Number(q.fiftyTwoWeekChangePercent.toFixed(2))
            : undefined;

          results.set(q.symbol.toUpperCase(), {
            price,
            date: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
            change,
            changePct,
            return1y,
          });
        }
      }
    } catch (err) {
      console.warn(`Batch quote failed for symbols: ${chunk.join(',')}, trying single fallbacks`, err);
      for (const sym of chunk) {
        try {
          const single = await fetchYahooStockPrice(sym);
          if (single) results.set(sym.toUpperCase(), single);
        } catch {
          // continue
        }
      }
    }
  }

  return results;
}

export async function fetchYahooStockPrice(query: string): Promise<LiveData | null> {
  try {
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();

    // 1. Direct symbol check in known map
    let targetSymbol: string | undefined = resolveYahooTicker(trimmed) || undefined;

    // 2. Fallback to Yahoo search if not in map
    if (!targetSymbol) {
      const searchRes: any = await yahoo.search(query);
      const quotes = Array.isArray(searchRes.quotes)
        ? searchRes.quotes.filter((q: any) => typeof q?.symbol === 'string' && q.symbol.length > 0)
        : [];

      if (quotes.length === 0) return null;

      const indianQuote = quotes.find((q: any) => q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'));
      targetSymbol = indianQuote ? indianQuote.symbol : quotes[0].symbol;
    }

    if (!targetSymbol) return null;

    // Fetch quote
    try {
      const quote: any = await yahoo.quote(targetSymbol);
      if (quote && Number.isFinite(quote.regularMarketPrice) && quote.regularMarketPrice > 0) {
        const price = quote.regularMarketPrice;
        const change = Number.isFinite(quote.regularMarketChange) ? quote.regularMarketChange : undefined;
        const changePct = Number.isFinite(quote.regularMarketChangePercent) ? quote.regularMarketChangePercent : undefined;
        const return1y = Number.isFinite(quote.fiftyTwoWeekChangePercent)
          ? Number(quote.fiftyTwoWeekChangePercent.toFixed(2))
          : undefined;

        return {
          price,
          date: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
          change,
          changePct,
          return1y,
        };
      }
    } catch {
      // Direct HTTP fetch fallback
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetSymbol)}?interval=1d`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && Number.isFinite(meta.regularMarketPrice) && meta.regularMarketPrice > 0) {
          const price = meta.regularMarketPrice;
          const prev = Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose : undefined;
          const change = prev !== undefined ? price - prev : undefined;
          const changePct = prev !== undefined && prev > 0 ? ((price - prev) / prev) * 100 : undefined;

          return {
            price,
            date: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
            change,
            changePct,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch Yahoo Finance for ${query}`, error);
    return null;
  }
}

/**
 * Derives the live market spot price of 1 gram of 24k gold in INR.
 * Uses Nippon India ETF Gold BeES (GOLDBEES.NS) scaled to Indian retail bullion spot rate (~₹13,950/g, ~₹1,39,500/10g).
 */
export async function getGoldSpotRatePerGram(): Promise<LiveData | null> {
  try {
    const goldbees = await fetchYahooStockPrice('GOLDBEES');
    if (goldbees && goldbees.price > 0) {
      const perGramMultiplier = 123.0; // 1230 per 10g => 123 per gram
      return {
        price: Number((goldbees.price * perGramMultiplier).toFixed(2)),
        date: goldbees.date,
        change: goldbees.change !== undefined ? Number((goldbees.change * perGramMultiplier).toFixed(2)) : undefined,
        changePct: goldbees.changePct,
        return1y: goldbees.return1y,
      };
    }
  } catch (e) {
    console.warn('Failed to calculate gold spot rate per gram', e);
  }
  return null;
}
