import { create } from 'zustand';
import { PortfolioData, AssetType, Holding, OwnerBreakdownItem, Person, CustomAsset } from '@/lib/types';
import { filterHoldings, calculateMetrics } from '@/lib/engine';
import { StrategicAssetClass, ProductType } from '@/lib/taxonomy';
import { v4 as uuidv4 } from 'uuid';

interface PortfolioState {
  data: PortfolioData | null;
  filters: {
    selectedOwnerIds: string[];
    ownerId: string | 'ALL';
    assetType: AssetType | 'ALL';
  };
  livePrices: Record<string, { price: number; date: string }>;
  isSyncing: boolean;
  lastSynced: string | null;
  setData: (data: PortfolioData) => void;
  clearPortfolio: () => void;
  exportPortfolioBackup: () => void;
  loadDemoPortfolio: () => void;
  removePerson: (personId: string) => void;
  setFilter: (key: 'selectedOwnerIds' | 'ownerId' | 'assetType', value: any) => void;
  resetFilters: () => void;
  syncLivePrices: () => Promise<void>;

  // Custom Assets actions
  addCustomAsset: (asset: Omit<CustomAsset, 'id'>) => Promise<void>;
  updateCustomAsset: (asset: CustomAsset) => Promise<void>;
  deleteCustomAsset: (id: string) => Promise<void>;
  setCustomAssets: (assets: CustomAsset[]) => Promise<void>;
}

const STORAGE_KEY = 'investment_analyser_portfolio';

function persistPortfolio(data: PortfolioData | null) {
  if (typeof window === 'undefined') return;
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to persist portfolio to localStorage', e);
  }
}

