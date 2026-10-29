import YahooFinance from 'yahoo-finance2';
import { LiveData } from './types';

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchYahooStockPrice(query: string): Promise<LiveData | null> {
  try {
    const searchRes: any = await yahoo.search(query);
    const quotes = Array.isArray(searchRes.quotes)
      ? searchRes.quotes.filter((q: any) => typeof q?.symbol === 'string' && q.symbol.length > 0)
      : [];

    if (quotes.length === 0) return null;

    const indianQuote = quotes.find((q: any) => q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'));
    const symbol = indianQuote ? indianQuote.symbol : quotes[0].symbol;

    const quote: any = await yahoo.quote(symbol);
    if (quote && quote.regularMarketPrice) {
      return {
        price: quote.regularMarketPrice,
        date: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to fetch Yahoo Finance for ${query}`, error);
    return null;
  }
}
