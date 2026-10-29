import { Holding, Person, AssetType } from "./types";

export interface PortfolioMetrics {
  investedValue: number;
  currentValue: number;
  absoluteReturn: number;
  returnPercentage: number;
  numberOfHoldings: number;
}

export interface FilterOptions {
  ownerIds?: string[];
  assetTypes?: AssetType[];
}

export function filterHoldings(holdings: Holding[], filters: FilterOptions): Holding[] {
  return holdings.filter(h => {
    if (filters.ownerIds && filters.ownerIds.length > 0 && !filters.ownerIds.includes(h.ownerId)) return false;
    if (filters.assetTypes && filters.assetTypes.length > 0 && !filters.assetTypes.includes(h.assetType)) return false;
    return true;
  });
}

export function calculateMetrics(holdings: Holding[]): PortfolioMetrics {
  let investedValue = 0;
  let currentValue = 0;

  for (const h of holdings) {
    investedValue += h.investedValue;
    currentValue += h.currentValue;
  }

  const absoluteReturn = currentValue - investedValue;
  const returnPercentage = investedValue > 0 ? (absoluteReturn / investedValue) * 100 : 0;

  return {
    investedValue,
    currentValue,
    absoluteReturn,
    returnPercentage,
    numberOfHoldings: holdings.length
  };
}

export function getPortfolioSummary(holdings: Holding[]) {
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const absoluteReturn = totalCurrent - totalInvested;
  const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

  return { totalInvested, totalCurrent, absoluteReturn, returnPercentage };
}

export function getAllocationByAssetType(holdings: Holding[]) {
  const map = new Map<string, number>();
  for (const h of holdings) {
    const type = h.assetType === 'stock' ? 'Stocks' :
      h.assetType === 'mutual_fund' ? 'Mutual Funds' :
        h.assetType === 'sgb' ? 'Gold' :
          h.assetType === 'etf' ? 'ETF' :
            h.assetType === 'gold' ? 'Gold' :
              h.assetType === 'silver' ? 'Silver' :
                h.assetType === 'pf' ? 'Provident Fund' : 'Other';
    map.set(type, (map.get(type) || 0) + h.currentValue);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function getAllocationByStrategicAssetClass(holdings: Holding[]) {
  const map = new Map<string, number>();
  for (const h of holdings) {
    const type = h.strategicAssetClass || 'Other';
    map.set(type, (map.get(type) || 0) + h.currentValue);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getAllocationByProductType(holdings: Holding[]) {
  const map = new Map<string, number>();
  for (const h of holdings) {
    const type = h.productType || 'Other';
    map.set(type, (map.get(type) || 0) + h.currentValue);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getAllocationByPerson(holdings: Holding[], people: Person[]) {
  const map = new Map<string, number>();
  for (const h of holdings) {
    if (h.owners && h.owners.length > 0) {
      for (const o of h.owners) {
        const person = people.find(p => p.id === o.ownerId || p.name === o.ownerId)?.name || o.ownerName || o.ownerId;
        if (person && person !== 'ALL') {
          map.set(person, (map.get(person) || 0) + o.currentValue);
        }
      }
    } else {
      const person = people.find(p => p.id === h.ownerId || p.name === h.ownerId)?.name || h.ownerId;
      if (person && person !== 'ALL') {
        map.set(person, (map.get(person) || 0) + h.currentValue);
      }
    }
  }
  return Array.from(map.entries())
    .filter(([name]) => name && name !== 'ALL')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export interface PeriodReturnItem {
  period: string;
  label: string;
  gain: number;
  percentage: number;
  evaluatedValue: number;
}

export function calculatePortfolioPeriodReturns(
  holdings: Holding[],
  cache: Record<string, any>
): Record<string, PeriodReturnItem> {
  const periodConfigs = [
    { key: '1d', label: '1 Day', period: '1D' },
    { key: '1w', label: '1 Week', period: '1W' },
    { key: '1m', label: '1 Month', period: '1M' },
    { key: '3m', label: '3 Months', period: '3M' },
    { key: '6m', label: '6 Months', period: '6M' },
    { key: '1y', label: '1 Year', period: '1Y' },
  ];

  const result: Record<string, PeriodReturnItem> = {};

  for (const cfg of periodConfigs) {
    const keyName = 'return' + cfg.key;
    let totalWeightedGain = 0;
    let totalValEvaluated = 0;

    for (const h of holdings) {
      const entry = (h.isin && cache[h.isin]) || cache[h.name];
      if (entry) {
        const ret = entry.return_stats?.[0]?.[keyName] ?? entry.simple_return?.[keyName];
        if (ret !== undefined && ret !== null) {
          totalWeightedGain += h.currentValue * (ret / 100);
          totalValEvaluated += h.currentValue;
        }
      }
    }

    const pct = totalValEvaluated > 0 ? (totalWeightedGain / totalValEvaluated) * 100 : 0;
    result[cfg.period] = {
      period: cfg.period,
      label: cfg.label,
      gain: totalWeightedGain,
      percentage: pct,
      evaluatedValue: totalValEvaluated
    };
  }

  return result;
}