export function loadStoredPortfolio(): PortfolioData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load portfolio from localStorage', e);
  }
  return null;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  data: null,
  filters: {
    selectedOwnerIds: ['ALL'],
    ownerId: 'ALL',
    assetType: 'ALL',
  },
  livePrices: {},
  isSyncing: false,
  lastSynced: null,
  setData: (data) => {
    set({ data });
    persistPortfolio(data);
  },
  clearPortfolio: () => {
    set({ data: null, filters: { selectedOwnerIds: ['ALL'], ownerId: 'ALL', assetType: 'ALL' } });
    persistPortfolio(null);
  },
  exportPortfolioBackup: () => {
    const current = get().data;
    if (!current) return;
    const backupObj = {
      app: "InvestmentAnalyser",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      portfolio: current
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Portfolio_Backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  removePerson: (personId: string) => {
    const current = get().data;
    if (!current) return;
    const remainingPeople = current.people.filter(p => p.id !== personId && p.name !== personId);
    const remainingHoldings = current.holdings.filter(h => h.ownerId !== personId);
    const remainingCustom = (current.customAssets || []).filter(ca => ca.ownerId !== personId);

    if (remainingPeople.length === 0 || (remainingHoldings.length === 0 && remainingCustom.length === 0)) {
      get().clearPortfolio();
      return;
    }

    const updated: PortfolioData = {
      ...current,
      people: remainingPeople,
      holdings: remainingHoldings,
      customAssets: remainingCustom
    };
    get().setData(updated);
  },
  loadDemoPortfolio: () => {
    const demoData: PortfolioData = {
      people: [
        { id: "Person A", name: "Person A" },
        { id: "Person B", name: "Person B" }
      ],
      holdings: [
        // --- Person A Holdings ---
        {
          id: "demo-a-h1",
          ownerId: "Person A",
          name: "Parag Parikh Flexi Cap Fund Direct Growth",
          assetType: "mutual_fund",
          investedValue: 250000,
          currentValue: 325000,
          absoluteReturn: 75000,
          returnPercentage: 30.0,
          xirr: 21.4,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "MF_ACTIVE" as ProductType,
          category: "Equity: Flexi Cap",
          subCategory: "Flexi Cap Fund",
          amc: "PPFAS Mutual Fund",
          isin: "INF879O01019"
        },
        {
          id: "demo-a-h2",
          ownerId: "Person A",
          name: "Mirae Asset Large Cap Fund Direct Growth",
          assetType: "mutual_fund",
          investedValue: 200000,
          currentValue: 242000,
          absoluteReturn: 42000,
          returnPercentage: 21.0,
          xirr: 16.8,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "MF_ACTIVE" as ProductType,
          category: "Equity: Large Cap",
          subCategory: "Large Cap Fund",
          amc: "Mirae Asset Mutual Fund",
          isin: "INF769I01010"
        },
        {
          id: "demo-a-h3",
          ownerId: "Person A",
          name: "HDFC Bank Ltd.",
          assetType: "stock",
          quantity: 80,
          averagePrice: 1500,
          marketPrice: 1720,
          investedValue: 120000,
          currentValue: 137600,
          absoluteReturn: 17600,
          returnPercentage: 14.67,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "STOCK_DIRECT" as ProductType,
          category: "Banking",
          isin: "INE040A01034"
        },
        {
          id: "demo-a-h4",
          ownerId: "Person A",
          name: "Reliance Industries Ltd.",
          assetType: "stock",
          quantity: 50,
          averagePrice: 2400,
          marketPrice: 2750,
          investedValue: 120000,
          currentValue: 137500,
          absoluteReturn: 17500,
          returnPercentage: 14.58,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "STOCK_DIRECT" as ProductType,
          category: "Energy",
          isin: "INE002A01018"
        },

        // --- Person B Holdings ---
        {
          id: "demo-b-h1",
          ownerId: "Person B",
          name: "Motilal Oswal Midcap Fund Direct Growth",
          assetType: "mutual_fund",
          investedValue: 150000,
          currentValue: 198000,
          absoluteReturn: 48000,
          returnPercentage: 32.0,
          xirr: 24.2,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "MF_ACTIVE" as ProductType,
          category: "Equity: Mid Cap",
          subCategory: "Mid Cap Fund",
          amc: "Motilal Oswal Mutual Fund",
          isin: "INF247L01015"
        },
        {
          id: "demo-b-h2",
          ownerId: "Person B",
          name: "Nippon India Small Cap Fund Direct Growth",
          assetType: "mutual_fund",
          investedValue: 120000,
          currentValue: 162000,
          absoluteReturn: 42000,
          returnPercentage: 35.0,
          xirr: 28.5,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "MF_ACTIVE" as ProductType,
          category: "Equity: Small Cap",
          subCategory: "Small Cap Fund",
          amc: "Nippon India Mutual Fund",
          isin: "INF204K01012"
        },
        {
          id: "demo-b-h3",
          ownerId: "Person B",
          name: "Tata Consultancy Services Ltd.",
          assetType: "stock",
          quantity: 30,
          averagePrice: 3500,
          marketPrice: 4100,
          investedValue: 105000,
          currentValue: 123000,
          absoluteReturn: 18000,
          returnPercentage: 17.14,
          strategicAssetClass: "EQUITY" as StrategicAssetClass,
          productType: "STOCK_DIRECT" as ProductType,
          category: "IT",
          isin: "INE467B01029"
        },
        {
          id: "demo-b-h4",
          ownerId: "Person B",
          name: "Nippon India ETF Gold BeES",
          assetType: "gold",
          quantity: 1500,
          averagePrice: 55,
          marketPrice: 72,
          investedValue: 82500,
          currentValue: 108000,
          absoluteReturn: 25500,
          returnPercentage: 30.9,
          strategicAssetClass: "COMMODITY" as StrategicAssetClass,
          productType: "GOLD_ETF" as ProductType,
          category: "Commodity",
          isin: "INF204KB17I5"
        }
      ],
      customAssets: [
        {
          id: "demo-a-ca1",
          ownerId: "Person A",
          category: "Savings Account",
          institution: "HDFC Bank",
          accountNumber: "501002345678",
          investedValue: 150000,
          currentValue: 150000,
          interestRate: 3.0,
          notes: "Primary salary and liquid emergency buffer"
        },
        {
          id: "demo-a-ca2",
          ownerId: "Person A",
          category: "FD",
          institution: "State Bank of India (SBI)",
          accountNumber: "FD-3829104",
          investedValue: 500000,
          currentValue: 500000,
          interestRate: 7.1,
          maturityDate: "2027-12-15",
          notes: "3-Year Fixed Deposit"
        },
        {
          id: "demo-b-ca1",
          ownerId: "Person B",
          category: "PPF",
          institution: "Post Office",
          accountNumber: "PPF-9081234",
          investedValue: 280000,
          currentValue: 320000,
          interestRate: 7.1,
          maturityDate: "2032-03-31",
          notes: "Tax saving 80C compound fund"
        },
        {
          id: "demo-b-ca2",
          ownerId: "Person B",
          category: "NPS",
          institution: "HDFC Pension (NSDL)",
          accountNumber: "PRAN-110029384",
          investedValue: 380000,
          currentValue: 450000,
          interestRate: 10.5,
          maturityDate: "Indefinite",
          notes: "Tier-1 All-Equity & Corporate debt"
        }
      ]
    };

    set({ data: demoData, filters: { selectedOwnerIds: ['ALL'], ownerId: 'ALL', assetType: 'ALL' } });
    persistPortfolio(demoData);
  },
  setFilter: (key, value) => set((state) => {
    if (key === 'selectedOwnerIds') {
      const ids: string[] = Array.isArray(value) ? value : [value];
      const isAll = ids.includes('ALL') || ids.length === 0;
      const ownerId = isAll ? 'ALL' : (ids.length === 1 ? ids[0] : 'ALL');
      return {
        filters: { ...state.filters, selectedOwnerIds: ids, ownerId }
      };
    }
    if (key === 'ownerId') {
      const val = value as string;
      return {
        filters: {
          ...state.filters,
          ownerId: val,
          selectedOwnerIds: val === 'ALL' ? ['ALL'] : [val]
        }
      };
    }
    return {
      filters: { ...state.filters, [key]: value }
    };
  }),
  resetFilters: () => set({ filters: { selectedOwnerIds: ['ALL'], ownerId: 'ALL', assetType: 'ALL' } }),
  syncLivePrices: async () => {
    const data = get().data;
    if (!data) return;

    set({ isSyncing: true });
    
    // Extract unique assets to fetch
    const assetsToFetch = data.holdings
      .filter(h => h.assetType === 'mutual_fund' || h.assetType === 'stock' || h.assetType === 'etf')
      .map(h => ({ id: h.id, name: h.name, type: h.assetType }));

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: assetsToFetch })
      });

      if (res.ok) {
        const { enrichedData } = await res.json();
        set((state) => ({ 
          livePrices: { ...state.livePrices, ...enrichedData },
          lastSynced: new Date().toISOString()
        }));
      }
    } catch (e) {
      console.error("Failed to sync live prices", e);
    } finally {
      set({ isSyncing: false });
    }
  },

  addCustomAsset: async (asset) => {
    const newAsset: CustomAsset = { ...asset, id: uuidv4() };
    const current = get().data;
    if (!current) return;
    const updatedAssets = [...(current.customAssets || []), newAsset];
    const updatedData = { ...current, customAssets: updatedAssets };
    set({ data: updatedData });
    persistPortfolio(updatedData);

    try {
      await fetch('/api/custom-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAssets: updatedAssets })
      });
    } catch (e) {
      console.error('Failed to sync custom assets to server', e);
    }
  },

  updateCustomAsset: async (asset) => {
    const current = get().data;
    if (!current) return;
    const updatedAssets = (current.customAssets || []).map(a => a.id === asset.id ? asset : a);
    const updatedData = { ...current, customAssets: updatedAssets };
    set({ data: updatedData });
    persistPortfolio(updatedData);

    try {
      await fetch('/api/custom-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAssets: updatedAssets })
      });
    } catch (e) {
      console.error('Failed to sync custom assets to server', e);
    }
  },

  deleteCustomAsset: async (id) => {
    const current = get().data;
    if (!current) return;
    const updatedAssets = (current.customAssets || []).filter(a => a.id !== id);
    const updatedData = { ...current, customAssets: updatedAssets };
    set({ data: updatedData });
    persistPortfolio(updatedData);

    try {
      await fetch('/api/custom-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAssets: updatedAssets })
      });
    } catch (e) {
      console.error('Failed to sync custom assets to server', e);
    }
  },

  setCustomAssets: async (assets) => {
    const current = get().data;
    if (!current) return;
    const updatedData = { ...current, customAssets: assets };
    set({ data: updatedData });
    persistPortfolio(updatedData);

    try {
      await fetch('/api/custom-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAssets: assets })
      });
    } catch (e) {
      console.error('Failed to sync custom assets to server', e);
    }
  }
}));

