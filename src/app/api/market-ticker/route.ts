import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

interface TickerResult {
  key: string;
  name: string;
  symbol: string;
  unit: string;
  price: number;
  change: number;
  changePct: number;
}

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Converts one ETF unit's INR quote to the displayed Indian bullion unit.
// Calibrated to the same-session 16 Oct 2026 closes; these are scale factors,
// not tax/duty multipliers. ETF NAV, market premium, and fund expenses can drift.
const GOLDBEES_TO_INR_PER_10G = 1218.19;
const SILVERBEES_TO_INR_PER_KG = 1054.91;

export async function GET() {
  try {
    const symbols = [
      { key: "nse", name: "Nifty 50", symbol: "^NSEI", unit: "Pts" },
      { key: "bse", name: "Sensex", symbol: "^BSESN", unit: "Pts" },
      // These INR ETF proxies avoid converting COMEX futures using estimated
      // currency, duty, GST, and contract basis adjustments.
      { key: "gold", name: "Gold (10g)", symbol: "GOLDBEES.NS", unit: "₹/10g", priceMultiplier: GOLDBEES_TO_INR_PER_10G },
      { key: "silver", name: "Silver (1kg)", symbol: "SILVERBEES.NS", unit: "₹/1kg", priceMultiplier: SILVERBEES_TO_INR_PER_KG },
      { key: "usdinr", name: "USD / INR", symbol: "USDINR=X", unit: "₹/$" },
    ];

    const results = await Promise.all(
      symbols.map(async (s) => {
        try {
          let rawPrice: number | undefined;
          let rawPrev: number | undefined;

          // Attempt 1: yahoo-finance2 SDK
          try {
            const q: any = await yahoo.quote(s.symbol);
            if (Number.isFinite(q?.regularMarketPrice) && q.regularMarketPrice > 0) {
              rawPrice = q.regularMarketPrice;
              rawPrev = Number.isFinite(q.regularMarketPreviousClose)
                ? q.regularMarketPreviousClose
                : undefined;
            }
          } catch (sdkErr) {
            console.warn(
              `SDK quote failed for ${s.symbol}, trying direct fetch`,
              sdkErr,
            );
          }

          // Attempt 2: Direct HTTP fetch fallback
          if (rawPrice === undefined) {
            const res = await fetch(
              `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol)}?interval=1d`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                },
                cache: "no-store",
              },
            );
            if (res.ok) {
              const data = await res.json();
              const meta = data?.chart?.result?.[0]?.meta;
              if (meta && Number.isFinite(meta.regularMarketPrice) && meta.regularMarketPrice > 0) {
                rawPrice = meta.regularMarketPrice;
                rawPrev = Number.isFinite(meta.chartPreviousClose)
                  ? meta.chartPreviousClose
                  : undefined;
              }
            }
          }

          if (rawPrice === undefined) {
            console.warn(`No price available for ${s.name}`);
            return null;
          }

          const priceMultiplier = ("priceMultiplier" in s && typeof (s as any).priceMultiplier === "number") ? (s as any).priceMultiplier : 1;
          const finalPrice = rawPrice * priceMultiplier;
          // Compute from this symbol's own price and previous close. If Yahoo
          // omits the previous close, report zero instead of borrowing a value.
          const changePct =
            rawPrev !== undefined && rawPrev > 0
              ? ((rawPrice - rawPrev) / rawPrev) * 100
              : 0;

          return {
            key: s.key,
            name: s.name,
            symbol: s.symbol,
            unit: s.unit,
            price: finalPrice,
            change: finalPrice * (changePct / 100),
            changePct,
          } as TickerResult;
        } catch (e) {
          console.warn(`Failed ticker for ${s.name}`, e);
          return null;
        }
      }),
    );

    const filtered = results.filter(Boolean);
    return NextResponse.json({ tickerData: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 },
    );
  }
}
