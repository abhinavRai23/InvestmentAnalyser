"use client";

import { useMemo } from "react";
import { usePortfolioStore, useFilteredHoldings } from "@/store/portfolioStore";
import { scoreHoldings, ActionType } from "@/lib/scoringEngine";
import { analyzeConcentrationRisk } from "@/lib/analytics";
import { findDuplicateInvestments } from "@/lib/duplicateEngine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency, formatDateIndian } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  Landmark,
  Wallet,
  Zap,
  Layers,
  BellRing,
  UserCheck
} from "lucide-react";

const actionStyles: Record<ActionType, { color: string; icon: any }> = {
  EXIT: { color: "bg-rose-600 hover:bg-rose-700 text-white", icon: AlertCircle },
  REDUCE: { color: "bg-amber-600 hover:bg-amber-700 text-white", icon: TrendingDown },
  REVIEW: { color: "bg-blue-600 hover:bg-blue-700 text-white", icon: ArrowRight },
  KEEP: { color: "bg-emerald-600 hover:bg-emerald-700 text-white", icon: ShieldCheck },
};

export function ActionCenter() {
  const { data, filters } = usePortfolioStore();
  const holdings = useFilteredHoldings();
  const rawCustomAssets = data?.customAssets || [];
  const people = data?.people || [];

  const selectedOwnerIds = useMemo(() => {
    return filters.selectedOwnerIds || (filters.ownerId === 'ALL' ? ['ALL'] : [filters.ownerId]);
  }, [filters.selectedOwnerIds, filters.ownerId]);

  const isAllSelected = useMemo(() => {
    return selectedOwnerIds.includes('ALL') ||
      selectedOwnerIds.length === 0 ||
      (people.length > 0 && selectedOwnerIds.length === people.length);
  }, [selectedOwnerIds, people]);

  const isFamilyView = selectedOwnerIds.includes('ALL') || selectedOwnerIds.length > 1;

  // Selected member display label for header
  const activeMemberLabel = useMemo(() => {
    if (isAllSelected) return "Entire Family";
    const selectedPeople = people.filter(p => selectedOwnerIds.includes(p.id));
    if (selectedPeople.length === 1) return selectedPeople[0].name;
    return `${selectedPeople.length} Selected Members`;
  }, [isAllSelected, people, selectedOwnerIds]);

  // Filter customAssets by selectedOwnerIds so Bank Min Balance & FD Maturity honor family/member filter!
  const customAssets = useMemo(() => {
    if (isAllSelected) return rawCustomAssets;
    return rawCustomAssets.filter(ca => selectedOwnerIds.includes(ca.ownerId));
  }, [rawCustomAssets, selectedOwnerIds, isAllSelected]);

  // Unaggregated holdings filtered by selectedOwnerIds for cross-member duplicate detection
  const unaggregatedMarketHoldings = useMemo(() => {
    if (!data?.holdings) return [];
    const ownerIds = isAllSelected ? undefined : selectedOwnerIds;
    return data.holdings.filter(h => (!ownerIds || ownerIds.includes(h.ownerId)) && (h.assetType === "mutual_fund" || h.assetType === "stock"));
  }, [data?.holdings, selectedOwnerIds, isAllSelected]);

  // 1. Scoring Engine Recommendations
  const recommendations = useMemo(() => {
    if (!people.length) return [];
    return scoreHoldings(holdings, people);
  }, [holdings, people]);

  const actionableItems = useMemo(() => {
    return recommendations.filter(r => r.action !== 'KEEP');
  }, [recommendations]);

  const healthyItemsCount = recommendations.length - actionableItems.length;

  // 2. Concentration Risk Alerts
  const concentrationAlerts = useMemo(() => {
    if (!data?.mfHoldings) return [];
    const marketHoldings = holdings.filter(h => h.assetType === "mutual_fund" || h.assetType === "stock");
    return analyzeConcentrationRisk(marketHoldings, data.mfHoldings);
  }, [holdings, data?.mfHoldings]);

  // 3. Duplicate Family Investment Alerts (uses unaggregated holdings)
  const duplicateAlerts = useMemo(() => {
    if (!people.length || !isFamilyView) return [];
    return findDuplicateInvestments(unaggregatedMarketHoldings, people);
  }, [unaggregatedMarketHoldings, people, isFamilyView]);

  // 4. Bank Minimum Balance Alerts (uses filtered customAssets)
  const minBalanceAlerts = useMemo(() => {
    return customAssets.filter(asset => {
      if (asset.category !== "Savings Account") return false;
      if (typeof asset.minimumBalance !== "number") return false;
      return asset.currentValue < asset.minimumBalance;
    });
  }, [customAssets]);

  // 5. FD Maturity Alerts (uses filtered customAssets)
  const fdMaturityAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matured: typeof customAssets = [];
    const maturing1M: typeof customAssets = [];
    const maturing6M: typeof customAssets = [];

    customAssets.forEach(asset => {
      if (asset.category !== "FD") return;
      if (!asset.maturityDate || asset.maturityDate.toLowerCase() === "indefinite" || asset.maturityDate === "N/A") return;

      const dateObj = new Date(asset.maturityDate);
      if (isNaN(dateObj.getTime())) return;

      if (dateObj < today) {
        matured.push(asset);
      } else {
        const diffMs = dateObj.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          maturing1M.push(asset);
        } else if (diffDays <= 180) {
          maturing6M.push(asset);
        }
      }
    });

    return { matured, maturing1M, maturing6M };
  }, [customAssets]);

  const totalCriticalAlertsCount =
    actionableItems.length +
    concentrationAlerts.length +
    duplicateAlerts.length +
    minBalanceAlerts.length +
    fdMaturityAlerts.matured.length +
    fdMaturityAlerts.maturing1M.length +
    fdMaturityAlerts.maturing6M.length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview Cards */}
      <Card className="bg-card border-indigo-500/20">
        <CardHeader className="py-4 border-b bg-indigo-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <BellRing className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Action Center & Portfolio Risk Hub</CardTitle>
                <CardDescription className="text-xs">
                  Unified Intelligence: Exit/Reduce recommendations, concentration risks, duplicate holdings, min balance warnings & FD maturity trackers.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold bg-background px-3 py-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                👤 Filter: {activeMemberLabel}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold bg-background px-3 py-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                {totalCriticalAlertsCount} Actionable Items
              </Badge>
              <Badge variant="secondary" className="text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {healthyItemsCount} Healthy (KEEP)
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>


      {/* SECTION 1: BANK MINIMUM BALANCE & FD MATURITY ALERTS */}
      {(minBalanceAlerts.length > 0 || fdMaturityAlerts.matured.length > 0 || fdMaturityAlerts.maturing1M.length > 0 || fdMaturityAlerts.maturing6M.length > 0) && (
        <Card className="border-rose-500/30 overflow-hidden shadow-2xs">
          <CardHeader className="py-3 px-5 border-b bg-rose-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Landmark className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <CardTitle className="text-base font-bold">1. Bank Minimum Balance & FD Maturity Alerts</CardTitle>
              </div>
              <Badge variant="destructive" className="text-xs font-bold">
                {minBalanceAlerts.length + fdMaturityAlerts.matured.length + fdMaturityAlerts.maturing1M.length + fdMaturityAlerts.maturing6M.length} Critical Alerts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Savings Accounts Below Minimum Balance */}
            {minBalanceAlerts.map(asset => {
              const ownerName = people.find(p => p.id === asset.ownerId)?.name || asset.ownerId;
              const minBal = asset.minimumBalance || 0;
              const diff = minBal - asset.currentValue;

              return (
                <Alert key={asset.id} variant="destructive" className="border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/40 text-foreground">
                  <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <AlertTitle className="font-bold flex items-center justify-between">
                    <span>🚨 Minimum Balance Non-Maintenance Risk ({asset.institution})</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">👤 {ownerName}</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground">
                    Current balance is <strong className="text-rose-600 font-mono">{formatCurrency(asset.currentValue)}</strong>, which is <strong className="text-rose-600 font-mono">{formatCurrency(diff)} below</strong> the required minimum threshold of <strong className="font-mono">{formatCurrency(minBal)}</strong>. Please deposit funds to avoid quarterly bank penalty charges!
                  </AlertDescription>
                </Alert>
              );
            })}

            {/* Already Matured FDs (Dark Red Alert) */}
            {fdMaturityAlerts.matured.map(asset => {
              const ownerName = people.find(p => p.id === asset.ownerId)?.name || asset.ownerId;

              return (
                <Alert key={asset.id} variant="destructive" className="border-rose-700/60 bg-rose-950/20 dark:bg-rose-950/50 text-foreground border-l-4 border-l-rose-700">
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <AlertTitle className="font-bold flex items-center justify-between">
                    <span className="text-rose-700 dark:text-rose-300 font-extrabold">🚨 FD Already Matured — Immediate Action Needed! ({asset.institution})</span>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-300">👤 {ownerName}</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground">
                    This Fixed Deposit matured on <strong className="font-semibold text-foreground">{formatDateIndian(asset.maturityDate)}</strong> (Current Value: <strong className="font-mono text-foreground">{formatCurrency(asset.currentValue)}</strong> @ {asset.interestRate}% p.a.). Reinvest or redeem to avoid zero/saving-rate interest!
                  </AlertDescription>
                </Alert>
              );
            })}

            {/* FDs Maturing within 1 Month (Light Red Alert) */}
            {fdMaturityAlerts.maturing1M.map(asset => {
              const ownerName = people.find(p => p.id === asset.ownerId)?.name || asset.ownerId;

              return (
                <Alert key={asset.id} className="border-rose-400/60 bg-rose-500/10 dark:bg-rose-950/30 text-foreground border-l-4 border-l-rose-400">
                  <Zap className="h-4 w-4 text-rose-500" />
                  <AlertTitle className="font-bold flex items-center justify-between text-rose-800 dark:text-rose-300">
                    <span>⚠️ FD Maturing in &lt;1 Month ({asset.institution})</span>
                    <span className="font-mono font-bold text-rose-800 dark:text-rose-300">👤 {ownerName}</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground">
                    Maturing on <strong className="font-semibold text-foreground">{formatDateIndian(asset.maturityDate)}</strong> (Principal: <strong className="font-mono text-foreground">{formatCurrency(asset.currentValue)}</strong> @ {asset.interestRate}% p.a.). Prepare liquidity or renewal instructions.
                  </AlertDescription>
                </Alert>
              );
            })}

            {/* FDs Maturing within 6 Months (Yellow / Amber Alert) */}
            {fdMaturityAlerts.maturing6M.map(asset => {
              const ownerName = people.find(p => p.id === asset.ownerId)?.name || asset.ownerId;

              return (
                <Alert key={asset.id} className="border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/40 text-foreground border-l-4 border-l-amber-400">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="font-bold flex items-center justify-between text-amber-800 dark:text-amber-300">
                    <span>⚡ FD Maturing in &lt;6 Months ({asset.institution})</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">👤 {ownerName}</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-muted-foreground">
                    Maturing on <strong className="font-semibold text-foreground">{formatDateIndian(asset.maturityDate)}</strong> (Principal: <strong className="font-mono text-foreground">{formatCurrency(asset.currentValue)}</strong> @ {asset.interestRate}% p.a.). Plan your reinvestment schedule.
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: ACTIONABLE HOLDING RECOMMENDATIONS (SCORING ENGINE) */}
      <Card className="overflow-hidden shadow-2xs border-indigo-500/20">
        <CardHeader className="py-3 px-5 border-b bg-indigo-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-base font-bold">2. Actionable Holding Recommendations (Scoring Engine)</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-semibold bg-background">
              {actionableItems.length} Recommendations
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {actionableItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Your investment holdings look healthy! No immediate EXIT or REDUCE actions required.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-muted/40 uppercase font-semibold text-muted-foreground">
                  <TableRow>
                    <TableHead className="w-48">Asset Name</TableHead>
                    <TableHead className="w-32 text-right">Current Value</TableHead>
                    <TableHead className="w-28 text-center">Action</TableHead>
                    <TableHead className="w-24 text-center">Score</TableHead>
                    <TableHead>Reasoning & Insights</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {actionableItems.map((rec) => {
                    const ActionIcon = actionStyles[rec.action].icon;
                    return (
                      <TableRow key={rec.holdingId} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground">
                          {rec.holdingName}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {formatCurrency(rec.currentValue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${actionStyles[rec.action].color} mx-auto flex items-center justify-center gap-1 text-[10px] py-0.5 px-2 font-bold`}>
                            <ActionIcon className="h-3 w-3 shrink-0" />
                            {rec.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          <span className={`font-extrabold ${rec.score < 50 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {rec.score}/100
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <ul className="list-disc pl-4 space-y-0.5">
                            {rec.reasons.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: CONCENTRATION & OVEREXPOSURE RISKS */}
      <Card className="overflow-hidden shadow-2xs border-amber-500/20">
        <CardHeader className="py-3 px-5 border-b bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base font-bold">3. Concentration & Sector Overexposure Risks</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-semibold bg-background">
              {concentrationAlerts.length} Risk Alerts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {concentrationAlerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No major concentration risks detected (&gt;25% single stock or &gt;30% sector allocation).
            </div>
          ) : (
            concentrationAlerts.map((alert, idx) => (
              <Alert key={idx} variant={alert.level === 'high' ? 'destructive' : 'default'} className={alert.level === 'medium' ? 'border-amber-500/50 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60' : ''}>
                {alert.level === 'high' ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle className="font-bold">{alert.title}</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  {alert.description}
                  <div className="mt-1.5 font-bold font-mono">
                    Concentrated Allocation Value: {formatCurrency(alert.value)}
                  </div>
                </AlertDescription>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: DUPLICATE FAMILY HOLDINGS */}
      {isFamilyView && (
        <Card className="overflow-hidden shadow-2xs border-purple-500/20">
          <CardHeader className="py-3 px-5 border-b bg-purple-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-base font-bold">4. Duplicate Family Holdings (Cross-Member Overlaps)</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-semibold bg-background">
                {duplicateAlerts.length} Duplicate Assets
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {duplicateAlerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No duplicate holdings found across family members.
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateAlerts.map((dup, i) => (
                  <div key={i} className="border rounded-lg p-3.5 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-foreground">{dup.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{dup.type}</Badge>
                      </div>
                      <span className="text-xs font-extrabold text-foreground font-mono">
                        Combined Total: {formatCurrency(dup.totalValue)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dup.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t">
                      {dup.items.map((item, j) => (
                        <div key={j} className="text-xs p-2 rounded bg-muted/40 flex items-center justify-between">
                          <span className="font-medium text-foreground truncate max-w-[160px]">👤 {item.ownerName} ({item.holdingName})</span>
                          <span className="font-mono font-bold shrink-0">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
