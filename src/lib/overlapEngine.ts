import { Holding } from './types';
import { UnderlyingHolding } from './dataProvider';
import { normalizeCompanyName } from './utils';

export interface OverlappedStock {
  stockName: string;
  sector: string;
  instrumentClass: 'Equity' | 'Debt' | 'Cash Equivalent' | 'Other';
  totalEffectiveValue: number;
  fundsHolding: {
    fundName: string;
    fundCurrentValue: number;
    weightInFund: number;
    effectiveValueFromFund: number;
  }[];
}

function classifyInstrument(stockName: string): 'Equity' | 'Debt' | 'Cash Equivalent' | 'Other' {
  const name = stockName.toLowerCase();
  
  if (name.includes('repo') || name.includes('treps') || name.includes('net current asset') || name.includes('cash') || name.includes('margin')) {
    return 'Cash Equivalent';
  }
  
  if (name.includes('bond') || name.includes('g-sec') || name.includes('bill') || name.includes('-year') || name.includes('zcb') || name.includes('ncd')) {
    return 'Debt';
  }

  // Fallback to equity for mutual fund overlap unless it matches debt/cash signatures
  return 'Equity';
}

export function calculateOverlap(
  mfHoldings: Holding[],
  mfDatabase: Record<string, UnderlyingHolding[]>
): OverlappedStock[] {
  const stockMap = new Map<string, OverlappedStock>();
  
  // Group multiple transactions of the same mutual fund to prevent duplicate fund entries
  const aggregatedMFs = new Map<string, Holding>();
  for (const mf of mfHoldings) {
    if (mf.assetType !== 'mutual_fund' && mf.assetType !== 'etf') continue;
    if (aggregatedMFs.has(mf.name)) {
      const existing = aggregatedMFs.get(mf.name)!;
      existing.currentValue += mf.currentValue;
    } else {
      aggregatedMFs.set(mf.name, { ...mf });
    }
  }

  for (const mf of aggregatedMFs.values()) {
    const underlying = mfDatabase[mf.name];
    if (!underlying || underlying.length === 0) continue;

    for (const stock of underlying) {
      const effectiveValue = (stock.weight / 100) * mf.currentValue;
      const instrumentClass = stock.instrumentClass ? (stock.instrumentClass as any) : classifyInstrument(stock.stockName);

      // We only want to show Equity overlap in the main table to avoid noise
      if (instrumentClass !== 'Equity') continue;
      
      const canonicalKey = normalizeCompanyName(stock.stockName);
      let entry = stockMap.get(canonicalKey);
      if (!entry) {
        entry = {
          stockName: stock.stockName, // Keep best display name
          sector: stock.sector,
          instrumentClass: instrumentClass,
          totalEffectiveValue: 0,
          fundsHolding: []
        };
        stockMap.set(canonicalKey, entry);
      } else {
        // If the existing name is a raw ticker (all caps/short), and we just found a nice title-case MF name, swap the display name!
        if (entry.stockName.toUpperCase() === entry.stockName && stock.stockName.length > entry.stockName.length) {
          entry.stockName = stock.stockName;
        }
      }

      entry.totalEffectiveValue += effectiveValue;
      
      const existingFund = entry.fundsHolding.find(f => f.fundName === mf.name);
      if (existingFund) {
        existingFund.effectiveValueFromFund += effectiveValue;
        existingFund.fundCurrentValue += mf.currentValue;
        // The weight should ideally be recalculated based on the aggregated values
        existingFund.weightInFund = (existingFund.effectiveValueFromFund / existingFund.fundCurrentValue) * 100;
      } else {
        entry.fundsHolding.push({
          fundName: mf.name,
          fundCurrentValue: mf.currentValue,
          weightInFund: stock.weight,
          effectiveValueFromFund: effectiveValue
        });
      }
    }
  }

  // Convert map to array and sort by highest effective value
  return Array.from(stockMap.values()).sort((a, b) => b.totalEffectiveValue - a.totalEffectiveValue);
}
