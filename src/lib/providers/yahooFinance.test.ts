import { describe, it, expect } from "vitest";
import { resolveYahooTicker } from "./yahooFinance";

describe("resolveYahooTicker", () => {
  it("resolves major ETFs correctly", () => {
    expect(resolveYahooTicker("KOTAK GOLD ETF")).toBe("GOLD1.NS");
    expect(resolveYahooTicker("KOTAKGOLD")).toBe("GOLD1.NS");
    expect(resolveYahooTicker("AXISAMC-GOLDAXIS")).toBe("GOLDAXIS.NS");
    expect(resolveYahooTicker("TATAAML-TATSILV")).toBe("TATSILV.NS");
    expect(resolveYahooTicker("ICICIPRAMC - BHARATIWIN")).toBe("ICICIB22.NS");
    expect(resolveYahooTicker("ICICIPRAMC - ICICINXT50")).toBe("NEXT50IETF.NS");
    expect(resolveYahooTicker("MIRAEAMC - MAM150ETF")).toBe("MIDCAPETF.NS");
    expect(resolveYahooTicker("UTIAMC-GOLDSHARE")).toBe("GOLDBETA.NS");
    expect(resolveYahooTicker("NIP IND ETF GOLD BEES")).toBe("GOLDBEES.NS");
  });

  it("resolves direct equity stocks correctly", () => {
    expect(resolveYahooTicker("RELIANCE INDUSTRIES LTD")).toBe("RELIANCE.NS");
    expect(resolveYahooTicker("TCS")).toBe("TCS.NS");
    expect(resolveYahooTicker("ITC")).toBe("ITC.NS");
  });
});

