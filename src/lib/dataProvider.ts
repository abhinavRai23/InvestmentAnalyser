import fs from 'fs';
import path from 'path';

export interface UnderlyingHolding {
  stockName: string;
  sector: string;
  weight: number;
  instrumentClass?: string;
}

export type MFHoldingsDatabase = Record<string, UnderlyingHolding[]>;

export function getMFHoldingsData(): MFHoldingsDatabase {
  try {
    const filePath = path.join(process.cwd(), 'data', 'mf_holdings.json');
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data) as MFHoldingsDatabase;
    
    // Clean up garbage data from scraper
    const cleaned: MFHoldingsDatabase = {};
    for (const [fundName, holdings] of Object.entries(parsed)) {
      cleaned[fundName] = holdings.filter(h => {
        const nameLower = h.stockName.toLowerCase();
        const sectorLower = h.sector.toLowerCase();
        
        // Remove rows where sector looks like currency or percentage
        if (sectorLower.includes('₹') || sectorLower.includes('%')) return false;
        
        // Remove rows where stockName looks like a time period or UI label
        if (nameLower.includes('year') || nameLower.includes('month') || nameLower.includes('return') || nameLower.includes('invest')) return false;
        
        return true;
      });
    }
    
    return cleaned;
  } catch (error) {
    console.error("Failed to read mf_holdings.json", error);
    return {};
  }
}
