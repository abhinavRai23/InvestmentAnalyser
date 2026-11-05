import { describe, it, expect } from "vitest";
import { evaluateStockSignal, normalizeStockKey, findMatchingStockTarget } from "./stockSignals";

describe("stockSignals engine", () => {
  it("triggers TARGET_REACHED when price >= targetPrice", () => {
    const res = evaluateStockSignal(2500, null, {
      key: "TCS",
      targetPrice: 2400,
      notes: "Target reached take profit",
    });

    expect(res.primarySignal).toBe("TARGET_REACHED");
    expect(res.badgeLabel).toBe("Target Met: Sell");
    expect(res.badgeVariant).toBe("info");
    expect(res.hasCustomPlan).toBe(true);
  });

  it("triggers STOP_LOSS_HIT when price <= stopLossPrice", () => {
    const res = evaluateStockSignal(1800, null, {
      key: "RELIANCE",
      targetPrice: 2400,
      stopLossPrice: 1900,
    });

    expect(res.primarySignal).toBe("STOP_LOSS_HIT");
    expect(res.badgeLabel).toBe("Stop Loss Hit");
    expect(res.badgeVariant).toBe("destructive");
  });

  it("triggers NEAR_52W_LOW when within 8% of 52-week low", () => {
    // 52w low is 1000, price is 1050 (5% above low)
    const res = evaluateStockSignal(1050, {
      price: 1050,
      date: new Date().toISOString(),
      fiftyTwoWeekHigh: 2000,
      fiftyTwoWeekLow: 1000,
      fiftyTwoWeekAvg: 1500,
    });

    expect(res.primarySignal).toBe("NEAR_52W_LOW");
    expect(res.badgeLabel).toContain("Near 52W Low");
    expect(res.badgeVariant).toBe("destructive");
  });

  it("triggers ABOVE_52W_AVG when price is above midpoint", () => {
    // 52w low 1000, high 2000 => avg 1500. Price is 1700.
    const res = evaluateStockSignal(1700, {
      price: 1700,
      date: new Date().toISOString(),
      fiftyTwoWeekHigh: 2000,
      fiftyTwoWeekLow: 1000,
      fiftyTwoWeekAvg: 1500,
    });

    expect(res.primarySignal).toBe("ABOVE_52W_AVG");
    expect(res.badgeLabel).toContain("Above 52W Avg");
    expect(res.badgeVariant).toBe("success");
  });

  it("triggers BELOW_52W_AVG when price is below midpoint and not near low", () => {
    // 52w low 1000, high 2000 => avg 1500. Price is 1300 (30% above low, below avg).
    const res = evaluateStockSignal(1300, {
      price: 1300,
      date: new Date().toISOString(),
      fiftyTwoWeekHigh: 2000,
      fiftyTwoWeekLow: 1000,
      fiftyTwoWeekAvg: 1500,
    });

    expect(res.primarySignal).toBe("BELOW_52W_AVG");
    expect(res.badgeLabel).toContain("Below 52W Avg");
    expect(res.badgeVariant).toBe("warning");
  });

  it("normalizes and finds matching stock targets", () => {
    const targets = {
      "TCS": { key: "TCS", targetPrice: 3000 },
      "INE467B01029": { key: "INE467B01029", targetPrice: 3200 },
    };

    expect(normalizeStockKey("  tata consultancy   services  ")).toBe("TATA CONSULTANCY SERVICES");
    expect(findMatchingStockTarget({ name: "TCS" }, null, targets)?.targetPrice).toBe(3000);
    expect(findMatchingStockTarget({ name: "Unknown", isin: "INE467B01029" }, null, targets)?.targetPrice).toBe(3200);
  });
});

