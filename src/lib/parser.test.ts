import { describe, it, expect } from "vitest";
import { parseNumber, inferAssetType, combinePortfolios } from "./parser";
import { Holding } from "./types";

describe("parser utils", () => {
  it("parses numbers correctly", () => {
    expect(parseNumber("1,000.50")).toBe(1000.5);
    expect(parseNumber("+16.00")).toBe(16);
    expect(parseNumber("-1018.30")).toBe(-1018.3);
    expect(parseNumber("125.79%")).toBe(125.79);
    expect(parseNumber("Avg. 4711.00")).toBe(4711);
    expect(parseNumber("10 shares")).toBe(10);
    expect(parseNumber(100)).toBe(100);
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
  });

  it("infers asset types", () => {
    expect(inferAssetType("Parag Parikh Flexi Cap", true)).toBe("mutual_fund");
    expect(inferAssetType("2.50%GOLDBONDS2031SR-I", false)).toBe("sgb");
    expect(inferAssetType("SILVERBEES", false)).toBe("silver");
    expect(inferAssetType("Kotak - MF - Gold ETF", false)).toBe("gold");
    expect(inferAssetType("NIFTYBEES", false)).toBe("etf");
    expect(inferAssetType("Kotak Mahindra Bank", false)).toBe("stock");
  });

  it("combines portfolios", () => {
    const p1 = {
      ownerId: "Abhinav",
      holdings: [{ id: "h1", ownerId: "Abhinav", name: "A", assetType: "stock", investedValue: 1, currentValue: 2, absoluteReturn: 1, returnPercentage: 100 } as Holding]
    };
    const p2 = {
      ownerId: "Abhinav",
      holdings: [{ id: "h2", ownerId: "Abhinav", name: "B", assetType: "mutual_fund", investedValue: 1, currentValue: 2, absoluteReturn: 1, returnPercentage: 100 } as Holding]
    };
    const p3 = {
      ownerId: "Mamta",
      holdings: [{ id: "h3", ownerId: "Mamta", name: "C", assetType: "stock", investedValue: 1, currentValue: 2, absoluteReturn: 1, returnPercentage: 100 } as Holding]
    };

    const combined = combinePortfolios([p1, p2, p3]);
    expect(combined.people.length).toBe(2);
    expect(combined.people.find(p => p.id === "Abhinav")).toBeDefined();
    expect(combined.people.find(p => p.id === "Mamta")).toBeDefined();
    expect(combined.holdings.length).toBe(3);
  });
});
