import { describe, it, expect } from "vitest";
import { resolveSgbSymbol } from "./sgb";

describe("resolveSgbSymbol", () => {
  it("resolves SGB symbols by ISIN", () => {
    expect(resolveSgbSymbol("IN0020230093")).toBe("SGBSEP31II");
    expect(resolveSgbSymbol("IN0020230069")).toBe("SGBJUN31I");
    expect(resolveSgbSymbol("IN0020210178")).toBe("SGBNV29VII");
    expect(resolveSgbSymbol("IN0020230168")).toBe("SGBDE31III");
    expect(resolveSgbSymbol("IN0020230184")).toBe("SGBFEB32IV");
  });

  it("resolves SGB symbols by holding name", () => {
    expect(resolveSgbSymbol(undefined, "2.50%GOLDBONDS2031SR-II")).toBe("SGBSEP31II");
    expect(resolveSgbSymbol(undefined, "2.50%GOLDBONDS2031SR-I")).toBe("SGBJUN31I");
    expect(resolveSgbSymbol(undefined, "2.5%GOLDBONDS2029SR-VII")).toBe("SGBNV29VII");
  });

  it("returns null for non-SGB securities", () => {
    expect(resolveSgbSymbol("INE002A01018", "Reliance Industries Ltd")).toBeNull();
  });
});

