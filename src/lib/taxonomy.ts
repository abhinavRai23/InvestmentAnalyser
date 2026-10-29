export type StrategicAssetClass =
  | "Equity"
  | "Debt Mutual Funds"
  | "Fixed Deposits"
  | "Savings & Cash"
  | "Provident & Pension Funds"
  | "Gold"
  | "Silver"
  | "Other";

export type ProductType =
  | "Direct Equity Stocks"
  | "Equity ETFs"
  | "Equity Mutual Funds"
  | "Debt Mutual Funds"
  | "Hybrid Mutual Funds"
  | "Fixed Deposits (FD)"
  | "Savings Accounts"
  | "NPS (National Pension)"
  | "PPF (Public Provident)"
  | "EPF (Employee Provident)"
  | "Gold ETFs"
  | "Gold Mutual Funds"
  | "SGB"
  | "Silver ETFs"
  | "Other";


export function classifyHolding(holding: { assetType: string; category?: string; subCategory?: string; name: string }): {
  strategicAssetClass: StrategicAssetClass;
  productType: ProductType;
} {
  const nameLower = holding.name.toLowerCase();
  const categoryLower = (holding.category || "").toLowerCase();
  const subCategoryLower = (holding.subCategory || "").toLowerCase();

  // 1. SGBs
  if (holding.assetType === "sgb" || nameLower.includes("sovereign gold bond")) {
    return { strategicAssetClass: "Gold", productType: "SGB" };
  }

  // 1b. Gold ETFs (assetType === "gold" from parser)
  if (holding.assetType === "gold") {
    return { strategicAssetClass: "Gold", productType: "Gold ETFs" };
  }

  // 1c. Silver ETFs (assetType === "silver" from parser)
  if (holding.assetType === "silver") {
    return { strategicAssetClass: "Silver", productType: "Silver ETFs" };
  }

  // Check if holding name explicitly indicates an ETF (e.g. Mirae Asset S&P 500 Top 50 ETF, MASPTOP50, Nifty BeES)
  const isExplicitEtf =
    holding.assetType === "etf" ||
    nameLower.includes("etf") ||
    nameLower.includes("bees") ||
    nameLower.includes("masptop50") ||
    nameLower.includes("mafang") ||
    nameLower.includes("mon100");


  if (isExplicitEtf) {
    if (nameLower.includes("gold")) {
      return { strategicAssetClass: "Gold", productType: "Gold ETFs" };
    }
    if (nameLower.includes("silver")) {
      return { strategicAssetClass: "Silver", productType: "Silver ETFs" };
    }
    return { strategicAssetClass: "Equity", productType: "Equity ETFs" };
  }

  // 2. Direct Stocks
  if (holding.assetType === "stock") {
    return { strategicAssetClass: "Equity", productType: "Direct Equity Stocks" };
  }


  // 3. Mutual Funds & ETFs
  if (holding.assetType === "mutual_fund" || holding.assetType === "etf") {

    // Gold
    if (nameLower.includes("gold") || categoryLower.includes("gold")) {
      return {
        strategicAssetClass: "Gold",
        productType: holding.assetType === "etf" ? "Gold ETFs" : "Gold Mutual Funds"
      };
    }

    // Silver
    if (nameLower.includes("silver") || categoryLower.includes("silver")) {
      return {
        strategicAssetClass: "Silver",
        productType: holding.assetType === "etf" ? "Silver ETFs" : "Other"
      };
    }

    // Arbitrage (User instruction: consider arbitrage funds at debt not equity)
    if (
      categoryLower.includes("arbitrage") ||
      subCategoryLower.includes("arbitrage") ||
      nameLower.includes("arbitrage")
    ) {
      return { strategicAssetClass: "Debt Mutual Funds", productType: "Debt Mutual Funds" };
    }

    // Hybrid / Balanced
    if (
      categoryLower.includes("hybrid") ||
      subCategoryLower.includes("hybrid") ||
      nameLower.includes("balanced")
    ) {
      return { strategicAssetClass: "Equity", productType: "Hybrid Mutual Funds" };
    }

    // Debt
    if (
      categoryLower.includes("debt") ||
      subCategoryLower.includes("liquid") ||
      subCategoryLower.includes("short duration") ||
      subCategoryLower.includes("gilt") ||
      nameLower.includes("liquid") ||
      nameLower.includes("debt")
    ) {
      return { strategicAssetClass: "Debt Mutual Funds", productType: "Debt Mutual Funds" };
    }

    // Equity (Default for MF if not debt/hybrid/gold)
    if (
      categoryLower.includes("equity") ||
      subCategoryLower.includes("cap") ||
      subCategoryLower.includes("elss") ||
      nameLower.includes("index") ||
      nameLower.includes("equity") ||
      nameLower.includes("cap") ||
      nameLower.includes("value") ||
      nameLower.includes("fof")
    ) {
      return { strategicAssetClass: "Equity", productType: "Equity Mutual Funds" };
    }

    // Fallback classification based on asset type
    if (holding.assetType === "mutual_fund" || holding.assetType === "etf") {
      return { strategicAssetClass: "Equity", productType: "Equity Mutual Funds" };
    }
  }

  return { strategicAssetClass: "Other", productType: "Other" };
}
