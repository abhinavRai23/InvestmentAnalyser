export interface Person {
  id: string;
  name: string;
}

export type AssetType =
  | "stock"
  | "mutual_fund"
  | "etf"
  | "sgb"
  | "gold"
  | "silver"
  | "debt"
  | "pf"
  | "other";

import { StrategicAssetClass, ProductType } from './taxonomy';

export interface OwnerBreakdownItem {
  ownerId: string;
  ownerName: string;
  investedValue: number;
  currentValue: number;
  quantity?: number;
  percentage: number;
}

export interface Holding {
  id: string;
  ownerId: string;
  name: string;
  assetType: AssetType;
  quantity?: number;
  averagePrice?: number;
  marketPrice?: number;
  investedValue: number;
  currentValue: number;
  absoluteReturn: number;
  returnPercentage: number;
  xirr?: number;
  oneDayReturnAbsolute?: number;
  oneDayReturnPercentage?: number;

  // Excel metadata
  isin?: string;
  amc?: string;
  category?: string;
  subCategory?: string;

  // Taxonomy classifications
  strategicAssetClass?: StrategicAssetClass;
  productType?: ProductType;

  owners?: OwnerBreakdownItem[];
  rawData?: unknown;
}

export type CustomAssetCategory = "FD" | "Savings Account" | "NPS" | "PPF" | "EPF" | "Other";

export interface CustomAsset {
  id: string;
  ownerId: string;
  category: CustomAssetCategory;
  institution: string;
  accountNumber?: string;
  investedValue: number;
  currentValue: number;
  interestRate?: number;
  maturityDate?: string; // Date string (e.g. YYYY-MM-DD) or "Indefinite" / "N/A"
  minimumBalance?: number; // Optional minimum required balance for Savings Accounts
  lastUpdated?: string; // Date string when balance was last modified/updated (e.g. YYYY-MM-DD)
  notes?: string;
}

export interface PortfolioData {
  people: Person[];
  holdings: Holding[];
  customAssets?: CustomAsset[];
  mfHoldings?: Record<string, { stockName: string, sector: string, weight: number, instrumentClass?: string }[]>;
}

