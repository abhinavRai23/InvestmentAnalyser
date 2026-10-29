import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, LabelList, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyExposure, IndustryExposure } from "@/lib/analytics";
import { useGrowwCache, resolveDisplayName } from "@/hooks/useGrowwCache";

import { Badge } from "@/components/ui/badge";

interface ExposureChartsProps {
  topIndustries: IndustryExposure[];
  topCompanies: CompanyExposure[];
}

export function ExposureCharts({ topIndustries, topCompanies }: ExposureChartsProps) {
  const [selectedCompany, setSelectedCompany] = useState<CompanyExposure | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryExposure | null>(null);
  const { cache: growwCache } = useGrowwCache();

  const customTooltipFormatter = (value: any, name: any, props: any) => {
    const totalExposure = props.payload.totalExposure;
    return [formatCurrency(totalExposure), `Total Exposure (${value.toFixed(1)}%)`];
  };

  const renderCustomAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const maxLength = 18;
    const displayName = payload.value.length > maxLength ? payload.value.substring(0, maxLength) + "..." : payload.value;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{payload.value}</title>
        <text 
          x={0} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fontSize={12} 
          className="fill-slate-700 dark:fill-slate-200 font-medium cursor-pointer hover:font-bold hover:fill-primary transition-colors"
        >
          {displayName}
        </text>
      </g>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {topIndustries.length > 0 && (
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Industries (Direct + MF)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-0">
            <div style={{ height: Math.max(300, topIndustries.length * 35) }} className="w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIndustries} layout="vertical" margin={{ left: 30, right: 40 }}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis dataKey="sector" type="category" width={120} tick={renderCustomAxisTick} />
                  <Tooltip 
                    formatter={customTooltipFormatter}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)", rx: 4 }}
                    contentStyle={{ 
                      backgroundColor: "var(--popover)", 
                      borderColor: "var(--border)", 
                      borderRadius: "8px", 
                      color: "var(--popover-foreground)",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                    }}
                    itemStyle={{ color: "var(--popover-foreground)", fontWeight: 500 }}
                    labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => setSelectedIndustry(data.payload as IndustryExposure)} className="cursor-pointer transition-all hover:opacity-90 hover:brightness-110">
                    {topIndustries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" />
                    ))}
                    <LabelList dataKey="percentage" position="right" formatter={(val: any) => `${Number(val || 0).toFixed(1)}%`} fontSize={12} className="fill-slate-700 dark:fill-slate-200 font-medium" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {topCompanies.length > 0 && (
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Companies (Direct + MF)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-0">
            <div style={{ height: Math.max(300, topCompanies.length * 35) }} className="w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompanies} layout="vertical" margin={{ left: 30, right: 40 }}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis dataKey="name" type="category" width={120} tick={renderCustomAxisTick} />
                  <Tooltip 
                    formatter={customTooltipFormatter}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)", rx: 4 }}
                    contentStyle={{ 
                      backgroundColor: "var(--popover)", 
                      borderColor: "var(--border)", 
                      borderRadius: "8px", 
                      color: "var(--popover-foreground)",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                    }}
                    itemStyle={{ color: "var(--popover-foreground)", fontWeight: 500 }}
                    labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => setSelectedCompany(data.payload as CompanyExposure)} className="cursor-pointer transition-all hover:opacity-90 hover:brightness-110">
                    {topCompanies.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#8b5cf6" />
                    ))}
                    <LabelList dataKey="percentage" position="right" formatter={(val: any) => `${Number(val || 0).toFixed(1)}%`} fontSize={12} className="fill-slate-700 dark:fill-slate-200 font-medium" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Breakdown Modal */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto w-full p-0">
          {selectedCompany && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 border-b sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <DialogTitle className="text-2xl font-bold tracking-tight">{selectedCompany.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed company exposure breakdown across direct stocks & mutual funds
                </p>
              </DialogHeader>

              <div className="p-6 space-y-6">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Portfolio Weight</span>
                    <span className="text-2xl font-bold text-primary">{selectedCompany.percentage?.toFixed(2)}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Effective Value</span>
                    <span className="text-2xl font-bold text-foreground">{formatCurrency(selectedCompany.totalExposure)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Exposure Sources</span>
                    <span className="text-2xl font-bold text-foreground">
                      {(selectedCompany.directExposure > 0 ? 1 : 0) + selectedCompany.fundsHolding.length} Source{(selectedCompany.directExposure > 0 ? 1 : 0) + selectedCompany.fundsHolding.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Direct Holding Section */}
                {selectedCompany.directExposure > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      Direct Stock Holding
                    </h4>
                    <div className="p-4 rounded-xl border bg-muted/20 dark:bg-slate-800/40 hover:bg-muted/30 dark:hover:bg-slate-800/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-foreground">Direct Stock Portfolio</span>
                        <Badge variant="default" className="text-[10px] uppercase">Direct Stock</Badge>
                      </div>
                      <div className="flex items-center space-x-4 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="font-bold text-foreground text-base block">{formatCurrency(selectedCompany.directExposure)}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {(((selectedCompany.directExposure / selectedCompany.totalExposure) * (selectedCompany.percentage || 0))).toFixed(2)}% of total portfolio
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mutual Funds Section */}
                {selectedCompany.fundsHolding.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      Via Mutual Funds & ETFs ({selectedCompany.fundsHolding.length})
                    </h4>
                    <div className="space-y-2.5">
                      {[...selectedCompany.fundsHolding].sort((a, b) => b.effectiveValueFromFund - a.effectiveValueFromFund).map((fund, idx) => {
                        const shareOfCompanyPercent = (fund.effectiveValueFromFund / selectedCompany.totalExposure) * (selectedCompany.percentage || 0);
                        return (
                          <div 
                            key={idx} 
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/20 dark:bg-slate-800/40 hover:bg-muted/30 dark:hover:bg-slate-800/60 hover:border-primary/40 transition-all gap-3"
                          >
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {resolveDisplayName({ name: fund.fundName }, growwCache)}
                                </span>
                                <Badge variant="secondary" className="text-[10px] uppercase">Mutual Fund</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Weight inside fund: <strong className="text-foreground font-mono">{fund.weightInFund.toFixed(2)}%</strong>
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 self-end sm:self-auto">
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-foreground text-base">
                                  {formatCurrency(fund.effectiveValueFromFund)}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {shareOfCompanyPercent.toFixed(2)}% of total portfolio
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Industry Breakdown Modal */}
      <Dialog open={!!selectedIndustry} onOpenChange={(open) => !open && setSelectedIndustry(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto w-full p-0">
          {selectedIndustry && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 border-b sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <DialogTitle className="text-2xl font-bold tracking-tight">{selectedIndustry.sector} Industry Breakdown</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed sector exposure across direct stocks & mutual funds
                </p>
              </DialogHeader>

              <div className="p-6 space-y-6">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Portfolio Weight</span>
                    <span className="text-2xl font-bold text-primary">{selectedIndustry.percentage?.toFixed(2)}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Effective Value</span>
                    <span className="text-2xl font-bold text-foreground">{formatCurrency(selectedIndustry.totalExposure)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Holdings Count</span>
                    <span className="text-2xl font-bold text-foreground">
                      {(selectedIndustry.directHolding?.length || 0) + (selectedIndustry.fundsHolding?.length || 0)} Holding{(selectedIndustry.directHolding?.length || 0) + (selectedIndustry.fundsHolding?.length || 0) > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Direct Stocks Section */}
                {selectedIndustry.directHolding?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      Direct Stocks ({selectedIndustry.directHolding.length})
                    </h4>
                    <div className="space-y-2.5">
                      {[...selectedIndustry.directHolding].sort((a, b) => b.value - a.value).map((stock, idx) => {
                        const sharePercent = (stock.value / selectedIndustry.totalExposure) * (selectedIndustry.percentage || 0);
                        return (
                          <div 
                            key={idx} 
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/20 dark:bg-slate-800/40 hover:bg-muted/30 dark:hover:bg-slate-800/60 hover:border-primary/40 transition-all gap-3"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{stock.companyName}</span>
                              <Badge variant="default" className="text-[10px] uppercase">Direct Stock</Badge>
                            </div>
                            <div className="flex items-center space-x-4 self-end sm:self-auto">
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-foreground text-base">{formatCurrency(stock.value)}</span>
                                <span className="text-xs text-muted-foreground font-mono">{sharePercent.toFixed(2)}% of total portfolio</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mutual Funds Section */}
                {selectedIndustry.fundsHolding?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      Via Mutual Funds & ETFs ({selectedIndustry.fundsHolding.length})
                    </h4>
                    <div className="space-y-2.5">
                      {[...selectedIndustry.fundsHolding].sort((a, b) => b.effectiveValueFromFund - a.effectiveValueFromFund).map((fund, idx) => {
                        const sharePercent = (fund.effectiveValueFromFund / selectedIndustry.totalExposure) * (selectedIndustry.percentage || 0);
                        return (
                          <div 
                            key={idx} 
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/20 dark:bg-slate-800/40 hover:bg-muted/30 dark:hover:bg-slate-800/60 hover:border-primary/40 transition-all gap-3"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {resolveDisplayName({ name: fund.fundName }, growwCache)}
                              </span>
                              <Badge variant="secondary" className="text-[10px] uppercase">Mutual Fund</Badge>
                            </div>
                            <div className="flex items-center space-x-4 self-end sm:self-auto">
                              <div className="flex flex-col text-right">
                                <span className="font-bold text-foreground text-base">{formatCurrency(fund.effectiveValueFromFund)}</span>
                                <span className="text-xs text-muted-foreground font-mono">{sharePercent.toFixed(2)}% of total portfolio</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
