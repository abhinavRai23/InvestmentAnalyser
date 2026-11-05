import { describe, it, expect } from "vitest";
import { 
  parseNumber, 
  inferAssetType, 
  combinePortfolios, 
  isSameStatementGroup,
  ParsedStatement 
} from "./parser";
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

  it("replaces older statements of the same type for the same user with newer dated file", () => {
    const olderStockStmt: ParsedStatement = {
      ownerId: "Abhinav Rai",
      ucc: "9020149214",
      statementType: "stock",
      statementDate: "2026-10-29",
      statementTimestamp: new Date(2026, 9, 29).getTime(),
      holdings: [
        { id: "h1", ownerId: "Abhinav Rai", name: "Old Stock A", assetType: "stock", investedValue: 100, currentValue: 110, absoluteReturn: 10, returnPercentage: 10 } as Holding
      ]
    };

    const newerStockStmt: ParsedStatement = {
      ownerId: "Abhinav Rai",
      ucc: "9020149214",
      statementType: "stock",
      statementDate: "2026-11-04",
      statementTimestamp: new Date(2026, 10, 4).getTime(),
      holdings: [
        { id: "h2", ownerId: "Abhinav Rai", name: "New Stock B", assetType: "stock", investedValue: 200, currentValue: 250, absoluteReturn: 50, returnPercentage: 25 } as Holding
      ]
    };

    const mfStmt: ParsedStatement = {
      ownerId: "Abhinav Rai",
      ucc: "9020149214",
      statementType: "mutual_fund",
      statementDate: "2026-10-30",
      statementTimestamp: new Date(2026, 9, 30).getTime(),
      holdings: [
        { id: "h3", ownerId: "Abhinav Rai", name: "Fund C", assetType: "mutual_fund", investedValue: 300, currentValue: 350, absoluteReturn: 50, returnPercentage: 16.67 } as Holding
      ]
    };

    // Both older and newer stock statements passed
    const combined = combinePortfolios([olderStockStmt, newerStockStmt, mfStmt]);

    // Holdings should contain the NEW stock statement and the MF statement, NOT the old stock statement
    expect(combined.holdings.length).toBe(2);
    expect(combined.holdings.some(h => h.name === "New Stock B")).toBe(true);
    expect(combined.holdings.some(h => h.name === "Fund C")).toBe(true);
    expect(combined.holdings.some(h => h.name === "Old Stock A")).toBe(false);
  });

  it("checks same statement group correctly", () => {
    const s1 = { ownerId: "Abhinav Rai", ucc: "9020149214", statementType: "stock" };
    const s2 = { ownerId: "Abhinav  Rai", ucc: "9020149214", statementType: "stock" };
    const s3 = { ownerId: "Abhinav Rai", ucc: "9020149214", statementType: "mutual_fund" };
    const s4 = { ownerId: "Mamta Rai", ucc: "4957600521", statementType: "stock" };

    expect(isSameStatementGroup(s1, s2)).toBe(true);
    expect(isSameStatementGroup(s1, s3)).toBe(false); // different asset type
    expect(isSameStatementGroup(s1, s4)).toBe(false); // different owner
  });
});
