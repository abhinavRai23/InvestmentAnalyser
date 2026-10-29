import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, Users, User } from "lucide-react";
import { useFilteredHoldings } from "@/store/portfolioStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Holding } from "@/lib/types";
import {
  useGrowwCache,
  resolveDisplayName,
  getGrowwUrl,
} from "@/hooks/useGrowwCache";

export function DirectStocksAnalyzer() {
  const holdings = useFilteredHoldings();
  const { cache: growwCache, sync, isSyncing } = useGrowwCache();

  const directStocks = useMemo(() => {
    return holdings.filter((h) => {
      // Exclude mutual funds
      if (h.assetType === "mutual_fund") return false;
      // Exclude custom bank, FD & pension assets (they belong in Bank, FD & Pension Assets tab)
      if (h.id.startsWith("custom-")) return false;
      if (
        ["FD", "Savings Account", "NPS", "PPF", "EPF"].includes(
          h.category || "",
        )
      )
        return false;
      return true;
    });
  }, [holdings]);

  const handleSync = () =>
    sync(directStocks.map((h) => ({ name: h.name, isin: h.isin })));

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [holdings]);

  const totalStockValue = useMemo(() => {
    return directStocks.reduce((sum, h) => sum + h.currentValue, 0);
  }, [directStocks]);

  const totalStockInvested = useMemo(() => {
    return directStocks.reduce((sum, h) => sum + h.investedValue, 0);
  }, [directStocks]);

  const totalStockGain = totalStockValue - totalStockInvested;
  const totalStockReturnPct =
    totalStockInvested > 0 ? (totalStockGain / totalStockInvested) * 100 : 0;

  const enrichedDirectStocks = useMemo(() => {
    return directStocks.map((stock) => {
      const entry =
        (stock.isin && growwCache[stock.isin]) || growwCache[stock.name];
      const ret1y =
        entry?.return_stats?.[0]?.return1y ??
        entry?.simple_return?.return1y ??
        entry?.stats?.return1y ??
        entry?.returns?.year1 ??
        entry?.year1Return;
      const ret3y =
        entry?.return_stats?.[0]?.return3y ??
        entry?.simple_return?.return3y ??
        entry?.stats?.return3y ??
        entry?.returns?.year3 ??
        entry?.year3Return;

      return {
        ...stock,
        _ret1y: typeof ret1y === "number" ? ret1y : null,
        _ret3y: typeof ret3y === "number" ? ret3y : null,
      };
    });
  }, [directStocks, growwCache]);

  const groupedStocks = useMemo(() => {
    const groups: Record<string, any[]> = {
      "Stocks (Direct Equity)": [],
      "Equity ETFs": [],
      "Gold ETFs": [],
      "Silver ETFs": [],
      "Sovereign Gold Bonds (SGB)": [],
    };

    for (const stock of enrichedDirectStocks) {
      const nameLower = stock.name.toLowerCase();
      const isSgb =
        stock.assetType === "sgb" ||
        (stock.productType || "") === "SGB" ||
        nameLower.includes("goldbond") ||
        nameLower.includes("sgb");
      const isGold =
        stock.assetType === "gold" ||
        stock.strategicAssetClass === "Gold" ||
        nameLower.includes("gold");
      const isSilver =
        stock.assetType === "silver" ||
        stock.strategicAssetClass === "Silver" ||
        nameLower.includes("silver") ||
        nameLower.includes("silv");
      const displayNameLower = resolveDisplayName(stock, growwCache).toLowerCase();
      const isEtf =
        stock.assetType === "etf" ||
        (stock.productType || "").includes("ETF") ||
        nameLower.includes("etf") ||
        nameLower.includes("bees") ||
        nameLower.includes("masptop50") ||
        nameLower.includes("mafang") ||
        nameLower.includes("mon100") ||
        displayNameLower.includes("etf") ||
        displayNameLower.includes("bees");



      if (isSgb) {
        groups["Sovereign Gold Bonds (SGB)"].push(stock);
      } else if (isEtf && isGold) {
        groups["Gold ETFs"].push(stock);
      } else if (isEtf && isSilver) {
        groups["Silver ETFs"].push(stock);
      } else if (isEtf) {
        groups["Equity ETFs"].push(stock);
      } else if (isGold) {
        groups["Gold ETFs"].push(stock);
      } else if (isSilver) {
        groups["Silver ETFs"].push(stock);
      } else {
        groups["Stocks (Direct Equity)"].push(stock);
      }
    }

    // Sort items within each group by current value descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.currentValue - a.currentValue);
    });

    return groups;
  }, [enrichedDirectStocks]);

  const columns = useMemo(() => {
    const has1yData = enrichedDirectStocks.some(
      (s) => s._ret1y !== null && s._ret1y !== undefined,
    );
    const has3yData = enrichedDirectStocks.some(
      (s) => s._ret3y !== null && s._ret3y !== undefined,
    );

    const cols: ColumnDef<any>[] = [
      {
        header: "Instrument Name",
        cell: (row) => {
          const growwUrl = getGrowwUrl(row, growwCache);
          const hasMultipleOwners = row.owners && row.owners.length > 1;

          return (
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5 group">
                <span className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                  {resolveDisplayName(row, growwCache)}
                </span>
                <a
                  href={growwUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View on Groww (opens in new tab)"
                  className="text-muted-foreground hover:text-indigo-600 transition-colors p-0.5 rounded-sm hover:bg-muted shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">
                  {row.productType}
                </span>
                {row.owners && row.owners.length > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-normal px-1.5 py-0.2 ${hasMultipleOwners
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : "bg-muted/40 text-muted-foreground border-border"
                      }`}
                  >
                    {hasMultipleOwners ? (
                      <span className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                        {row.owners.length} Members (
                        {row.owners
                          .map(
                            (o: any) =>
                              `${o.ownerName.split(" ")[0]} ${o.percentage.toFixed(0)}%`,
                          )
                          .join(", ")}
                        )
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="h-2.5 w-2.5 shrink-0 opacity-70" />
                        {row.owners[0].ownerName}
                      </span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "Member / Owner",
        accessorKey: "ownerId",
        enableSorting: true,
        cell: (row) => {
          if (!row.owners || row.owners.length === 0)
            return <span className="text-muted-foreground">-</span>;
          if (row.owners.length === 1) {
            return (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  {row.owners[0].ownerName}
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col text-xs max-w-[150px]">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Users className="h-3 w-3" /> {row.owners.length} Members
              </span>
              <span
                className="text-[11px] text-muted-foreground truncate"
                title={row.owners
                  .map(
                    (o: any) => `${o.ownerName}: ${o.percentage.toFixed(1)}%`,
                  )
                  .join(", ")}
              >
                {row.owners
                  .map(
                    (o: any) =>
                      `${o.ownerName.split(" ")[0]} (${o.percentage.toFixed(0)}%)`,
                  )
                  .join(", ")}
              </span>
            </div>
          );
        },
      },
      {
        header: "Quantity",
        accessorKey: "quantity",
        enableSorting: true,
        cell: (row) => (
          <span className="font-medium">{row.quantity || "-"}</span>
        ),
      },
      {
        header: "Invested Value",
        accessorKey: "investedValue",
        enableSorting: true,
        cell: (row) => (
          <span className="text-muted-foreground">
            {formatCurrency(row.investedValue)}
          </span>
        ),
      },
      {
        header: "Current Value",
        accessorKey: "currentValue",
        enableSorting: true,
        cell: (row) => (
          <span className="font-semibold">
            {formatCurrency(row.currentValue)}
          </span>
        ),
      },
      {
        header: "Returns",
        accessorKey: "absoluteReturn",
        enableSorting: true,
        cell: (row) => {
          const isPositive = row.absoluteReturn >= 0;
          return (
            <div className="flex flex-col">
              <span
                className={`font-semibold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {formatCurrency(row.absoluteReturn)}
              </span>
              <span
                className={`text-xs ${isPositive ? "text-emerald-600/90 dark:text-emerald-300" : "text-rose-600/90 dark:text-rose-300"}`}
              >
                {row.returnPercentage.toFixed(2)}%
              </span>
            </div>
          );
        },
      },
    ];

    if (has1yData) {
      cols.push({
        header: "1Y Ret",
        accessorKey: "_ret1y",
        enableSorting: true,
        cell: (row) => {
          const ret = row._ret1y;
          if (ret === null || ret === undefined)
            return <span className="text-muted-foreground">-</span>;
          const isPos = ret >= 0;
          return (
            <span
              className={`font-medium whitespace-nowrap ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {ret.toFixed(2)}%
            </span>
          );
        },
      });
    }

    if (has3yData) {
      cols.push({
        header: "3Y Ret",
        accessorKey: "_ret3y",
        enableSorting: true,
        cell: (row) => {
          const ret = row._ret3y;
          if (ret === null || ret === undefined)
            return <span className="text-muted-foreground">-</span>;
          const isPos = ret >= 0;
          return (
            <span
              className={`font-medium whitespace-nowrap ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {ret.toFixed(2)}%
            </span>
          );
        },
      });
    }

    cols.push({
      header: "Allocation",
      accessorKey: "allocation",
      enableSorting: false,
      cell: (row) => {
        const alloc =
          totalPortfolioValue > 0
            ? (row.currentValue / totalPortfolioValue) * 100
            : 0;
        return (
          <span className="text-muted-foreground">{alloc.toFixed(2)}%</span>
        );
      },
    });

    return cols;
  }, [enrichedDirectStocks, totalPortfolioValue, growwCache]);

  if (directStocks.length === 0) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <span className="text-xl">📈</span>
          </div>
          <h3 className="text-lg font-semibold">No Direct Stocks Found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            You don't have any direct stock holdings in the selected portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Direct Stocks & Demat Holdings</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                <span>{directStocks.length} holdings</span>
                <span>•</span>
                <span>
                  Invested:{" "}
                  <strong className="font-semibold text-foreground font-mono">
                    {formatCurrency(totalStockInvested)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Current:{" "}
                  <strong className="font-semibold text-foreground font-mono">
                    {formatCurrency(totalStockValue)}
                  </strong>
                </span>
                <span
                  className={`font-semibold font-mono text-xs ${totalStockGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  ({totalStockGain >= 0 ? "+" : ""}
                  {formatCurrency(totalStockGain)} /{" "}
                  {totalStockGain >= 0 ? "+" : ""}
                  {totalStockReturnPct.toFixed(2)}%)
                </span>
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Groww Intelligence"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {Object.entries(groupedStocks)
        .filter(([_, items]) => items.length > 0)
        .map(([groupName, items]) => {
          const groupInvested = items.reduce(
            (sum, h) => sum + h.investedValue,
            0,
          );
          const groupTotal = items.reduce((sum, h) => sum + h.currentValue, 0);
          const groupGain = groupTotal - groupInvested;
          const groupReturnPct =
            groupInvested > 0 ? (groupGain / groupInvested) * 100 : 0;
          const groupAlloc =
            totalPortfolioValue > 0
              ? (groupTotal / totalPortfolioValue) * 100
              : 0;

          return (
            <Card key={groupName} className="overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-6 py-3.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {groupName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length} holdings • {groupAlloc.toFixed(1)}% of
                    Portfolio
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs md:text-sm shrink-0">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                      Invested
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {formatCurrency(groupInvested)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border my-auto"></div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                      Current Value
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {formatCurrency(groupTotal)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border my-auto"></div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                      Returns
                    </span>
                    <span
                      className={`font-bold font-mono ${groupGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {groupGain >= 0 ? "+" : ""}
                      {groupReturnPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              <CardContent className="p-0">
                <DataTable columns={columns} data={items} />
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
