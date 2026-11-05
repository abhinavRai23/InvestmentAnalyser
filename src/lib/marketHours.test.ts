import { describe, it, expect } from "vitest";
import { getIndianMarketStatus, isIndianMarketOpen } from "./marketHours";

describe("Indian Market Hours", () => {
  it("should detect weekday 09:29 AM IST as closed (pre-market)", () => {
    // 2026-11-09 is a Monday. UTC 03:59:00 = IST 09:29:00
    const d = new Date("2026-11-09T03:59:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(false);
    expect(status.weekday).toBe("Mon");
    expect(status.hour).toBe(9);
    expect(status.minute).toBe(29);
    expect(isIndianMarketOpen(d)).toBe(false);
  });

  it("should detect weekday 09:30 AM IST as open", () => {
    // UTC 04:00:00 = IST 09:30:00
    const d = new Date("2026-11-09T04:00:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(true);
    expect(status.weekday).toBe("Mon");
    expect(status.hour).toBe(9);
    expect(status.minute).toBe(30);
    expect(isIndianMarketOpen(d)).toBe(true);
  });

  it("should detect weekday 12:30 PM IST as open", () => {
    // UTC 07:00:00 = IST 12:30:00
    const d = new Date("2026-11-09T07:00:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(true);
    expect(isIndianMarketOpen(d)).toBe(true);
  });

  it("should detect weekday 03:30 PM IST (15:30) as open", () => {
    // UTC 10:00:00 = IST 15:30:00
    const d = new Date("2026-11-09T10:00:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(true);
    expect(status.hour).toBe(15);
    expect(status.minute).toBe(30);
    expect(isIndianMarketOpen(d)).toBe(true);
  });

  it("should detect weekday 03:31 PM IST (15:31) as closed (post-market)", () => {
    // UTC 10:01:00 = IST 15:31:00
    const d = new Date("2026-11-09T10:01:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(false);
    expect(status.hour).toBe(15);
    expect(status.minute).toBe(31);
    expect(isIndianMarketOpen(d)).toBe(false);
  });

  it("should detect Saturday 12:00 PM IST as closed (weekend)", () => {
    // 2026-11-07 is Saturday. UTC 06:30:00 = IST 12:00:00
    const d = new Date("2026-11-07T06:30:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(false);
    expect(status.weekday).toBe("Sat");
    expect(isIndianMarketOpen(d)).toBe(false);
  });

  it("should detect Sunday 11:00 AM IST as closed (weekend)", () => {
    // 2026-11-08 is Sunday. UTC 05:30:00 = IST 11:00:00
    const d = new Date("2026-11-08T05:30:00Z");
    const status = getIndianMarketStatus(d);
    expect(status.isOpen).toBe(false);
    expect(status.weekday).toBe("Sun");
    expect(isIndianMarketOpen(d)).toBe(false);
  });
});