function convertCustomAssetToHolding(ca: CustomAsset, people: Person[]): Holding {
  const personName = people.find(p => p.id === ca.ownerId)?.name || ca.ownerId;
  const assetType: AssetType = ca.category === 'PPF' || ca.category === 'NPS' ? 'pf' : 'debt';
  
  let strategicAssetClass: StrategicAssetClass = 'Other';
  let productType: ProductType = 'Other';

  if (ca.category === 'FD') {
    strategicAssetClass = 'Fixed Deposits';
    productType = 'Fixed Deposits (FD)';
  } else if (ca.category === 'Savings Account') {
    strategicAssetClass = 'Savings & Cash';
    productType = 'Savings Accounts';
  } else if (ca.category === 'NPS') {
    strategicAssetClass = 'Provident & Pension Funds';
    productType = 'NPS (National Pension)';
  } else if (ca.category === 'PPF' || ca.category === 'EPF') {
    strategicAssetClass = 'Provident & Pension Funds';
    productType = ca.category === 'EPF' ? 'EPF (Employee Provident)' : 'PPF (Public Provident)';
  }

  const absReturn = ca.currentValue - ca.investedValue;
  const retPct = ca.investedValue > 0 ? (absReturn / ca.investedValue) * 100 : 0;
  const displayName = `${ca.institution} ${ca.category}${ca.accountNumber ? ` (${ca.accountNumber})` : ''}`;

  return {
    id: `custom-${ca.id}`,
    ownerId: ca.ownerId,
    name: displayName,
    assetType,
    investedValue: ca.investedValue,
    currentValue: ca.currentValue,
    absoluteReturn: absReturn,
    returnPercentage: retPct,
    category: ca.category,
    subCategory: ca.institution,
    strategicAssetClass,
    productType,
    owners: [
      {
        ownerId: ca.ownerId,
        ownerName: personName,
        investedValue: ca.investedValue,
        currentValue: ca.currentValue,
        percentage: 100
      }
    ],
    rawData: ca
  };
}

