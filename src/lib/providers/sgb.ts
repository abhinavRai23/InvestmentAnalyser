import { LiveData } from "./types";
import { getDb } from "../db";
import { getGoldSpotRatePerGram } from "./yahooFinance";

export const KNOWN_SGB_MAP: Record<string, { symbol: string; searchId: string }> = {
  "IN0020230093": { symbol: "SGBSEP31II", searchId: "sgbsep31ii" },
  "IN0020230069": { symbol: "SGBJUN31I", searchId: "sgbjun31i" },
  "IN0020210178": { symbol: "SGBNV29VII", searchId: "sgbnv29vii" },
  "IN0020230168": { symbol: "SGBDE31III", searchId: "sgbde31iii" },
  "IN0020230184": { symbol: "SGBFEB32IV", searchId: "sgbfeb32iv" },
  "2.50%GOLDBONDS2031SR-II": { symbol: "SGBSEP31II", searchId: "sgbsep31ii" },
  "2.50%GOLDBONDS2031SR-I": { symbol: "SGBJUN31I", searchId: "sgbjun31i" },
  "2.5%GOLDBONDS2029SR-VII": { symbol: "SGBNV29VII", searchId: "sgbnv29vii" },
  "2.50%GOLDBONDS2031SR-III": { symbol: "SGBDE31III", searchId: "sgbde31iii" },
  "2.50%GOLDBONDS2032SR-IV": { symbol: "SGBFEB32IV", searchId: "sgbfeb32iv" },
};

/**
 * Resolves the NSE trading symbol for an SGB holding.
 */
export function resolveSgbSymbol(isin?: string, name?: string): string | null {
  if (isin && KNOWN_SGB_MAP[isin]) return KNOWN_SGB_MAP[isin].symbol;
  if (name && KNOWN_SGB_MAP[name]) return KNOWN_SGB_MAP[name].symbol;

  try {
    const db = getDb();
    if (isin) {
      const row = db.prepare("SELECT nse_symbol FROM sgb_mappings WHERE isin = ?").get(isin) as any;
      if (row?.nse_symbol) return row.nse_symbol;
    }
    if (name) {
      const row = db.prepare("SELECT nse_symbol FROM sgb_mappings WHERE name = ? OR isin = ?").get(name, name) as any;
      if (row?.nse_symbol) return row.nse_symbol;
    }
  } catch {
    // Ignore DB fallback errors
  }

  return null;
}

/**
 * Fetches live price, 1-day change, and 1-day change % for an SGB directly from Groww's NSE cash segment API.
 */
export async function fetchSgbLivePrice(isin?: string, name?: string): Promise<LiveData | null> {
  const symbol = resolveSgbSymbol(isin, name);

  if (symbol) {
    try {
      const res = await fetch(
        `https://groww.in/v1/api/stocks_data/v1/accord_points/exchange/NSE/segment/CASH/latest_prices_ohlc/${symbol}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const d = await res.json();
        const price =
          Number.isFinite(d.ltp) && d.ltp > 0
            ? d.ltp
            : Number.isFinite(d.close) && d.close > 0
            ? d.close
            : null;

        if (price) {
          const change = Number.isFinite(d.dayChange) ? d.dayChange : 0;
          const changePct = Number.isFinite(d.dayChangePerc) ? d.dayChangePerc : 0;
          
          let return1y: number | undefined = undefined;
          try {
            const gold = await getGoldSpotRatePerGram();
            if (gold && typeof gold.return1y === "number") {
              return1y = gold.return1y;
            }
          } catch {
            // Ignore gold benchmark error
          }

          return {
            price,
            date: new Date().toISOString(),
            change,
            changePct,
            return1y,
          };
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch live price for SGB ${symbol} from Groww`, err);
    }
  }

  // Graceful fallback: Physical bullion spot gold rate
  return getGoldSpotRatePerGram();
}
