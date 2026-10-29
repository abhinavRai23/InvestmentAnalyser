"use client";

import { useState, useMemo } from "react";
import { usePortfolioStore, useFilteredHoldings } from "@/store/portfolioStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Scale, Search, X, ExternalLink, Users, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Holding } from "@/lib/types";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGrowwCache, resolveDisplayName, getGrowwUrl } from "@/hooks/useGrowwCache";

export function MutualFundAnalyzer() {
  const { data } = usePortfolioStore();
  const holdings = useFilteredHoldings();
  const [selectedFund, setSelectedFund] = useState<Holding | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Section-specific category filters (e.g. "Equity Mutual Funds" -> "Small Cap")
  const [sectionCategories, setSectionCategories] = useState<Record<string, string>>({});

  const { cache: growwCache, sync, isSyncing: isSyncingGroww } = useGrowwCache();

  const mfHoldings = useMemo(() => {
    if (!holdings) return [];
    return holdings.filter((h) => h.assetType === "mutual_fund");
  }, [holdings]);

  const handleSyncGroww = () => {
    const toSync = mfHoldings.map(h => ({ name: h.name, isin: h.isin }));
    sync(toSync);
  };

  const enrichedHoldings = useMemo(() => {
    return mfHoldings.map(h => {
      const entry = (h.isin && growwCache[h.isin]) || growwCache[h.name];
      const subCat = entry?.sub_category || h.subCategory;
      const mainCat = entry?.category || h.category;
      const categoryName = subCat || mainCat || "Uncategorized";

      return {
        ...h,
        _displayName: resolveDisplayName(h, growwCache),
        _rating: entry?.groww_rating || 0,
        _expense: entry?.expense_ratio || 0,
        _ret1y: entry?.return_stats?.[0]?.return1y ?? entry?.simple_return?.return1y ?? 0,
        _ret3y: entry?.return_stats?.[0]?.return3y ?? entry?.simple_return?.return3y ?? 0,
        _ret5y: entry?.return_stats?.[0]?.return5y ?? entry?.simple_return?.return5y ?? 0,
        _category: categoryName,
        _mainCategory: mainCat || "Mutual Fund",
        _aum: entry?.aum || 0,
        _exitLoad: entry?.exit_load || "",
        _logo: entry?.logo_url || "",
        _growwDetails: entry || null,
      };
    });
  }, [mfHoldings, growwCache]);

  const filteredHoldings = useMemo(() => {
    if (!searchQuery) return enrichedHoldings;
    const q = searchQuery.toLowerCase();
    return enrichedHoldings.filter(h =>
      (h._displayName || h.name).toLowerCase().includes(q) ||
      (h._category || "").toLowerCase().includes(q) ||
      (h._mainCategory || "").toLowerCase().includes(q)
    );
  }, [enrichedHoldings, searchQuery]);

  const groupedMFs = useMemo(() => {
    const groups: Record<string, typeof enrichedHoldings> = {
      "Equity Mutual Funds": [],
      "Debt Mutual Funds": [],
      "Gold Mutual Funds": [],
      "Silver Mutual Funds": [],
      "Other Mutual Funds": []
    };

    for (const fund of filteredHoldings) {
      const nameLower = (fund._displayName || fund.name).toLowerCase();
      const catLower = (fund._category || fund.category || "").toLowerCase();
      const subCatLower = (fund.subCategory || "").toLowerCase();
      const mainCatLower = (fund._mainCategory || "").toLowerCase();

      const isGold = catLower.includes("gold") || nameLower.includes("gold") || fund.strategicAssetClass === "Gold";
      const isSilver = catLower.includes("silver") || nameLower.includes("silver") || nameLower.includes("silv") || fund.strategicAssetClass === "Silver";
      const isDebt = mainCatLower.includes("debt") || catLower.includes("debt") || subCatLower.includes("liquid") || subCatLower.includes("gilt") || catLower.includes("duration") || catLower.includes("liquid") || catLower.includes("arbitrage") || subCatLower.includes("arbitrage") || nameLower.includes("arbitrage") || nameLower.includes("liquid") || nameLower.includes("debt") || fund.strategicAssetClass === "Debt Mutual Funds";

      if (isGold) {
        groups["Gold Mutual Funds"].push(fund);
      } else if (isSilver) {
        groups["Silver Mutual Funds"].push(fund);
      } else if (isDebt) {
        groups["Debt Mutual Funds"].push(fund);
      } else if (
        fund.assetType === "mutual_fund" ||
        mainCatLower.includes("equity") ||
        catLower.includes("equity") ||
        catLower.includes("cap") ||
        catLower.includes("hybrid") ||
        fund.strategicAssetClass === "Equity"
      ) {
        groups["Equity Mutual Funds"].push(fund);
      } else {
        groups["Other Mutual Funds"].push(fund);
      }
    }

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.currentValue - a.currentValue);
    });

    return groups;
  }, [filteredHoldings]);

  const totalMfValue = useMemo(() => {
    return enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [enrichedHoldings]);

  const totalMfInvested = useMemo(() => {
    return enrichedHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  }, [enrichedHoldings]);

  const totalMfGain = totalMfValue - totalMfInvested;
  const totalMfReturnPct = totalMfInvested > 0 ? (totalMfGain / totalMfInvested) * 100 : 0;


  const toggleCompare = (fundName: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(fundName)) return prev.filter(f => f !== fundName);
      if (prev.length >= 3) return [...prev.slice(1), fundName];
      return [...prev, fundName];
    });
  };

  const setSectionCategory = (section: string, cat: string) => {
    setSectionCategories(prev => ({ ...prev, [section]: cat }));
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Compare",
      cell: (row) => (
        <Checkbox
          checked={selectedForCompare.includes(row.name)}
          onCheckedChange={() => toggleCompare(row.name)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      header: "Fund Name",
      accessorKey: "name",
      enableSorting: true,
      cell: (row) => {
        const growwUrl = getGrowwUrl(row, growwCache);
        return (
          <div className="flex flex-col min-w-[220px]">
            <div className="flex items-center space-x-1.5 group">
              <span className="font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                {row._displayName || row.name}
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
            {row._category && (
              <div className="mt-1">
                <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-[var(--bg-muted-dark)] dark:text-indigo-300 border border-indigo-200/50 dark:border-[var(--bg-highlight-dark)]">
                  {row._category}
                </Badge>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Invested",
      accessorKey: "investedValue",
      enableSorting: true,
      cell: (row) => <span className="text-muted-foreground">{formatCurrency(row.investedValue)}</span>,
    },
    {
      header: "Current Value",
      accessorKey: "currentValue",
      enableSorting: true,
      cell: (row) => <span className="font-semibold">{formatCurrency(row.currentValue)}</span>,
    },
    {
      header: "Abs. Return",
      accessorKey: "absoluteReturn",
      enableSorting: true,
      cell: (row) => {
        const isPositive = row.absoluteReturn >= 0;
        return (
          <div className="flex flex-col">
            <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(row.absoluteReturn)}
            </span>
            <span className={`text-xs ${isPositive ? 'text-emerald-600/90 dark:text-emerald-300' : 'text-rose-600/90 dark:text-rose-300'}`}>
              {row.returnPercentage.toFixed(2)}%
            </span>
          </div>
        );
      },
    },
    {
      header: "XIRR",
      accessorKey: "xirr",
      enableSorting: true,
      cell: (row) => {
        if (!row.xirr) return <span className="text-muted-foreground">-</span>;
        const isPositive = row.xirr >= 0;
        return (
          <span className={`font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {row.xirr.toFixed(2)}%
          </span>
        );
      },
    },
    {
      header: "Rating",
      accessorKey: "_rating",
      enableSorting: true,
      cell: (row) => {
        return row._rating ? <span className="font-semibold text-yellow-500 whitespace-nowrap">{row._rating} ★</span> : <span className="text-muted-foreground">-</span>;
      }
    },
    {
      header: "Exp. Ratio",
      accessorKey: "_expense",
      enableSorting: true,
      cell: (row) => {
        return row._expense ? <span className="font-medium whitespace-nowrap">{row._expense}%</span> : <span className="text-muted-foreground">-</span>;
      }
    },
    {
      header: "1Y Ret (Groww)",
      accessorKey: "_ret1y",
      enableSorting: true,
      cell: (row) => {
        const ret = row._ret1y;
        if (!ret) return <span className="text-muted-foreground">-</span>;
        return <span className={`font-medium whitespace-nowrap ${ret >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{ret.toFixed(2)}%</span>;
      }
    },
    {
      header: "3Y Ret (Groww)",
      accessorKey: "_ret3y",
      enableSorting: true,
      cell: (row) => {
        const ret = row._ret3y;
        if (!ret) return <span className="text-muted-foreground">-</span>;
        return <span className={`font-medium whitespace-nowrap ${ret >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{ret.toFixed(2)}%</span>;
      }
    }
  ];

  const underlyingData = selectedFund && data?.mfHoldings ? data.mfHoldings[selectedFund.name] : [];

  const underlyingColumns: ColumnDef<any>[] = [
    {
      header: "Stock/Asset Name",
      accessorKey: "stockName",
      enableSorting: true,
      cell: (row) => {
        const growwSearchUrl = `https://groww.in/search?q=${encodeURIComponent(row.stockName)}`;
        return (
          <div className="flex flex-col min-w-[200px]">
            <div className="flex items-center space-x-1.5 group">
              <span className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                {row.stockName}
              </span>
              <a
                href={growwSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Search ${row.stockName} on Groww`}
                className="text-muted-foreground hover:text-indigo-600 transition-colors p-0.5 rounded-sm hover:bg-muted shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <span className="text-xs text-muted-foreground">{row.instrumentClass || "Equity"}</span>
          </div>
        );
      },
    },
    {
      header: "Sector",
      accessorKey: "sector",
      enableSorting: true,
      cell: (row) => <Badge variant="outline" className="font-normal">{row.sector}</Badge>,
    },
    {
      header: "Fund Weight",
      accessorKey: "weight",
      enableSorting: true,
      cell: (row) => <span className="font-mono font-medium">{row.weight.toFixed(2)}%</span>,
    },
    {
      header: "Effective Exposure",
      accessorKey: "weight",
      enableSorting: false,
      cell: (row) => {
        if (!selectedFund) return "-";
        const val = (row.weight / 100) * selectedFund.currentValue;
        return <span className="font-bold text-foreground">{formatCurrency(val)}</span>;
      },
    }
  ];

  // Up to 3 funds side-by-side comparison data
  const comparedItems = useMemo(() => {
    return selectedForCompare.map(name => {
      const fund = enrichedHoldings.find(h => h.name === name);
      return {
        name,
        fund,
        details: fund?._growwDetails || (fund?.isin ? growwCache[fund.isin] : null) || growwCache[name] || null
      };
    });
  }, [selectedForCompare, enrichedHoldings, growwCache]);

  const getReturn = (d: any, period: '1y' | '3y' | '5y') =>
    d?.return_stats?.[0]?.[`return${period}`] ?? d?.simple_return?.[`return${period}`];

  // Pairwise overlaps calculation for compared funds
  const pairwiseOverlaps = useMemo(() => {
    if (comparedItems.length < 2) return [];
    const results: { pair: string; percentage: number }[] = [];

    for (let i = 0; i < comparedItems.length; i++) {
      for (let j = i + 1; j < comparedItems.length; j++) {
        const itemA = comparedItems[i];
        const itemB = comparedItems[j];
        const detailsA = itemA.details;
        const detailsB = itemB.details;

        if (detailsA?.holdings && detailsB?.holdings) {
          const mapA = new Map<string, number>(
            detailsA.holdings.map((h: any) => [h.company_name, Number(h.corpus_per)])
          );
          let overlap = 0;
          detailsB.holdings.forEach((h: any) => {
            if (mapA.has(h.company_name)) {
              overlap += Math.min(mapA.get(h.company_name)!, Number(h.corpus_per));
            }
          });
          results.push({
            pair: `${itemA.fund?._displayName || itemA.name} ↔ ${itemB.fund?._displayName || itemB.name}`,
            percentage: overlap
          });
        }
      }
    }
    return results;
  }, [comparedItems]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mutual Fund Portfolio</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
            <span>{filteredHoldings.length} of {enrichedHoldings.length} funds</span>
            <span>•</span>
            <span>Invested: <strong className="font-semibold text-foreground font-mono">{formatCurrency(totalMfInvested)}</strong></span>
            <span>•</span>
            <span>Current: <strong className="font-semibold text-foreground font-mono">{formatCurrency(totalMfValue)}</strong></span>
            <span className={`font-semibold font-mono text-xs ${totalMfGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              ({totalMfGain >= 0 ? '+' : ''}{formatCurrency(totalMfGain)} / {totalMfGain >= 0 ? '+' : ''}{totalMfReturnPct.toFixed(2)}%)
            </span>
          </div>

        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {selectedForCompare.length >= 2 && (
            <Button onClick={() => setShowCompareModal(true)} variant="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Scale className="h-4 w-4" /> Compare Selected ({selectedForCompare.length})
            </Button>
          )}
          {selectedForCompare.length > 0 && (
            <Button onClick={() => setSelectedForCompare([])} variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
              Clear Compare
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncGroww}
            disabled={isSyncingGroww}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingGroww ? 'animate-spin' : ''}`} />
            {isSyncingGroww ? 'Syncing...' : 'Sync Fund Metadata'}
          </Button>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search funds by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Section Cards with Section-Specific Category Filters */}
      {Object.entries(groupedMFs).filter(([_, items]) => items.length > 0).map(([groupName, allSectionItems]) => {
        const selectedCat = sectionCategories[groupName] || "ALL";

        const displayItems = selectedCat === "ALL"
          ? allSectionItems
          : allSectionItems.filter(h => h._category === selectedCat);

        const groupInvested = displayItems.reduce((sum, h) => sum + h.investedValue, 0);
        const groupTotal = displayItems.reduce((sum, h) => sum + h.currentValue, 0);
        const groupGain = groupTotal - groupInvested;
        const groupReturnPct = groupInvested > 0 ? (groupGain / groupInvested) * 100 : 0;
        const groupAlloc = totalMfValue > 0 ? (groupTotal / totalMfValue) * 100 : 0;

        // Calculate fund counts per category for this section
        const categoryCountsMap = new Map<string, number>();
        allSectionItems.forEach(h => {
          if (h._category && h._category !== "Uncategorized") {
            categoryCountsMap.set(h._category, (categoryCountsMap.get(h._category) || 0) + 1);
          }
        });

        // Sort categories by number of funds descending (most funds first)
        const sortedCategories = Array.from(categoryCountsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat);

        // Top 3 categories with the most funds for quick-filter pills
        const topCategories = sortedCategories.slice(0, 3);

        return (
          <Card key={groupName} className="overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-6 py-3.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{groupName}</h3>
                <span className="text-xs text-muted-foreground">
                  {displayItems.length === allSectionItems.length
                    ? `${allSectionItems.length} funds`
                    : `Showing ${displayItems.length} of ${allSectionItems.length} funds`}
                  {totalMfValue > 0 ? ` • ${groupAlloc.toFixed(1)}% of MFs` : ''}
                </span>
              </div>

              {/* Section-Level Category Filters: Top 2-3 Quick Pills + All Categories Dropdown */}
              {sortedCategories.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap my-1 md:my-0">
                  {/* Top Quick Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSectionCategory(groupName, "ALL")}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedCat === "ALL"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                        }`}
                    >
                      All ({allSectionItems.length})
                    </button>

                    {topCategories.map((cat) => {
                      const count = categoryCountsMap.get(cat) || 0;
                      const isSelected = selectedCat === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSectionCategory(groupName, cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                            }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown for All Categories */}
                  <Select
                    value={selectedCat}
                    onValueChange={(val) => { if (val) setSectionCategory(groupName, val); }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[165px] bg-background border-border/70">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="ALL">All Categories ({allSectionItems.length})</SelectItem>
                      {sortedCategories.map((cat) => {
                        const count = categoryCountsMap.get(cat) || 0;
                        return (
                          <SelectItem key={cat} value={cat}>
                            {cat} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs md:text-sm shrink-0 ml-auto">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Invested</span>
                  <span className="font-semibold text-foreground font-mono">{formatCurrency(groupInvested)}</span>
                </div>
                <div className="h-6 w-px bg-border my-auto"></div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Current Value</span>
                  <span className="font-semibold text-foreground font-mono">{formatCurrency(groupTotal)}</span>
                </div>
                <div className="h-6 w-px bg-border my-auto"></div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Returns</span>
                  <span className={`font-bold font-mono ${groupGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {groupGain >= 0 ? '+' : ''}{groupReturnPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>


            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={displayItems}
                onRowClick={(row) => setSelectedFund(row)}
              />
            </CardContent>
          </Card>
        );
      })}

      {/* Fund Details Modal */}
      <Dialog open={!!selectedFund} onOpenChange={(open) => !open && setSelectedFund(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto w-full p-0">
          {selectedFund && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 border-b sticky top-0 bg-card/95 backdrop-blur-md z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">{selectedFund.name}</DialogTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{selectedFund.category || "Uncategorized"}</Badge>
                    <Badge variant="outline">{selectedFund.productType}</Badge>
                    <Badge variant="outline">{selectedFund.strategicAssetClass}</Badge>
                    {selectedFund.amc && <Badge variant="outline">AMC: {selectedFund.amc}</Badge>}
                  </div>
                </div>
                <a
                  href={getGrowwUrl(selectedFund, growwCache)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-[var(--bg-muted-dark)] dark:text-indigo-300 border border-indigo-200 dark:border-[var(--bg-highlight-dark)] transition-colors shrink-0 self-start sm:self-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Groww
                </a>
              </DialogHeader>

              <div className="p-6 space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Invested Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(selectedFund.investedValue)}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Current Value</span>
                    <span className="text-2xl font-bold">{formatCurrency(selectedFund.currentValue)}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">Total Gain</span>
                    <span className={`text-2xl font-bold ${selectedFund.absoluteReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {selectedFund.absoluteReturn >= 0 ? "+" : ""}{formatCurrency(selectedFund.absoluteReturn)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground mb-1">XIRR</span>
                    <span className={`text-2xl font-bold ${selectedFund.xirr && selectedFund.xirr >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {selectedFund.xirr ? `${selectedFund.xirr.toFixed(2)}%` : "-"}
                    </span>
                  </div>
                </div>

                {/* Family Ownership Breakdown */}
                {selectedFund.owners && selectedFund.owners.length > 0 && (
                  <div className="p-4 rounded-xl border bg-muted/20 dark:bg-slate-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" /> Family Ownership Breakdown
                      </h4>
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedFund.owners.length} Family Member{selectedFund.owners.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedFund.owners.map((owner, idx) => (
                        <div key={`${owner.ownerId}-${idx}`} className="p-3.5 rounded-lg border bg-card flex flex-col justify-between shadow-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm text-foreground">{owner.ownerName}</span>
                            <Badge variant={owner.percentage === 100 ? "outline" : "secondary"} className="text-[10px] font-mono">
                              {owner.percentage.toFixed(1)}% Share
                            </Badge>
                          </div>
                          <div className="flex justify-between items-baseline text-xs text-muted-foreground mt-1">
                            <span>Invested: {formatCurrency(owner.investedValue)}</span>
                            <span className="font-bold text-foreground text-sm">{formatCurrency(owner.currentValue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Holdings Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Underlying Holdings ({underlyingData?.length || 0})</h3>
                  {underlyingData && underlyingData.length > 0 ? (
                    <DataTable
                      columns={underlyingColumns}
                      data={underlyingData}
                      searchKey="stockName"
                      searchPlaceholder="Search holdings..."
                    />
                  ) : (
                    <div className="text-center py-12 border rounded-lg bg-muted/30">
                      <p className="text-muted-foreground">No holding data available for this fund.</p>
                      <p className="text-sm text-muted-foreground mt-1">Make sure you have run the holdings scraper.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Up to 3 Funds Side-by-Side Comparison Modal */}
      <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-y-auto w-full md:max-w-6xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
              <span>Fund Comparison ({comparedItems.length} Funds Selected)</span>
              <span className="text-xs font-normal text-muted-foreground">Max 3 funds</span>
            </DialogTitle>
          </DialogHeader>

          {comparedItems.length >= 2 ? (
            <div className="space-y-6 mt-4">
              {/* Pairwise Overlap Summary */}
              {pairwiseOverlaps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Portfolio Overlap Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pairwiseOverlaps.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-lg border flex flex-col justify-between ${item.percentage > 40
                            ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-[var(--bg-muted-dark)] dark:border-[var(--bg-highlight-dark)] dark:text-amber-300"
                            : "bg-muted/40 border-border text-foreground"
                          }`}
                      >
                        <span className="text-xs font-medium text-muted-foreground truncate">{item.pair}</span>
                        <div className="flex items-baseline space-x-2 mt-1">
                          <span className="text-2xl font-bold">{item.percentage.toFixed(1)}%</span>
                          <span className="text-xs font-medium">
                            {item.percentage > 40 ? "High Overlap" : item.percentage > 20 ? "Moderate Overlap" : "Low Overlap"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Column Side-by-Side Comparison Table */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-1/4 min-w-[150px] font-semibold text-foreground">Feature / Metric</TableHead>
                      {comparedItems.map((item, idx) => (
                        <TableHead key={idx} className="w-1/3 min-w-[220px] border-l font-semibold text-primary">
                          <div className="flex items-center space-x-2">
                            {item.details?.logo_url && (
                              <img src={item.details.logo_url} alt="Logo" className="w-6 h-6 rounded-full shrink-0" />
                            )}
                            <span className="line-clamp-2">{item.fund?._displayName || item.name}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Category</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l font-medium">
                          <Badge variant="secondary" className="text-xs">
                            {item.fund?._category || item.details?.sub_category || item.details?.category || "N/A"}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">Your Investment</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l">
                          {item.fund ? (
                            <div className="flex flex-col">
                              <span className="font-bold">{formatCurrency(item.fund.currentValue)}</span>
                              <span className="text-xs text-muted-foreground">Invested: {formatCurrency(item.fund.investedValue)}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">Your XIRR / Return</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l">
                          {item.fund ? (
                            <span className={`font-semibold ${item.fund.returnPercentage >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {item.fund.xirr ? `XIRR: ${item.fund.xirr.toFixed(2)}%` : `${item.fund.returnPercentage.toFixed(2)}% abs`}
                            </span>
                          ) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">Fund Size (AUM)</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l">
                          {item.details?.aum ? `₹${(item.details.aum / 10000000).toFixed(2)} Cr` : "-"}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium dark:text-muted-foreground">Expense Ratio</TableCell>
                      {comparedItems.map((item, idx) => {
                        const val = item.details?.expense_ratio;
                        const validRatios = comparedItems.map(c => c.details?.expense_ratio).filter(r => typeof r === 'number') as number[];
                        const minRatio = validRatios.length > 0 ? Math.min(...validRatios) : null;
                        const isBest = minRatio !== null && val === minRatio;

                        return (
                          <TableCell key={idx} className={`border-l ${isBest ? "bg-green-500/10 dark:bg-green-800/10 font-bold text-green-600 dark:text-green-300" : ""}`}>
                            {val ? `${val}%` : "-"} {isBest && validRatios.length > 1 && <span className="text-xs font-normal text-green-600 ml-1">(Lowest)</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">Rating (Groww)</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l">
                          {item.details?.groww_rating ? <span className="font-semibold text-yellow-500">{item.details.groww_rating} ★</span> : "-"}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">Exit Load</TableCell>
                      {comparedItems.map((item, idx) => (
                        <TableCell key={idx} className="border-l text-xs text-muted-foreground">
                          {item.details?.exit_load || "N/A"}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">1-Year Return (Groww)</TableCell>
                      {comparedItems.map((item, idx) => {
                        const ret = getReturn(item.details, '1y');
                        const validReturns = comparedItems.map(c => getReturn(c.details, '1y')).filter(r => typeof r === 'number') as number[];
                        const maxRet = validReturns.length > 0 ? Math.max(...validReturns) : null;
                        const isBest = maxRet !== null && ret === maxRet;

                        return (
                          <TableCell key={idx} className={`border-l ${isBest ? "bg-emerald-500/10 dark:bg-emerald-800/20 font-bold text-emerald-600 dark:text-emerald-300" : ""}`}>
                            {ret ? `${ret.toFixed(2)}%` : "N/A"} {isBest && validReturns.length > 1 && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">(Best)</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">3-Year Return (Annualized)</TableCell>
                      {comparedItems.map((item, idx) => {
                        const ret = getReturn(item.details, '3y');
                        const validReturns = comparedItems.map(c => getReturn(c.details, '3y')).filter(r => typeof r === 'number') as number[];
                        const maxRet = validReturns.length > 0 ? Math.max(...validReturns) : null;
                        const isBest = maxRet !== null && ret === maxRet;

                        return (
                          <TableCell key={idx} className={`border-l ${isBest ? "bg-emerald-500/10 dark:bg-emerald-800/20 font-bold text-emerald-600 dark:text-emerald-300" : ""}`}>
                            {ret ? `${ret.toFixed(2)}%` : "N/A"} {isBest && validReturns.length > 1 && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">(Best)</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-medium">5-Year Return (Annualized)</TableCell>
                      {comparedItems.map((item, idx) => {
                        const ret = getReturn(item.details, '5y');
                        const validReturns = comparedItems.map(c => getReturn(c.details, '5y')).filter(r => typeof r === 'number') as number[];
                        const maxRet = validReturns.length > 0 ? Math.max(...validReturns) : null;
                        const isBest = maxRet !== null && ret === maxRet;

                        return (
                          <TableCell key={idx} className={`border-l ${isBest ? "bg-emerald-500/10 dark:bg-emerald-800/20 font-bold text-emerald-600 dark:text-emerald-300" : ""}`}>
                            {ret ? `${ret.toFixed(2)}%` : "N/A"} {isBest && validReturns.length > 1 && <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">(Best)</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>

                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Please select at least 2 funds using the checkboxes in the table to compare them side-by-side.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