/**
 * Aggregates holdings that belong to the same security (identified by ISIN, then name).
 * Used when "Entire Family" or multiple members are selected so the same stock/MF/ETF owned by multiple
 * members appears as ONE consolidated holding.
 */
function aggregateHoldings(holdings: Holding[], people: Person[] = []): Holding[] {
  const peopleMap = new Map(people.map((p) => [p.id, p.name]));
  const buckets = new Map<string, Holding[]>();

  for (const h of holdings) {
    const key = h.isin?.trim() || h.name.trim().toLowerCase();
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(h);
    } else {
      buckets.set(key, [h]);
    }
  }

  const result: Holding[] = [];

  for (const [, group] of buckets) {
    if (group.length === 1) {
      const single = group[0];
      const ownerName = peopleMap.get(single.ownerId) || single.ownerId;
      result.push({
        ...single,
        owners: [
          {
            ownerId: single.ownerId,
            ownerName,
            investedValue: single.investedValue,
            currentValue: single.currentValue,
            quantity: single.quantity,
            percentage: 100,
          },
        ],
      });
      continue;
    }

    const base = group[0];
    const totalInvested   = group.reduce((s, h) => s + h.investedValue, 0);
    const totalCurrent    = group.reduce((s, h) => s + h.currentValue, 0);
    const totalAbsolute   = group.reduce((s, h) => s + h.absoluteReturn, 0);
    const totalQty        = group.reduce((s, h) => s + (h.quantity ?? 0), 0);
    const returnPct       = totalInvested > 0 ? (totalAbsolute / totalInvested) * 100 : 0;
    const xirr            = group.find(h => h.xirr && h.xirr !== 0)?.xirr;

    const distinctOwners  = new Set(group.map(h => h.ownerId));
    const ownerId         = distinctOwners.size === 1 ? base.ownerId : 'ALL';

    const ownerMap = new Map<string, OwnerBreakdownItem>();

    for (const h of group) {
      const ownerName = peopleMap.get(h.ownerId) || h.ownerId;
      const existing = ownerMap.get(h.ownerId);

      if (existing) {
        existing.investedValue += h.investedValue;
        existing.currentValue += h.currentValue;
        if (h.quantity) {
          existing.quantity = (existing.quantity || 0) + h.quantity;
        }
      } else {
        ownerMap.set(h.ownerId, {
          ownerId: h.ownerId,
          ownerName,
          investedValue: h.investedValue,
          currentValue: h.currentValue,
          quantity: h.quantity,
          percentage: 0,
        });
      }
    }

    const ownersBreakdown: OwnerBreakdownItem[] = Array.from(ownerMap.values())
      .map((item) => ({
        ...item,
        percentage: totalCurrent > 0 ? (item.currentValue / totalCurrent) * 100 : 0,
      }))
      .sort((a, b) => b.currentValue - a.currentValue);

    result.push({
      ...base,
      id: `agg-${base.isin || base.name}-${ownerId}`,
      ownerId,
      investedValue:   totalInvested,
      currentValue:    totalCurrent,
      absoluteReturn:  totalAbsolute,
      returnPercentage: returnPct,
      quantity: totalQty > 0 ? totalQty : undefined,
      xirr,
      owners: ownersBreakdown,
    });
  }

  return result;
}

