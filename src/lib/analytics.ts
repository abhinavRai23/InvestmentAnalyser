import { Holding } from './types';
import { calculateOverlap } from './overlapEngine';
import { UnderlyingHolding } from './dataProvider';
import { normalizeCompanyName } from './utils';

export interface CompanyExposure {
  name: string;
  totalExposure: number;
  directExposure: number;
  indirectExposure: number;
  sector: string;
  percentage?: number;
  fundsHolding: {
    fundName: string;
    fundCurrentValue: number;
    weightInFund: number;
    effectiveValueFromFund: number;
  }[];
}

export interface IndustryExposure {
  sector: string;
  totalExposure: number;
  percentage?: number;
  fundsHolding: {
    fundName: string;
    fundCurrentValue: number;
    weightInFund: number;
    effectiveValueFromFund: number;
  }[];
  directHolding: {
    companyName: string;
    value: number;
  }[];
}

export function getTopCompaniesAndIndustries(
  holdings: Holding[],
  mfDatabase: Record<string, UnderlyingHolding[]>
) {
  const companyMap = new Map<string, CompanyExposure>();
  const industryMap = new Map<string, IndustryExposure>();
  let totalEquityExposure = 0;

  // 1. Process Direct Stocks
  for (const holding of holdings) {
    if (holding.assetType !== 'stock') continue;
    
    // Default to unknown sector for direct stocks unless we match it later
    const sector = "Unknown";
    const canonicalKey = normalizeCompanyName(holding.name);
    
    let comp = companyMap.get(canonicalKey);
    if (!comp) {
      comp = { 
        name: holding.name, 
        totalExposure: 0, 
        directExposure: 0, 
        indirectExposure: 0, 
        sector,
        fundsHolding: []
      };
      companyMap.set(canonicalKey, comp);
    }
    
    comp.directExposure += holding.currentValue;
    comp.totalExposure += holding.currentValue;
    totalEquityExposure += holding.currentValue;
  }

  // 2. Process MF Overlap (Indirect Exposure)
  const overlapData = calculateOverlap(holdings, mfDatabase);
  
  for (const overlap of overlapData) {
    const canonicalKey = normalizeCompanyName(overlap.stockName);
    
    // Overlap engine already filters out Cash and Debt, leaving only Equity
    let comp = companyMap.get(canonicalKey);
    
    // If direct stock exists, we can update its sector if we have it from MF DB
    if (comp) {
      if (comp.sector === "Unknown" && overlap.sector) {
        comp.sector = overlap.sector;
      }
      if (comp.name.toUpperCase() === comp.name && overlap.stockName.length > comp.name.length) {
        comp.name = overlap.stockName; // Prefer MF display name over direct stock ticker
      }
    } else {
      comp = { 
        name: overlap.stockName, 
        totalExposure: 0, 
        directExposure: 0, 
        indirectExposure: 0, 
        sector: overlap.sector || "Unknown",
        fundsHolding: []
      };
      companyMap.set(canonicalKey, comp);
    }

    comp.indirectExposure += overlap.totalEffectiveValue;
    comp.totalExposure += overlap.totalEffectiveValue;
    totalEquityExposure += overlap.totalEffectiveValue;
    comp.fundsHolding = overlap.fundsHolding;
  }

  // 3. Aggregate Industries
  for (const comp of companyMap.values()) {
    let ind = industryMap.get(comp.sector);
    if (!ind) {
      ind = { sector: comp.sector, totalExposure: 0, fundsHolding: [], directHolding: [] };
      industryMap.set(comp.sector, ind);
    }
    ind.totalExposure += comp.totalExposure;
    
    if (comp.directExposure > 0) {
      ind.directHolding.push({ companyName: comp.name, value: comp.directExposure });
    }
    
    for (const fund of comp.fundsHolding) {
      const existing = ind.fundsHolding.find(f => f.fundName === fund.fundName);
      if (existing) {
        existing.effectiveValueFromFund += fund.effectiveValueFromFund;
      } else {
        ind.fundsHolding.push({ ...fund });
      }
    }
  }

  const topCompanies = Array.from(companyMap.values())
    .filter(c => !c.name.toLowerCase().includes('unknown') && !c.name.toLowerCase().includes('unspecified'))
    .map(c => ({
      ...c,
      percentage: totalEquityExposure > 0 ? (c.totalExposure / totalEquityExposure) * 100 : 0
    }))
    .sort((a, b) => b.totalExposure - a.totalExposure)
    .slice(0, 10); // Limit to top 10

  const topIndustries = Array.from(industryMap.values())
    .filter(i => !i.sector.toLowerCase().includes('unknown') && !i.sector.toLowerCase().includes('unspecified') && i.sector !== '-')
    .map(i => ({
      ...i,
      percentage: totalEquityExposure > 0 ? (i.totalExposure / totalEquityExposure) * 100 : 0
    }))
    .sort((a, b) => b.totalExposure - a.totalExposure);

  return { topCompanies, topIndustries };
}

