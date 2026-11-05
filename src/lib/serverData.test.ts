import { describe, it, expect } from "vitest";
import { getServerPortfolioData } from "./serverData";
import fs from "fs";
import path from "path";

describe("serverData deduplication", () => {
  it("loads portfolio and keeps only the newer dated file on disk", () => {
    process.env.ENABLE_LOCAL_PORTFOLIO = "true";
    const data = getServerPortfolioData();
    expect(data).toBeDefined();
    expect(data?.holdings.length).toBeGreaterThan(0);

    // Verify older duplicate file was removed from disk
    const reportsDir = path.join(process.cwd(), "data", "reports");
    const olderFile = path.join(reportsDir, "Stocks_Holdings_Statement_9020149214_29-10-2026.xlsx");
    const newerFile = path.join(reportsDir, "Stocks_Holdings_Statement_9020149214_04-11-2026.xlsx");

    expect(fs.existsSync(olderFile)).toBe(false);
    expect(fs.existsSync(newerFile)).toBe(true);
  });
});

