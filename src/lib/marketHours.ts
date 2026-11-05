/**
 * Indian Stock Market (NSE / BSE) Trading Hours Utility
 * Standard Equity Trading Hours: 9:30 AM - 3:30 PM IST, Monday - Friday
 */

export interface MarketStatus {
  isOpen: boolean;
  weekday: string;
  hour: number;
  minute: number;
  istTimeString: string;
  reason: string;
}

/**
 * Evaluates whether Indian equity markets are open at a specific timestamp.
 * Standard hours: 09:30 IST to 15:30 IST, Monday through Friday.
 */
export function getIndianMarketStatus(now = new Date()): MarketStatus {
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });

  const parts = istFormatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Unknown";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const timeInMinutes = hour * 60 + minute;
  const marketOpenMinutes = 9 * 60 + 30; // 09:30 IST (570 minutes)
  const marketCloseMinutes = 15 * 60 + 30; // 15:30 IST (930 minutes)

  const istTimeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} IST (${weekday})`;

  if (isWeekend) {
    return {
      isOpen: false,
      weekday,
      hour,
      minute,
      istTimeString,
      reason: `Weekend (${weekday}) - Market Closed`,
    };
  }

  if (timeInMinutes < marketOpenMinutes) {
    return {
      isOpen: false,
      weekday,
      hour,
      minute,
      istTimeString,
      reason: "Pre-market - Opens at 09:30 AM IST",
    };
  }

  if (timeInMinutes > marketCloseMinutes) {
    return {
      isOpen: false,
      weekday,
      hour,
      minute,
      istTimeString,
      reason: "Post-market - Closed at 03:30 PM IST",
    };
  }

  return {
    isOpen: true,
    weekday,
    hour,
    minute,
    istTimeString,
    reason: "Market Open (09:30 AM - 03:30 PM IST)",
  };
}

export function isIndianMarketOpen(now = new Date()): boolean {
  return getIndianMarketStatus(now).isOpen;
}

