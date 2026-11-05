import { describe, it, expect } from "vitest";
import { 
  filterHoldings, 
  calculateMetrics, 
  getAllocationByAssetType, 
  getAllocationByPerson,
  calculatePortfolioPeriodReturns,
} from "./engine";
import { Holding } from "./types";

const mockHoldings: Holding[] = [
  {
    id: "Abhinav-MF-0", ownerId: "Abhinav", name: "Fund A", assetType: "mutual_fund",
    investedValue: 1000, currentValue: 1200, absoluteReturn: 200, returnPercentage: 20
  },
  {
    id: "Abhinav-Stocks-0", ownerId: "Abhinav", name: "Stock A", assetType: "stock",
    investedValue: 500, currentValue: 400, absoluteReturn: -100, returnPercentage: -20
  },
  {
    id: "Mamta-MF-0", ownerId: "Mamta", name: "Fund B", assetType: "mutual_fund",
    investedValue: 2000, currentValue: 2500, absoluteReturn: 500, returnPercentage: 25
  },
];

describe("engine", () => {
  it("filters holdings correctly", () => {
    let filtered = filterHoldings(mockHoldings, { ownerIds: ["Abhinav"] });
    expect(filtered.length).toBe(2);

    filtered = filterHoldings(mockHoldings, { assetTypes: ["mutual_fund"] });
    expect(filtered.length).toBe(2);

    filtered = filterHoldings(mockHoldings, { ownerIds: ["Abhinav"], assetTypes: ["mutual_fund"] });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("Abhinav-MF-0");
  });

  it("calculates metrics correctly", () => {
    const metrics = calculateMetrics(mockHoldings);
    expect(metrics.investedValue).toBe(3500);
    expect(metrics.currentValue).toBe(4100);
    expect(metrics.absoluteReturn).toBe(600);
    expect(metrics.returnPercentage).toBeCloseTo((600 / 3500) * 100);
    expect(metrics.numberOfHoldings).toBe(3);
  });

  it("calculates allocation by asset type correctly", () => {
    const alloc = getAllocationByAssetType(mockHoldings);
    
    // MF = 2000 + 1700 = 3700
    // Stock = 400
    const mfAlloc = alloc.find(a => a.name === "Mutual Funds");
    expect(mfAlloc?.value).toBe(3700);

    const stockAlloc = alloc.find(a => a.name === "Stocks");
    expect(stockAlloc?.value).toBe(400);
  });

  it("calculates allocation by person correctly", () => {
    const alloc = getAllocationByPerson(mockHoldings, []);
    
    const mamtaAlloc = alloc.find(a => a.name === "Mamta");
    expect(mamtaAlloc?.value).toBe(2500);
    
    const abhinavAlloc = alloc.find(a => a.name === "Abhinav");
    expect(abhinavAlloc?.value).toBe(1600);
  });

  it("calculates allocation by person correctly with aggregated owners breakdown", () => {
    const aggregatedHolding: Holding = {
      id: "agg-fund-a-ALL",
      ownerId: "ALL",
      name: "Fund A",
      assetType: "mutual_fund",
      investedValue: 3000,
      currentValue: 3600,
      absoluteReturn: 600,
      returnPercentage: 20,
      owners: [
        { ownerId: "Abhinav", ownerName: "Abhinav", investedValue: 1000, currentValue: 1200, percentage: 33.33 },
        { ownerId: "Mamta", ownerName: "Mamta", investedValue: 2000, currentValue: 2400, percentage: 66.67 },
      ],
    };

    const alloc = getAllocationByPerson([aggregatedHolding], [
      { id: "Abhinav", name: "Abhinav" },
      { id: "Mamta", name: "Mamta" },
    ]);

    expect(alloc.find(a => a.name === "Abhinav")?.value).toBe(1200);
    expect(alloc.find(a => a.name === "Mamta")?.value).toBe(2400);
  });

  it("guards against extreme NAV discrepancies from scheme mismatches", () => {
    // Simulated holding with base NAV = 61.38 (invested 62996.87, current 66703.55, units 1086.685)
    const baseNav = 66703.55 / 1086.685;
    const corruptedNav = 4855.0498; // 79x distortion from ultra short term mismatch
    const ratio = corruptedNav / baseNav;

    // Sanity check formula used in portfolioStore and MutualFundAnalyzer
    const isSensible = ratio <= 2.5 && ratio >= 0.4;
    expect(isSensible).toBe(false);

    // Realistic NAV change within normal range
    const validNav = 61.5405;
    const validRatio = validNav / baseNav;
    const isValidSensible = validRatio <= 2.5 && validRatio >= 0.4;
    expect(isValidSensible).toBe(true);
  });

  it("calculates 1Y period returns correctly and sanitizes 100x corrupted values", () => {
    const holdings: Holding[] = [
      {
        id: "stock-1",
        ownerId: "Abhinav",
        name: "TCS",
        assetType: "stock",
        investedValue: 100000,
        currentValue: 100000,
        absoluteReturn: 0,
        returnPercentage: 0,
        _liveReturn1y: -16.42,
      } as Holding & { _liveReturn1y: number },
      {
        id: "stock-2",
        ownerId: "Abhinav",
        name: "Gold ETF",
        assetType: "etf",
        investedValue: 100000,
        currentValue: 100000,
        absoluteReturn: 0,
        returnPercentage: 0,
        // Legacy corrupted value (100x)
        _liveReturn1y: 1291.58,
      } as Holding & { _liveReturn1y: number },
    ];

    const result = calculatePortfolioPeriodReturns(holdings, {});
    const return1y = result["1Y"];

    expect(return1y).toBeDefined();
    // TCS: -16.42% on 100k => -16,420
    // Gold ETF sanitized: 12.92% on 100k => +12,920
    // Total gain = -3,500 on 200k => -1.75%
    expect(return1y.evaluatedValue).toBe(200000);
    expect(return1y.gain).toBeCloseTo(-3500, 0);
    expect(return1y.percentage).toBeCloseTo(-1.75, 1);
  });
});
