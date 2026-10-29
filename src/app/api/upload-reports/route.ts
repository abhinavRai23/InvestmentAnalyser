import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerPortfolioData } from '@/lib/serverData';
import { parseExcelStatement, parseCustomAssetsExcel, combinePortfolios, generateBankFDTemplateWorkbook } from '@/lib/parser';
import { getMFHoldingsData } from '@/lib/dataProvider';
import { PortfolioData, CustomAsset, Person, Holding } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const isLocalMode = process.env.ENABLE_LOCAL_PORTFOLIO === 'true';
    const reportsDir = path.join(process.cwd(), 'data', 'reports');

    if (isLocalMode && !fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let savedCount = 0;
    const inMemoryStatements: { ownerId: string; holdings: Holding[] }[] = [];
    const inMemoryCustomAssets: CustomAsset[] = [];
    const inMemoryPeopleMap = new Map<string, Person>();

    for (const file of files) {
      const fileNameLower = file.name.toLowerCase();

      // 1. Handle JSON Backup or Custom Assets file
      if (fileNameLower.endsWith('.json')) {
        const text = await file.text();
        try {
          const parsedJson = JSON.parse(text);
          // Check if it's a full portfolio backup
          if (parsedJson && (parsedJson.holdings || parsedJson.customAssets || parsedJson.portfolio)) {
            const backupData: PortfolioData = parsedJson.portfolio || parsedJson;
            if (Array.isArray(backupData.holdings)) {
              inMemoryStatements.push({
                ownerId: backupData.people?.[0]?.name || 'Imported User',
                holdings: backupData.holdings
              });
            }
            if (Array.isArray(backupData.customAssets)) {
              inMemoryCustomAssets.push(...backupData.customAssets);
            }
            if (Array.isArray(backupData.people)) {
              backupData.people.forEach(p => inMemoryPeopleMap.set(p.id, p));
            }
            savedCount++;
            continue;
          }

          // Check if it's an array of custom assets
          if (Array.isArray(parsedJson)) {
            inMemoryCustomAssets.push(...parsedJson);
            savedCount++;
            continue;
          }
        } catch (e) {
          console.warn(`Could not parse JSON file ${file.name}:`, e);
        }
        continue;
      }

      // 2. Handle Excel files (.xlsx)
      if (fileNameLower.endsWith('.xlsx') && !file.name.startsWith('~')) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // If in local dev mode, save to disk for persistence
        if (isLocalMode) {
          const filePath = path.join(reportsDir, file.name);
          fs.writeFileSync(filePath, buffer);
        }

        // Check if file is a Bank / FD Custom Assets spreadsheet
        const customParsed = parseCustomAssetsExcel(buffer);
        if (customParsed && customParsed.assets.length > 0) {
          inMemoryCustomAssets.push(...customParsed.assets);
          if (customParsed.ownerId) {
            inMemoryPeopleMap.set(customParsed.ownerId, { id: customParsed.ownerId, name: customParsed.ownerId });
          }
          savedCount++;
          continue;
        }

        // Check if file is a Groww statement (Mutual Funds or Stocks)
        const parsed = parseExcelStatement(buffer, file.name);
        if (parsed) {
          inMemoryStatements.push(parsed);
          savedCount++;
        } else {
          console.warn(`Could not parse ${file.name} as Groww statement`);
        }
      }
    }

    // In local dev mode with disk files, re-parse all local reports if available
    let responsePortfolio: PortfolioData | null = null;
    if (isLocalMode) {
      responsePortfolio = getServerPortfolioData();
    }

    // If not in local mode or local had no data, build combined portfolio from uploaded files
    if (!responsePortfolio && (inMemoryStatements.length > 0 || inMemoryCustomAssets.length > 0)) {
      const combined = combinePortfolios(inMemoryStatements);

      // Merge people from custom assets
      inMemoryCustomAssets.forEach(ca => {
        if (!combined.people.some(p => p.id === ca.ownerId || p.name === ca.ownerId)) {
          combined.people.push({ id: ca.ownerId, name: ca.ownerId });
        }
      });

      inMemoryPeopleMap.forEach((person, id) => {
        if (!combined.people.some(p => p.id === id || p.name === person.name)) {
          combined.people.push(person);
        }
      });

      combined.customAssets = inMemoryCustomAssets;
      combined.mfHoldings = getMFHoldingsData();
      responsePortfolio = combined;
    } else if (responsePortfolio && inMemoryCustomAssets.length > 0) {
      // Merge custom assets uploaded in this batch
      responsePortfolio.customAssets = [
        ...(responsePortfolio.customAssets || []),
        ...inMemoryCustomAssets
      ];
    }

    return NextResponse.json({
      success: true,
      savedCount,
      data: responsePortfolio
    });
  } catch (error: any) {
    console.error('Failed to upload report files:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload reports' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Endpoint for downloading Bank & FD Excel Template
    if (searchParams.get('template') === 'bank-fd') {
      const buffer = generateBankFDTemplateWorkbook();
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Bank_and_FD_Template.xlsx"',
        },
      });
    }

    // Security check: Only list server disk files if local mode is explicitly enabled
    if (process.env.ENABLE_LOCAL_PORTFOLIO !== 'true') {
      return NextResponse.json({ files: [] });
    }

    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ files: [] });
    }

    const fileNames = fs.readdirSync(reportsDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~'));
    const fileDetails = fileNames.map(name => {
      const filePath = path.join(reportsDir, name);
      const stats = fs.statSync(filePath);
      return {
        name,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });

    return NextResponse.json({ files: fileDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
