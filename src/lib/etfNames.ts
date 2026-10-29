/**
 * Static display name fallback map for well-known Indian ETFs.
 * Keys are the BSE/demat sheet names. Values are the proper Groww display names.
 * This is used when the Groww API cache hasn't been synced yet.
 */
export const ETF_DISPLAY_NAMES: Record<string, string> = {
  // Nippon ETFs
  "NIP IND ETF NIFTY BEES": "Nippon India ETF Nifty BeES",
  "NIP IND ETF BANK BEES": "Nippon India ETF Bank BeES",
  "NIP IND ETF NIFTY 50": "Nippon India ETF Nifty 50",
  "NIP IND ETF JUNIOR": "Nippon India ETF Junior BeES",
  "NIP IND ETF NIFTY MIDCAP": "Nippon India ETF Nifty Midcap 150",
  "NIP IND ETF CONSUMPTION": "Nippon India ETF Consumption",
  "NIP IND ETF INFRA BEES": "Nippon India ETF Infra BeES",
  "NIP IND ETF PHARMA": "Nippon India ETF Pharma BeES",
  "NIP IND ETF DIVOPP": "Nippon India ETF Nifty Dividend Opportunities 50",
  "NIP IND ETF SENSEX NEXT 50": "Nippon India ETF Sensex Next 50",
  "NIP IND ETF SENSEX": "Nippon India ETF Sensex",
  "NIPPON SILVER ETF": "Nippon India Silver ETF",
  "NIFBEES": "Nippon India ETF Nifty BeES",
  "BANKBEES": "Nippon India ETF Bank BeES",

  // ICICI Prudential ETFs
  "ICICIPRAMC - BHARATIWIN": "ICICI Prudential Bharat 22 ETF",
  "ICICIPRAMC - ICICINXT50": "ICICI Prudential Nifty Next 50 ETF",
  "ICIPRAMC - ICICINXT50": "ICICI Prudential Nifty Next 50 ETF",
  "ICICIPRAMC - ICICIB22": "ICICI Prudential Bharat 22 ETF",
  "ICICIPRAMC - ICICISENSX": "ICICI Prudential Sensex ETF",
  "ICICIPRAMC - ICICIBANKN": "ICICI Prudential Bank ETF",
  "ICICIPRAMC - ICICIITIETF": "ICICI Prudential IT ETF",
  "ICICIPRAMC - ICICI500": "ICICI Prudential Nifty 500 ETF",
  "ICICIPRAMC - ICICIMIDCAP": "ICICI Prudential Midcap 150 ETF",

  // HDFC ETFs
  "HDFCAMC - HDFCNIFTY": "HDFC Nifty 50 ETF",
  "HDFCAMC - HDFCBANK": "HDFC Banking ETF",
  "HDFCAMC - HDFCSENSX": "HDFC Sensex ETF",
  "HDFCAMC - HDFCMID100": "HDFC Nifty Midcap 100 ETF",
  "HDFCAMC - HDFCNXT50": "HDFC Nifty Next 50 ETF",
  "HDFCAMC - HDFCSILVER": "HDFC Silver ETF",
  "HDFCAMC - HDFCGOLD": "HDFC Gold ETF",

  // Motilal Oswal ETFs
  "MOTILAL OS NASDAQ100 ETF": "Motilal Oswal Nasdaq 100 ETF",
  "MOTILAL OS S&P500 ETF": "Motilal Oswal S&P 500 ETF",
  "MOTILAL OS MIDCAP100 ETF": "Motilal Oswal Midcap 100 ETF",
  "MON100": "Motilal Oswal Nasdaq 100 ETF",
  "MAFANG": "Motilal Oswal FANG+ ETF",

  // SBI ETFs
  "SBI-ETF NIFTY 50": "SBI Nifty 50 ETF",
  "SBI-ETF NIFTY NEXT 50": "SBI Nifty Next 50 ETF",
  "SBI-ETF SENSEX": "SBI Sensex ETF",
  "SBI-ETF BANK": "SBI Banking ETF",
  "SBI-ETF NIFTY MIDCAP": "SBI Nifty Midcap 150 ETF",
  "SBI-ETF QUALITY": "SBI Nifty 200 Quality 30 ETF",
  "SBI-ETF GOLD": "SBI Gold ETF",

  // UTI ETFs
  "UTIAMC-NIFTYBETA": "UTI Nifty200 Momentum 30 ETF",
  "UTI - NIFTY ETF": "UTI Nifty 50 ETF",
  "UTIAMC-NIFTY50": "UTI Nifty 50 ETF",
  "UTIAMC-NIFTYNXT50": "UTI Nifty Next 50 ETF",
  "UTIAMC-SENSEX": "UTI Sensex ETF",
  "UTIAMC-BANKIETF": "UTI Banking ETF",
  "UTIAMC-GOLDSHARE": "UTI Gold ETF",

  // Tata ETFs
  "TATAAML-TATAGOLD": "Tata Gold ETF",
  "TATAAML-TATSILV": "Tata Silver ETF",
  "TATAAML-NIFTY": "Tata Nifty 50 ETF",

  // Kotak ETFs
  "KOTAKAMC - KOTAKNV20ETF": "Kotak Nifty Alpha 50 ETF",
  "KOTAKNIFETF": "Kotak Nifty 50 ETF",
  "KOTAKBKETF": "Kotak Banking ETF",
  "KOTAKGOLD": "Kotak Gold ETF",
  "KOTAKSILVER": "Kotak Silver ETF",

  // DSP ETFs
  "DSPNIFTY": "DSP Nifty 50 ETF",

  // Mirae ETFs
  "MIRAE - NIFTY50ETF": "Mirae Asset Nifty 50 ETF",
  "MIRAEAMC - MASPTOP50": "Mirae Asset S&P 500 Top 50 ETF",
  "MIRAE - MASPTOP50": "Mirae Asset S&P 500 Top 50 ETF",
  "MASPTOP50": "Mirae Asset S&P 500 Top 50 ETF",
  "MIRAE ASSET S&P 500 TOP 50 ETF": "Mirae Asset S&P 500 Top 50 ETF",
  "MASPTOP50 - ETF": "Mirae Asset S&P 500 Top 50 ETF",

  // Bharat ETF (pool funds)
  "BHARATIWIN": "ICICI Prudential Bharat 22 ETF",
  "BHARAT22ETF": "ICICI Prudential Bharat 22 ETF",
};


