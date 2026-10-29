"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePortfolioStore, useFilteredHoldings } from "@/store/portfolioStore";
import { getPortfolioSummary, getAllocationByStrategicAssetClass, getAllocationByProductType, getAllocationByPerson } from "@/lib/engine";
import { getTopCompaniesAndIndustries } from "@/lib/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MutualFundAnalyzer } from "./MutualFundAnalyzer";
import { DirectStocksAnalyzer } from "./DirectStocksAnalyzer";
import { CustomAssetsManager } from "./CustomAssetsManager";
import { OverlapAnalyzer } from "./OverlapAnalyzer";
import { RiskAnalyzer } from "./RiskAnalyzer";
import { ActionCenter } from "./ActionCenter";
import { ThemeToggle } from "@/components/ThemeToggle";

import { KeyMetrics } from "./dashboard/KeyMetrics";
import { AllocationCharts } from "./dashboard/AllocationCharts";
import { ExposureCharts } from "./dashboard/ExposureCharts";
import { GlobalFilters } from "./dashboard/GlobalFilters";
import { ReportUploadModal } from "./ReportUploadModal";
import { MarketTicker } from "./MarketTicker";
import { useGrowwCache } from "@/hooks/useGrowwCache";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileSpreadsheet, Sparkles, Download, LogOut } from "lucide-react";


