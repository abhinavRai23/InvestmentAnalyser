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

export function parseExcelStatement(fileBuffer: Buffer, filename: string): { ownerId: string; holdings: Holding[] } | null {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  if (!data || data.length === 0) return null;

  let ownerId = "Unknown";
  // Find owner name. E.g. ["Name", "Abhinav Rai"]
  for (let i = 0; i < 20; i++) {
    if (data[i] && String(data[i][0]).trim() === "Name" && data[i][1]) {
      ownerId = String(data[i][1]).trim().replace(/\s+/g, ' '); // normalize spaces
      break;
    }
  }

  // Detect type by filename
  const isMF = filename.toLowerCase().includes("mutual_fund") || filename.toLowerCase().includes("mf");
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

  return { ownerId, holdings };
}

export function combinePortfolios(parsedFiles: { ownerId: string; holdings: Holding[] }[]): PortfolioData {
  const peopleMap = new Map<string, Person>();
  const holdings: Holding[] = [];

  for (const file of parsedFiles) {
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