/**
 * Formats Sovereign Gold Bonds to preserve year & series information (e.g. 2029 Series VII).
 */
export function formatSgbDisplayName(rawName: string): string | null {
  if (!rawName) return null;
  const clean = rawName.trim();
  const upper = clean.toUpperCase();

  if (!upper.includes("GOLDBOND") && !upper.includes("SGB")) return null;

  // Match pattern like 2.5%GOLDBONDS2029SR-VII or 2.50%GOLDBONDS2028-29SR-IV or GOLDBONDS2029
  const match = upper.match(/^(?:2\.50?%?\s*)?GOLDBONDS?\s*(\d{4}(?:-\d{2,4})?)\s*(?:SR-?([I|V|X]+|\d+))?/i);
  if (match) {
    const year = match[1];
    const series = match[2] ? ` Series ${match[2]}` : "";
    return `Sovereign Gold Bond 2.50% ${year}${series}`;
  }

  // Handle formats like "SGB 2028-29 Series IV" or "SGB 2.50% MAY 2029"
  if (upper.startsWith("SGB") || upper.includes("SOVEREIGN GOLD BOND")) {
    return clean
      .replace(/^SGB\b/i, "Sovereign Gold Bond")
      .replace(/\bSR-?/i, "Series ");
  }

  return null;
}

/**
 * Tries to find a display name for a holding's raw name using the static map or SGB parser.
 */
export function staticDisplayName(rawName: string): string | null {
  if (!rawName) return null;

  // SGB check first — ensures Year & Series are always preserved
  const sgbName = formatSgbDisplayName(rawName);
  if (sgbName) return sgbName;

  const upper = rawName.trim().toUpperCase();

  // Exact match first
  for (const [key, label] of Object.entries(ETF_DISPLAY_NAMES)) {
    if (upper === key.toUpperCase()) return label;
  }

  // Partial prefix match for ETFs
  for (const [key, label] of Object.entries(ETF_DISPLAY_NAMES)) {
    if (upper.startsWith(key.toUpperCase()) || key.toUpperCase().startsWith(upper)) {
      return label;
    }
  }

  return null;
}
