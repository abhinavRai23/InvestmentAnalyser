import * as xlsx from 'xlsx';
import { Holding, Person, PortfolioData, AssetType, CustomAsset, CustomAssetCategory } from "./types";
import { classifyHolding } from './taxonomy';
import { v4 as uuidv4 } from 'uuid';

export function parseNumber(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  // Remove commas, spaces, currency symbols, %, Avg., shares, and plus signs
  const cleaned = String(value).replace(/[%+,\s]|Avg\.|shares|₹/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function inferAssetType(name: string, isMF: boolean): AssetType {
  const upperName = name.toUpperCase();
  if (isMF) return "mutual_fund";

  if (upperName.includes("SGB") || upperName.includes("GOLDBOND")) return "sgb";
  if (
    upperName.includes("BEES") ||
    upperName.includes("ETF") ||
    upperName.includes("MASPTOP50") ||
    upperName.includes("MAFANG") ||
    upperName.includes("MON100") ||
    upperName.includes("BHARATIWIN") ||
    upperName.includes("CPSE") ||
    upperName.includes("NXT50") ||
    upperName.includes("HDFCNIFTY") ||
    upperName.includes("NIFTYBETA") ||
    upperName.includes("TATAGOLD") ||
    upperName.includes("TATSILV")
  ) {
    if (upperName.includes("GOLD") || upperName.includes("TATAGOLD")) return "gold";
    if (upperName.includes("SILVER") || upperName.includes("TATSILV")) return "silver";
    return "etf";
  }

  if (upperName.includes("GOLD")) return "gold";
  if (upperName.includes("SILVER")) return "silver";

  return "stock";
}

export interface StatementMetadata {
  ownerId: string;
  ucc?: string;
  statementType: 'mutual_fund' | 'stock';
  statementDate?: string;
  statementTimestamp: number;
}

export interface ParsedStatement extends StatementMetadata {
  holdings: Holding[];
}

export function extractStatementMetadata(
  fileBuffer: Buffer | ArrayBuffer,
  filename: string
): StatementMetadata {
  const isMF = filename.toLowerCase().includes("mutual_fund") || filename.toLowerCase().includes("mf");
  const statementType: 'mutual_fund' | 'stock' = isMF ? 'mutual_fund' : 'stock';

  // Extract UCC from filename (e.g. Stocks_Holdings_Statement_9020149214_... or Mutual_Funds_9020149214_...)
  const uccMatch = filename.match(/(\d{8,12})/);
  let ucc = uccMatch ? uccMatch[1] : undefined;

  let statementTimestamp = 0;
  let statementDate: string | undefined = undefined;

  // Extract dates from filename (e.g. 29-10-2026 or 30-10-2026_30-10-2026)
  const dateMatches = Array.from(filename.matchAll(/(\d{2})[-/](\d{2})[-/](\d{4})/g));
  if (dateMatches.length > 0) {
    const lastMatch = dateMatches[dateMatches.length - 1];
    const [, d, m, y] = lastMatch;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(parsed.getTime())) {
      statementTimestamp = parsed.getTime();
      statementDate = `${y}-${m}-${d}`;
    }
  }

  let ownerId = "Unknown";

  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    if (data && data.length > 0) {
      for (let i = 0; i < Math.min(data.length, 25); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const cell0 = String(row[0] || '').trim();
        if (cell0 === 'Name' && row[1]) {
          ownerId = String(row[1]).trim().replace(/\s+/g, ' ');
        }
        if (cell0 === 'Unique Client Code' && row[1]) {
          ucc = String(row[1]).trim();
        }

        const joined = row.map(c => String(c || '')).join(' ');
        const contentDateMatch = joined.match(/as on (\d{2})[-/](\d{2})[-/](\d{4})/i);
        if (contentDateMatch) {
          const [, d, m, y] = contentDateMatch;
          const parsed = new Date(Number(y), Number(m) - 1, Number(d));
          if (!isNaN(parsed.getTime())) {
            statementTimestamp = parsed.getTime();
            statementDate = `${y}-${m}-${d}`;
          }
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return {
    ownerId,
    ucc,
    statementType,
    statementDate,
    statementTimestamp,
  };
}

export function isSameStatementGroup(
  a: { ownerId?: string; ucc?: string; statementType?: string },
  b: { ownerId?: string; ucc?: string; statementType?: string }
): boolean {
  if (a.statementType && b.statementType && a.statementType !== b.statementType) return false;
  if (a.ucc && b.ucc && a.ucc === b.ucc) return true;
  if (a.ownerId && b.ownerId) {
    return a.ownerId.trim().toLowerCase() === b.ownerId.trim().toLowerCase();
  }
  return false;
}

export function parseExcelStatement(fileBuffer: Buffer, filename: string): ParsedStatement | null {
  const meta = extractStatementMetadata(fileBuffer, filename);
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  if (!data || data.length === 0) return null;

  const ownerId = meta.ownerId;
  const isMF = meta.statementType === 'mutual_fund';
  const holdings: Holding[] = [];

  let headerRowIdx = -1;
  let headers: string[] = [];

  // Find the header row
  for (let i = 0; i < data.length; i++) {
    if (!data[i] || data[i].length === 0) continue;
    const firstCell = String(data[i][0]).trim();
    if (firstCell === "Scheme Name" || firstCell === "Stock Name") {
      headerRowIdx = i;
      headers = data[i].map(h => String(h).trim());
      break;
    }
  }

  if (headerRowIdx === -1) return null;

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const getVal = (headerName: string) => {
      const idx = headers.indexOf(headerName);
      return idx !== -1 ? row[idx] : undefined;
    };

    const name = getVal("Scheme Name") || getVal("Stock Name");
    if (!name) continue; // End of list or empty row

    let investedValue = 0;
    let currentValue = 0;
    let absoluteReturn = 0;
    let returnPercentage = 0;

    if (isMF) {
      investedValue = parseNumber(getVal("Invested Value"));
      currentValue = parseNumber(getVal("Current Value"));
      absoluteReturn = parseNumber(getVal("Returns"));
      returnPercentage = investedValue > 0 ? (absoluteReturn / investedValue) * 100 : 0;
    } else {
      investedValue = parseNumber(getVal("Buy value"));
      currentValue = parseNumber(getVal("Closing value"));
      absoluteReturn = parseNumber(getVal("Unrealised P&L"));
      returnPercentage = investedValue > 0 ? (absoluteReturn / investedValue) * 100 : 0;
    }

    const category = getVal("Category") ? String(getVal("Category")) : undefined;
    const subCategory = getVal("Sub-category") ? String(getVal("Sub-category")) : undefined;
    const assetType = inferAssetType(String(name), isMF);

    const classification = classifyHolding({
      name: String(name),
      category,
      subCategory,
      assetType
    });

    const holding: Holding = {
      id: uuidv4(),
      ownerId,
      name: String(name),
      assetType,
      quantity: parseNumber(getVal("Quantity") || getVal("Units")),
      averagePrice: parseNumber(getVal("Average buy price")),
      marketPrice: parseNumber(getVal("Closing price")),
      investedValue,
      currentValue,
      absoluteReturn,
      returnPercentage,
      xirr: isMF ? parseNumber(getVal("XIRR")) : undefined,
      isin: getVal("ISIN") ? String(getVal("ISIN")) : undefined,
      amc: getVal("AMC") ? String(getVal("AMC")) : undefined,
      category,
      subCategory,
      strategicAssetClass: classification.strategicAssetClass,
      productType: classification.productType,
      rawData: row,
    };

    holdings.push(holding);
  }

  return {
    ownerId,
    ucc: meta.ucc,
    statementType: meta.statementType,
    statementDate: meta.statementDate,
    statementTimestamp: meta.statementTimestamp,
    holdings,
  };
}

export function combinePortfolios(
  parsedFiles: (ParsedStatement | { ownerId: string; holdings: Holding[] })[]
): PortfolioData {
  const peopleMap = new Map<string, Person>();

  // Deduplicate statements by (statementType, ucc || ownerId), keeping only the newest
  const newestStatementMap = new Map<string, ParsedStatement | { ownerId: string; holdings: Holding[] }>();

  for (const file of parsedFiles) {
    const parsed = file as Partial<ParsedStatement>;
    const type = parsed.statementType || (parsed.holdings?.[0]?.assetType === 'mutual_fund' ? 'mutual_fund' : 'stock');
    const ownerKey = (parsed.ucc || parsed.ownerId || 'unknown').trim().toLowerCase();
    const groupKey = `${type}:${ownerKey}`;

    const existing = newestStatementMap.get(groupKey);
    if (!existing) {
      newestStatementMap.set(groupKey, file);
    } else {
      const existingParsed = existing as Partial<ParsedStatement>;
      const existingTs = existingParsed.statementTimestamp || 0;
      const currentTs = parsed.statementTimestamp || 0;

      // Keep the newer one (or the later one in the list if equal)
      if (currentTs >= existingTs) {
        newestStatementMap.set(groupKey, file);
      }
    }
  }

  const holdings: Holding[] = [];
  for (const file of newestStatementMap.values()) {
    if (!peopleMap.has(file.ownerId)) {
      peopleMap.set(file.ownerId, { id: file.ownerId, name: file.ownerId });
    }
    holdings.push(...file.holdings);
  }

  return {
    people: Array.from(peopleMap.values()),
    holdings,
  };
}

export function normalizeCustomAssetCategory(raw: string): CustomAssetCategory {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('saving') || lower.includes('bank account') || lower.includes('checking')) return 'Savings Account';
  if (lower.includes('fd') || lower.includes('fixed deposit') || lower.includes('term deposit') || lower.includes('rd')) return 'FD';
  if (lower.includes('ppf') || lower.includes('public provident')) return 'PPF';
  if (lower.includes('epf') || lower.includes('pf') || lower.includes('provident')) return 'EPF';
  if (lower.includes('nps') || lower.includes('pension')) return 'NPS';
  return 'Other';
}

export function parseCustomAssetsExcel(fileBuffer: Buffer | ArrayBuffer): { ownerId?: string; assets: CustomAsset[] } | null {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    if (!workbook || workbook.SheetNames.length === 0) return null;

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    if (!data || data.length === 0) return null;

    // Search top 15 rows for header row
    let headerRowIdx = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(data.length, 15); i++) {
      if (!data[i] || data[i].length === 0) continue;
      const rowStr = data[i].map(c => String(c || '').toLowerCase().trim());
      const hasCategory = rowStr.some(c => c.includes('category') || c.includes('asset type') || c.includes('type'));
      const hasInst = rowStr.some(c => c.includes('institution') || c.includes('bank') || c.includes('name') || c.includes('asset'));
      const hasValue = rowStr.some(c => c.includes('value') || c.includes('amount') || c.includes('balance') || c.includes('deposit'));
      if (hasCategory && (hasInst || hasValue)) {
        headerRowIdx = i;
        headers = rowStr;
        break;
      }
    }

    if (headerRowIdx === -1) return null;

    const assets: CustomAsset[] = [];
    const getHeaderIdx = (patterns: string[]) => {
      return headers.findIndex(h => patterns.some(p => h.includes(p)));
    };

    const catIdx = getHeaderIdx(['category', 'asset type', 'type']);
    const instIdx = getHeaderIdx(['institution', 'bank', 'provider', 'name', 'asset']);
    const accIdx = getHeaderIdx(['account', 'acc number', 'folio', 'fd number', 'number']);
    const currValIdx = getHeaderIdx(['current value', 'balance', 'amount', 'value']);
    const invValIdx = getHeaderIdx(['invested value', 'deposit amount', 'invested']);
    const rateIdx = getHeaderIdx(['interest', 'rate', 'roi']);
    const matIdx = getHeaderIdx(['maturity date', 'maturity', 'due date']);
    const ownerIdx = getHeaderIdx(['owner', 'holder', 'person', 'member']);
    const minBalIdx = getHeaderIdx(['min balance', 'minimum balance']);
    const notesIdx = getHeaderIdx(['notes', 'remark', 'description']);

    let commonOwner = "Self";

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const rawInst = instIdx !== -1 && row[instIdx] ? String(row[instIdx]).trim() : '';
      const rawVal = currValIdx !== -1 ? parseNumber(row[currValIdx]) : (invValIdx !== -1 ? parseNumber(row[invValIdx]) : 0);
      if (!rawInst && rawVal === 0) continue;

      const rawCat = catIdx !== -1 && row[catIdx] ? String(row[catIdx]) : 'Other';
      const invVal = invValIdx !== -1 && row[invValIdx] ? parseNumber(row[invValIdx]) : rawVal;
      const rawRate = rateIdx !== -1 && row[rateIdx] ? parseNumber(row[rateIdx]) : undefined;
      const rawMat = matIdx !== -1 && row[matIdx] ? String(row[matIdx]).trim() : undefined;
      const rawAcc = accIdx !== -1 && row[accIdx] ? String(row[accIdx]).trim() : undefined;
      const rawOwner = ownerIdx !== -1 && row[ownerIdx] ? String(row[ownerIdx]).trim() : commonOwner;
      const rawMinBal = minBalIdx !== -1 && row[minBalIdx] ? parseNumber(row[minBalIdx]) : undefined;
      const rawNotes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : undefined;

      if (rawOwner && rawOwner !== "Self") {
        commonOwner = rawOwner;
      }

      assets.push({
        id: uuidv4(),
        ownerId: rawOwner || 'Self',
        category: normalizeCustomAssetCategory(rawCat),
        institution: rawInst || 'Bank / Asset',
        accountNumber: rawAcc,
        investedValue: invVal,
        currentValue: rawVal,
        interestRate: rawRate,
        maturityDate: rawMat,
        minimumBalance: rawMinBal,
        notes: rawNotes,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }

    return assets.length > 0 ? { ownerId: commonOwner, assets } : null;
  } catch (e) {
    console.error("Failed to parse custom assets excel", e);
    return null;
  }
}

export function generateBankFDTemplateWorkbook(): Uint8Array {
  const wb = xlsx.utils.book_new();
  const sampleData = [
    {
      "Category": "Savings Account",
      "Institution": "HDFC Bank",
      "Account Number": "501002345678",
      "Current Value": 150000,
      "Invested Value": 150000,
      "Interest Rate (%)": 3.0,
      "Maturity Date": "Indefinite",
      "Minimum Balance": 25000,
      "Owner": "Self",
      "Notes": "Primary salary & emergency account"
    },
    {
      "Category": "FD",
      "Institution": "State Bank of India (SBI)",
      "Account Number": "FD-3829104",
      "Current Value": 500000,
      "Invested Value": 500000,
      "Interest Rate (%)": 7.1,
      "Maturity Date": "2027-12-15",
      "Minimum Balance": 0,
      "Owner": "Self",
      "Notes": "3 Year Cumulative Term Deposit"
    },
    {
      "Category": "PPF",
      "Institution": "Post Office / SBI",
      "Account Number": "PPF-9081234",
      "Current Value": 320000,
      "Invested Value": 280000,
      "Interest Rate (%)": 7.1,
      "Maturity Date": "2032-03-31",
      "Minimum Balance": 500,
      "Owner": "Self",
      "Notes": "15-year 80C tax saving lock-in"
    },
    {
      "Category": "NPS",
      "Institution": "HDFC Pension (NSDL)",
      "Account Number": "PRAN-110029384",
      "Current Value": 450000,
      "Invested Value": 380000,
      "Interest Rate (%)": 10.5,
      "Maturity Date": "Indefinite",
      "Minimum Balance": 1000,
      "Owner": "Self",
      "Notes": "Tier 1 Pension Account"
    }
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, "Bank_and_FDs");
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
}

