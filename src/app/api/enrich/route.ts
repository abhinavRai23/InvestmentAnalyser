import { NextResponse } from 'next/server';
import { fetchMfapiNav } from '@/lib/providers/mfapi';
import { fetchYahooStockPrice } from '@/lib/providers/yahooFinance';

export async function POST(req: Request) {
  try {
    const { assets } = await req.json();
    
    // Process in parallel with a concurrency limit if needed, but for now `Promise.all` is fine for small portfolios
    // Map over assets and fetch
    const results = await Promise.all(assets.map(async (asset: { id: string, name: string, type: string }) => {
      let liveData = null;
      
      if (asset.type === 'mutual_fund') {
        liveData = await fetchMfapiNav(asset.name);
      } else if (asset.type === 'stock' || asset.type === 'etf') {
        liveData = await fetchYahooStockPrice(asset.name);
      }

      return {
        id: asset.id,
        liveData
      };
    }));

    // Convert to a dictionary for easier consumption
    const enrichedData = results.reduce((acc, curr) => {
      if (curr.liveData) {
        acc[curr.id] = curr.liveData;
      }
      return acc;
    }, {} as Record<string, { price: number; date: string }>);

    return NextResponse.json({ enrichedData });
  } catch (error: any) {
    console.error("Enrichment API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