export function Dashboard() {
  const {
    data,
    filters,
    setFilter,
    resetFilters,
    isSyncing,
    syncLivePrices,
    exportPortfolioBackup,
    clearPortfolio
  } = usePortfolioStore();
  const { sync: syncGroww, isSyncing: isSyncingGroww } = useGrowwCache();
  const holdings = useFilteredHoldings();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTabState] = useState<string>(initialTab);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSyncingCombined, setIsSyncingCombined] = useState(false);

  const handleSyncAll = async () => {
    if (!data?.holdings || isSyncingCombined || isSyncing || isSyncingGroww) return;
    setIsSyncingCombined(true);
    try {
      const holdingsToSync = data.holdings.map(h => ({ name: h.name, isin: h.isin }));
      // Execute both API calls in parallel:
      // 1. Live stock prices & MF NAVs (/api/enrich via syncLivePrices)
      // 2. Groww fund intelligence & scheme metadata (/api/groww/sync via syncGroww)
      await Promise.all([
        syncLivePrices(),
        syncGroww(holdingsToSync)
      ]);
    } catch (err) {
      console.error("Error executing combined parallel sync", err);
    } finally {
      setIsSyncingCombined(false);
    }
  };

  const isSyncingAny = isSyncing || isSyncingGroww || isSyncingCombined;


  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectedOwnerIds = useMemo(() => {
    return filters.selectedOwnerIds || (filters.ownerId === 'ALL' ? ['ALL'] : [filters.ownerId]);
  }, [filters.selectedOwnerIds, filters.ownerId]);

  const isMultiOrAll = useMemo(() => {
    return selectedOwnerIds.includes('ALL') || selectedOwnerIds.length > 1 || selectedOwnerIds.length === 0;
  }, [selectedOwnerIds]);

  const rawFilteredHoldings = useMemo(() => {
    if (!data) return [];
    const isAllSelected = selectedOwnerIds.includes('ALL') ||
      selectedOwnerIds.length === 0 ||
      (data.people.length > 0 && selectedOwnerIds.length === data.people.length);
    const ownerIds = isAllSelected ? undefined : selectedOwnerIds;
    return data.holdings.filter(h => !ownerIds || ownerIds.includes(h.ownerId));
  }, [data, selectedOwnerIds]);

  const summary = useMemo(() => getPortfolioSummary(holdings), [holdings]);
  const strategicAlloc = useMemo(() => getAllocationByStrategicAssetClass(holdings), [holdings]);
  const productAlloc = useMemo(() => getAllocationByProductType(holdings), [holdings]);
  const personAlloc = useMemo(() => getAllocationByPerson(holdings, data?.people || []), [holdings, data?.people]);
  const { topCompanies, topIndustries } = useMemo(() => getTopCompaniesAndIndustries(holdings, data?.mfHoldings || {}), [holdings, data?.mfHoldings]);

  if (!data) return <div>Loading...</div>;

  const showMfTabs = ['ALL', 'mutual_fund', 'etf'].includes(filters.assetType);
  const showDirectStocks = ['ALL', 'stock', 'etf', 'sgb', 'gold', 'silver'].includes(filters.assetType);
  const showRisk = ['ALL', 'mutual_fund', 'stock', 'etf'].includes(filters.assetType);
  const showAction = ['ALL', 'mutual_fund', 'stock', 'etf'].includes(filters.assetType);
  const showExposure = filters.assetType !== 'sgb' && filters.assetType !== 'gold' && filters.assetType !== 'silver';
  const isValidTab = !(
    (activeTab === 'mutual-funds' && !showMfTabs) ||
    (activeTab === 'overlap' && !showMfTabs) ||
    (activeTab === 'direct-stocks' && !showDirectStocks) ||
    (activeTab === 'risk' && !showRisk) ||
    (activeTab === 'action' && !showAction)
  );

  const currentTab = isValidTab ? activeTab : 'overview';

  return (
    <div className="w-full space-y-0">
      {/* Live Market Ticker Bar (Sensex, Nifty, Gold 10g, Silver 1kg, USD/INR) - Full Width Sticky Top */}
      <MarketTicker />

      {/* Full-Width Main Content Container */}
      <div className="w-full px-4 sm:px-6 pt-3 space-y-4">
        {/* Streamlined Single-Line Control Toolbar */}
        <div className="bg-card border border-border/80 rounded-xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2 flex-1">
            <GlobalFilters
              people={data.people}
              selectedOwnerIds={selectedOwnerIds}
              setSelectedOwnerIds={(ids) => setFilter('selectedOwnerIds', ids)}
              assetType={filters.assetType}
              setAssetType={(v) => setFilter('assetType', v)}
            />

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              title="Import Groww Excel statement files (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Import Statements (.xlsx)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={isSyncingAny}
              className="h-8 text-xs gap-1.5 bg-background border-border hover:bg-muted font-medium shadow-2xs"
              title="Fires parallel requests to sync live stock prices & NAVs (/api/enrich) AND Groww scheme metadata & intelligence (/api/groww/sync)."
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAny ? 'animate-spin text-emerald-500' : 'text-primary'}`} />
              {isSyncingAny ? 'Syncing All Data...' : 'Sync Prices & Groww Metadata'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportPortfolioBackup}
              className="h-8 text-xs gap-1.5 bg-background border-border hover:bg-muted font-medium shadow-2xs text-muted-foreground hover:text-foreground"
              title="Download a full backup of all holdings, bank accounts, and FDs (.json)"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              <span>Export Backup (.json)</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Switch or clear portfolio? Make sure you have exported a backup if you want to keep your data.")) {
                  clearPortfolio();
                }
              }}
              className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Clear current portfolio from browser and load a new one"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>New Portfolio</span>
            </Button>
          </div>

          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-muted-foreground transition-colors shrink-0"
          >
            Reset Filters
          </button>
        </div>

        <ReportUploadModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} />

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap w-full mb-4 h-auto p-1 bg-muted/60 dark:bg-muted/40 rounded-xl dark:border dark:border-border/60 gap-1">
            <TabsTrigger value="overview" className="flex-1 font-semibold">Overview</TabsTrigger>
            {showDirectStocks && <TabsTrigger value="direct-stocks" className="flex-1 font-semibold">Direct Stocks</TabsTrigger>}
            {showMfTabs && <TabsTrigger value="mutual-funds" className="flex-1 font-semibold">Mutual Funds</TabsTrigger>}
            <TabsTrigger value="fixed-assets" className="flex-1 font-semibold">Bank, FD & Pension Assets</TabsTrigger>
            {showAction && <TabsTrigger value="action" className="flex-1 font-semibold">Action Center & Risk Hub</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <KeyMetrics summary={summary} />

            <AllocationCharts
              strategicAlloc={strategicAlloc}
              productAlloc={productAlloc}
              personAlloc={personAlloc}
              showPersonAlloc={isMultiOrAll}
              holdings={holdings}
            />

            {showExposure && (
              <ExposureCharts
                topIndustries={topIndustries}
                topCompanies={topCompanies}
              />
            )}
          </TabsContent>

          <TabsContent value="direct-stocks" className="space-y-6">
            <DirectStocksAnalyzer />
          </TabsContent>
          <TabsContent value="mutual-funds" className="space-y-6">
            <MutualFundAnalyzer />
          </TabsContent>
          <TabsContent value="fixed-assets" className="space-y-6">
            <CustomAssetsManager />
          </TabsContent>
          <TabsContent value="action" className="space-y-6">
            <ActionCenter />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