export interface RiskAlert {
  level: "high" | "medium";
  type: "company" | "sector" | "amc";
  title: string;
  description: string;
  percentage: number;
  value: number;
}

export function analyzeConcentrationRisk(
  holdings: Holding[],
  mfDatabase: Record<string, UnderlyingHolding[]>
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const { topCompanies, topIndustries } = getTopCompaniesAndIndustries(holdings, mfDatabase);

  // 1. Company Concentration (> 10% high, > 5% medium)
  for (const comp of topCompanies) {
    if (!comp.percentage) continue;
    if (comp.percentage >= 10) {
      alerts.push({
        level: "high",
        type: "company",
        title: `High Exposure to ${comp.name}`,
        description: `${comp.percentage.toFixed(1)}% of your equity portfolio is concentrated in a single company.`,
        percentage: comp.percentage,
        value: comp.totalExposure
      });
    } else if (comp.percentage >= 5) {
      alerts.push({
        level: "medium",
        type: "company",
        title: `Significant Exposure to ${comp.name}`,
        description: `${comp.percentage.toFixed(1)}% of your equity portfolio is concentrated in a single company.`,
        percentage: comp.percentage,
        value: comp.totalExposure
      });
    }
  }

  // 2. Sector Concentration (> 25% high, > 15% medium)
  for (const ind of topIndustries) {
    if (!ind.percentage) continue;
    if (ind.percentage >= 25) {
      alerts.push({
        level: "high",
        type: "sector",
        title: `Overweight in ${ind.sector} Sector`,
        description: `${ind.percentage.toFixed(1)}% of your equity portfolio is in the ${ind.sector} sector, which could be risky if the sector underperforms.`,
        percentage: ind.percentage,
        value: ind.totalExposure
      });
    } else if (ind.percentage >= 15) {
      alerts.push({
        level: "medium",
        type: "sector",
        title: `High Exposure to ${ind.sector} Sector`,
        description: `${ind.percentage.toFixed(1)}% of your equity portfolio is in the ${ind.sector} sector.`,
        percentage: ind.percentage,
        value: ind.totalExposure
      });
    }
  }

  // 3. AMC Concentration
  const amcMap = new Map<string, number>();
  let totalMfValue = 0;
  for (const h of holdings) {
    if (h.assetType !== 'mutual_fund') continue;
    totalMfValue += h.currentValue;
    
    // Naive AMC extraction if not provided explicitly: first word usually represents AMC (e.g. "HDFC", "ICICI", "Parag")
    let amc = h.amc;
    if (!amc) {
      const parts = h.name.split(' ');
      amc = parts[0];
      if (amc.toLowerCase() === 'parag' && parts[1]?.toLowerCase() === 'parikh') amc = 'Parag Parikh';
      if (amc.toLowerCase() === 'icici' && parts[1]?.toLowerCase() === 'prudential') amc = 'ICICI Prudential';
      if (amc.toLowerCase() === 'tata' || amc.toLowerCase() === 'sbi' || amc.toLowerCase() === 'hdfc') amc = amc.toUpperCase();
    }
    
    amcMap.set(amc, (amcMap.get(amc) || 0) + h.currentValue);
  }

  if (totalMfValue > 0) {
    for (const [amc, value] of amcMap.entries()) {
      const percentage = (value / totalMfValue) * 100;
      if (percentage >= 30) {
        alerts.push({
          level: "high",
          type: "amc",
          title: `High AMC Concentration in ${amc}`,
          description: `${percentage.toFixed(1)}% of your mutual fund investments are managed by ${amc}. Consider diversifying across different fund houses to reduce AMC-specific risk.`,
          percentage,
          value
        });
      }
    }
  }

  // Sort alerts by severity and then percentage
  return alerts.sort((a, b) => {
    if (a.level === b.level) return b.percentage - a.percentage;
    return a.level === "high" ? -1 : 1;
  });
}