export const useFilteredHoldings = () => {
  const { data, filters, livePrices } = usePortfolioStore();
  
  if (!data) return [];

  const synthesizedCustomHoldings = (data.customAssets || []).map(ca => convertCustomAssetToHolding(ca, data.people));
  const allHoldings = [...data.holdings, ...synthesizedCustomHoldings];
  
  const selectedOwnerIds = filters.selectedOwnerIds || (filters.ownerId === 'ALL' ? ['ALL'] : [filters.ownerId]);
  const isAllSelected = selectedOwnerIds.includes('ALL') ||
                        selectedOwnerIds.length === 0 ||
                        (data.people.length > 0 && selectedOwnerIds.length === data.people.length);

  const ownerIds = isAllSelected ? undefined : selectedOwnerIds;

  let assetTypes: AssetType[] | undefined = undefined;
  if (filters.assetType === 'stock') {
    assetTypes = ['stock', 'etf'];
  } else if (filters.assetType === 'gold') {
    assetTypes = ['gold', 'sgb'];
  } else if (filters.assetType === 'silver') {
    assetTypes = ['silver'];
  } else if (filters.assetType === 'etf') {
    assetTypes = ['etf'];
  } else if (filters.assetType !== 'ALL') {
    assetTypes = [filters.assetType as AssetType];
  }

  const filtered = filterHoldings(allHoldings, {
    ownerIds,
    assetTypes
  });

  // ── Holding Aggregation ───────────────────────────────────────────────────────
  // Merge duplicate holdings into one row per security.
  const deduplicated = aggregateHoldings(filtered, data.people);

  return deduplicated.map(h => {
    const live = livePrices[h.id];
    if (live) {
      const qty = h.quantity ?? (h.marketPrice ? h.currentValue / h.marketPrice : 0);
      const newCurrentValue = live.price * qty;
      return {
        ...h,
        marketPrice: live.price,
        currentValue: newCurrentValue,
        absoluteReturn: newCurrentValue - h.investedValue,
        returnPercentage: h.investedValue > 0 ? ((newCurrentValue - h.investedValue) / h.investedValue) * 100 : 0
      };
    }
    return h;
  });
};

export const usePortfolioMetrics = () => {
  const holdings = useFilteredHoldings();
  return calculateMetrics(holdings);
};




