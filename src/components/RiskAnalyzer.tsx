"use client";

import { usePortfolioStore, useFilteredHoldings } from "@/store/portfolioStore";
import { analyzeConcentrationRisk } from "@/lib/analytics";
import { findDuplicateInvestments } from "@/lib/duplicateEngine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export function RiskAnalyzer() {
  const { data, filters } = usePortfolioStore();
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

  // Filtered aggregated holdings for concentration risk
  const holdings = useFilteredHoldings().filter(h => h.assetType === "mutual_fund" || h.assetType === "stock");

  // Unaggregated market holdings for duplicate cross-member detection
  const unaggregatedMarketHoldings = useMemo(() => {
    if (!data?.holdings) return [];
    const ownerIds = isAllSelected ? undefined : selectedOwnerIds;
    return data.holdings.filter(h => (!ownerIds || ownerIds.includes(h.ownerId)) && (h.assetType === "mutual_fund" || h.assetType === "stock"));
  }, [data?.holdings, selectedOwnerIds, isAllSelected]);

  const alerts = useMemo(() => {
    if (!data?.mfHoldings) return [];
    return analyzeConcentrationRisk(holdings, data.mfHoldings);
  }, [holdings, data?.mfHoldings]);

  const duplicates = useMemo(() => {
    if (!people.length || !isFamilyView) return [];
    return findDuplicateInvestments(unaggregatedMarketHoldings, people);
  }, [unaggregatedMarketHoldings, people, isFamilyView]);


  return (
    <div className="space-y-6">
      {!isFamilyView && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Individual View</AlertTitle>
          <AlertDescription>
            You are viewing risks for an individual portfolio. For "Family Insights" (finding duplicates across family members), please select "Entire Family" in the top right.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Concentration Risk */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Concentration Risk</CardTitle>
            <CardDescription>
              Highlights areas where your portfolio is heavily overexposed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {alerts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground border rounded-md">
                No major concentration risks detected.
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, idx) => (
                  <Alert key={idx} variant={alert.level === 'high' ? 'destructive' : 'default'} className={alert.level === 'medium' ? 'border-amber-500/50 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60' : ''}>
                    {alert.level === 'high' ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription className="mt-1">
                      {alert.description}
                      <div className="mt-2 font-medium">
                        Value: {formatCurrency(alert.value)}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duplicate & Similar Investments */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Duplicate & Similar Investments</CardTitle>
            <CardDescription>
              {isFamilyView
                ? "Identifies overlapping funds or exact same stocks held by multiple family members."
                : "Identifies overlapping funds or exact same stocks held in multiple accounts."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {duplicates.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground border rounded-md">
                No duplicate investments found.
              </div>
            ) : (
              <div className="space-y-6">
                {duplicates.map((dup, idx) => (
                  <div key={idx} className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-4 py-3 border-b">
                      <h4 className="font-semibold text-sm">{dup.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{dup.description}</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Owner</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dup.items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{item.ownerName}</TableCell>
                            <TableCell>{item.holdingName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
