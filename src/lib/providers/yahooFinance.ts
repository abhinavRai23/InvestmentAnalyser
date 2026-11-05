import YahooFinance from 'yahoo-finance2';
import { LiveData } from './types';
import { KNOWN_TICKER_MAP, resolveYahooTicker } from '../tickerMapping';

export { KNOWN_TICKER_MAP, resolveYahooTicker };

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
          const fiftyTwoWeekHigh = Number.isFinite(q.fiftyTwoWeekHigh) ? q.fiftyTwoWeekHigh : undefined;
          const fiftyTwoWeekLow = Number.isFinite(q.fiftyTwoWeekLow) ? q.fiftyTwoWeekLow : undefined;
          const fiftyTwoWeekAvg = (fiftyTwoWeekHigh !== undefined && fiftyTwoWeekLow !== undefined)
            ? Number(((fiftyTwoWeekHigh + fiftyTwoWeekLow) / 2).toFixed(2))
            : undefined;
          const twoHundredDayAverage = Number.isFinite(q.twoHundredDayAverage) ? q.twoHundredDayAverage : undefined;
          const fiftyDayAverage = Number.isFinite(q.fiftyDayAverage) ? q.fiftyDayAverage : undefined;

          results.set(q.symbol.toUpperCase(), {
            price,
            date: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
            change,
            changePct,
            return1y,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,
            fiftyTwoWeekAvg,
            twoHundredDayAverage,
            fiftyDayAverage,
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
        const fiftyTwoWeekHigh = Number.isFinite(quote.fiftyTwoWeekHigh) ? quote.fiftyTwoWeekHigh : undefined;
        const fiftyTwoWeekLow = Number.isFinite(quote.fiftyTwoWeekLow) ? quote.fiftyTwoWeekLow : undefined;
        const fiftyTwoWeekAvg = (fiftyTwoWeekHigh !== undefined && fiftyTwoWeekLow !== undefined)
          ? Number(((fiftyTwoWeekHigh + fiftyTwoWeekLow) / 2).toFixed(2))
          : undefined;
        const twoHundredDayAverage = Number.isFinite(quote.twoHundredDayAverage) ? quote.twoHundredDayAverage : undefined;
        const fiftyDayAverage = Number.isFinite(quote.fiftyDayAverage) ? quote.fiftyDayAverage : undefined;

        return {
          price,
          date: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString(),
          change,
          changePct,
          return1y,
          fiftyTwoWeekHigh,
          fiftyTwoWeekLow,
          fiftyTwoWeekAvg,
          twoHundredDayAverage,
          fiftyDayAverage,
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
        fiftyTwoWeekHigh: goldbees.fiftyTwoWeekHigh !== undefined ? Number((goldbees.fiftyTwoWeekHigh * perGramMultiplier).toFixed(2)) : undefined,
        fiftyTwoWeekLow: goldbees.fiftyTwoWeekLow !== undefined ? Number((goldbees.fiftyTwoWeekLow * perGramMultiplier).toFixed(2)) : undefined,
        fiftyTwoWeekAvg: goldbees.fiftyTwoWeekAvg !== undefined ? Number((goldbees.fiftyTwoWeekAvg * perGramMultiplier).toFixed(2)) : undefined,
      };
    }
  } catch (e) {
    console.warn('Failed to calculate gold spot rate per gram', e);
  }
  return null;
}
