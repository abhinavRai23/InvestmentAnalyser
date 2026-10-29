import fs from 'fs';
import path from 'path';
import { parseExcelStatement, combinePortfolios } from './parser';
import { PortfolioData } from './types';
import { getMFHoldingsData } from './dataProvider';

export function getServerPortfolioData(): PortfolioData | null {
  // Security guard: Only load server files if explicitly enabled (e.g., in local dev via .env.local).
  // Prevents accidental leakage of personal financial data on public deployments or shared sessions.
  if (process.env.ENABLE_LOCAL_PORTFOLIO !== 'true') {
    return null;
  }

  const reportsDir = path.join(process.cwd(), 'data', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    return null;
  }

  const files = fs.readdirSync(reportsDir);
  const parsedFiles = [];

  for (const file of files) {
    if (file.endsWith('.xlsx') && !file.startsWith('~')) {
      const filePath = path.join(reportsDir, file);
      const buffer = fs.readFileSync(filePath);
      
      const parsed = parseExcelStatement(buffer, file);
      if (parsed) {
        parsedFiles.push(parsed);
      } else {
        console.warn(`Could not parse ${file}`);
      }
    }
  }

  if (parsedFiles.length === 0) {
    return null;
  }

  const combined = combinePortfolios(parsedFiles);
  combined.mfHoldings = getMFHoldingsData();
  
  try {
    const customAssetsPath = path.join(process.cwd(), 'data', 'custom_assets.json');
    if (fs.existsSync(customAssetsPath)) {
      const rawCustom = fs.readFileSync(customAssetsPath, 'utf8');
      combined.customAssets = JSON.parse(rawCustom);
    } else {
      combined.customAssets = [];
    }
  } catch (e) {
    console.error("Failed to read custom_assets.json", e);
    combined.customAssets = [];
  }

  return combined;
}
