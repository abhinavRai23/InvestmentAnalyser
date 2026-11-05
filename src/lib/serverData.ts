import fs from 'fs';
import path from 'path';
import { parseExcelStatement, combinePortfolios, extractStatementMetadata, ParsedStatement } from './parser';
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
  const fileEntries: {
    filename: string;
    filePath: string;
    meta: ReturnType<typeof extractStatementMetadata>;
    buffer: Buffer;
  }[] = [];

  for (const file of files) {
    if (file.endsWith('.xlsx') && !file.startsWith('~')) {
      const filePath = path.join(reportsDir, file);
      try {
        const buffer = fs.readFileSync(filePath);
        const meta = extractStatementMetadata(buffer, file);
        fileEntries.push({ filename: file, filePath, meta, buffer });
      } catch (err) {
        console.warn(`Could not read report file ${file}:`, err);
      }
    }
  }

  if (fileEntries.length === 0) {
    return null;
  }

  // Group by (statementType, ucc || ownerId) to deduplicate statements for the same user and type
  const grouped = new Map<string, typeof fileEntries>();
  for (const entry of fileEntries) {
    const ownerKey = (entry.meta.ucc || entry.meta.ownerId).trim().toLowerCase();
    const groupKey = `${entry.meta.statementType}:${ownerKey}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(entry);
  }

  const parsedFiles: ParsedStatement[] = [];

  for (const [, entries] of grouped.entries()) {
    // Sort descending by statementTimestamp: newest first
    entries.sort((a, b) => b.meta.statementTimestamp - a.meta.statementTimestamp);

    const newest = entries[0];
    const parsed = parseExcelStatement(newest.buffer, newest.filename);
    if (parsed) {
      parsedFiles.push(parsed);
    }

    // Clean up any older duplicate files on disk to keep only the newer dated file
    if (entries.length > 1) {
      for (let i = 1; i < entries.length; i++) {
        const older = entries[i];
        try {
          fs.unlinkSync(older.filePath);
          console.log(`[serverData] Removed older duplicate statement file "${older.filename}" (kept newer "${newest.filename}")`);
        } catch (unlinkErr) {
          console.warn(`Failed to remove older duplicate file ${older.filename}:`, unlinkErr);
        }
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
