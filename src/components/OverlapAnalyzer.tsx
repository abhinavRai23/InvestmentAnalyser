"use client";

import { usePortfolioStore, useFilteredHoldings } from "@/store/portfolioStore";
import { getTopCompaniesAndIndustries } from "@/lib/analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useGrowwCache, resolveDisplayName } from "@/hooks/useGrowwCache";

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export function OverlapAnalyzer() {
  const { data } = usePortfolioStore();
  const holdings = useFilteredHoldings().filter(h => h.assetType === "mutual_fund" || h.assetType === "stock");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { cache: growwCache } = useGrowwCache();

  const companyData = useMemo(() => {
    if (!data?.mfHoldings) return [];
    const { topCompanies } = getTopCompaniesAndIndustries(holdings, data.mfHoldings);
    return topCompanies;
  }, [holdings, data?.mfHoldings]);

  const filteredCompanyData = useMemo(() => {
    if (!searchQuery) return companyData;
    const lowerQuery = searchQuery.toLowerCase();
    return companyData.filter(stock => 
      stock.name.toLowerCase().includes(lowerQuery) || 
      (stock.sector && stock.sector.toLowerCase().includes(lowerQuery))
    );
  }, [companyData, searchQuery]);

  const selectedStockDetails = selectedStock ? companyData.find(s => s.name === selectedStock) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Direct Stock + Mutual Fund Overlap</CardTitle>
          <CardDescription>
            Analyzes the underlying stocks across all your selected Mutual Funds and combines them with your Direct Stock holdings.
            Shows exactly where your money is actually invested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <input
              placeholder="Filter stocks or sectors..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="max-w-sm flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock Name</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Direct Holding</TableHead>
                  <TableHead className="text-right">Indirect (MF)</TableHead>
                  <TableHead className="text-right text-primary font-bold">Total Exposure</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      No overlap data found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  // Top 50 stocks by default
                  filteredCompanyData.slice(0, 50).map((stock) => (
                    <TableRow key={stock.name}>
                      <TableCell className="font-medium">
                        {stock.name}
                        {stock.directExposure > 0 && stock.indirectExposure > 0 && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Overlap</Badge>
                        )}
                      </TableCell>
                      <TableCell>{stock.sector || "-"}</TableCell>
                      <TableCell className="text-right">{stock.directExposure > 0 ? formatCurrency(stock.directExposure) : "-"}</TableCell>
                      <TableCell className="text-right">{stock.indirectExposure > 0 ? formatCurrency(stock.indirectExposure) : "-"}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(stock.totalExposure)}</TableCell>
                      <TableCell className="text-right">
                        {(stock.fundsHolding && stock.fundsHolding.length > 0) ? (
                          <Button variant="outline" size="sm" onClick={() => setSelectedStock(stock.name)}>
                            {stock.fundsHolding.length} Funds
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground pr-4">Direct Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStock} onOpenChange={(o) => !o && setSelectedStock(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{selectedStock}</DialogTitle>
            <DialogDescription>
              Breakdown of how your capital is exposed to this stock.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-0 mt-4">
            {selectedStockDetails ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Effective Exposure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStockDetails.directExposure > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold text-primary">Direct Stock Holding</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(selectedStockDetails.directExposure)}</TableCell>
                    </TableRow>
                  )}
                  {selectedStockDetails.fundsHolding?.map((fund, i) => {
                    const isArbitrage = fund.fundName.toLowerCase().includes('arbitrage');
                    return (
                      <TableRow key={i}>
                        <TableCell className={`font-medium ${isArbitrage ? 'text-xs text-muted-foreground' : ''}`}>
                          {resolveDisplayName({ name: fund.fundName }, growwCache)}
                        </TableCell>
                        <TableCell className="text-right">{fund.weightInFund.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(fund.effectiveValueFromFund)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
