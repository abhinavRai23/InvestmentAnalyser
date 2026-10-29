import { describe, it, expect } from "vitest";
import { 
  filterHoldings, 
  calculateMetrics, 
  getAllocationByAssetType, 
  getAllocationByPerson 
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
});
