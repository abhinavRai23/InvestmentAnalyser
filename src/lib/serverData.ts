import fs from 'fs';
import path from 'path';
import { parseExcelStatement, combinePortfolios } from './parser';
import { PortfolioData } from './types';
import { getMFHoldingsData } from './dataProvider';

export function getServerPortfolioData(): PortfolioData | null {
  // Security guard:
  // - In development (local machine): load local data by default unless explicitly disabled with ENABLE_LOCAL_PORTFOLIO=false.
  // - In production/deployments (Vercel, etc.): strictly disabled by default to prevent leaking private reports or bank data.
  const isDev = process.env.NODE_ENV === 'development';
  const isExplicitlyDisabled = process.env.ENABLE_LOCAL_PORTFOLIO === 'false';
  const isExplicitlyEnabled = process.env.ENABLE_LOCAL_PORTFOLIO === 'true';

  const shouldLoad = isExplicitlyEnabled || (isDev && !isExplicitlyDisabled);

  if (!shouldLoad) {
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
