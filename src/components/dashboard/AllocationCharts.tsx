import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, Sector } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Holding } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useGrowwCache, resolveDisplayName } from "@/hooks/useGrowwCache";

const COLORS = [
  '#3b82f6', // Indigo Blue (Equity)
  '#10b981', // Emerald Green (Debt MFs)
  '#f59e0b', // Amber Gold (Fixed Deposits)
  '#06b6d4', // Cyan (Savings & Cash)
  '#8b5cf6', // Deep Purple (NPS & PPF)
  '#eab308', // Gold (SGB / Gold ETFs)
  '#94a3b8', // Slate (Silver)
  '#ec4899', // Pink Coral (Hybrid / Other)
  '#6366f1', // Electric Indigo
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#a855f7', // Violet
];

interface ChartData {
  name: string;
  value: number;
}

interface AllocationChartsProps {
  strategicAlloc: ChartData[];
  productAlloc: ChartData[];
  personAlloc: ChartData[];
  showPersonAlloc: boolean;
  holdings: Holding[];
}

const renderCustomizedLabel = (props: any) => {
  const { percent, x, y, cx } = props;
  if (!percent || percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="fill-slate-800 dark:fill-slate-200 text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g style={{ outline: 'none' }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
        stroke="none"
        style={{ cursor: 'pointer', outline: 'none', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))' }}
      />
    </g>
  );
};

type SliceType = 'strategic' | 'product' | 'person' | null;

export function AllocationCharts({ strategicAlloc, productAlloc, personAlloc, showPersonAlloc, holdings }: AllocationChartsProps) {
  const [activeSlice, setActiveSlice] = useState<{ type: SliceType, name: string } | null>(null);
  const { cache: growwCache } = useGrowwCache();

  const detailData = useMemo(() => {
    if (!activeSlice) return [];

    let filtered = holdings;
    if (activeSlice.type === 'strategic') {
      filtered = holdings.filter(h => h.strategicAssetClass === activeSlice.name);
    } else if (activeSlice.type === 'product') {
      filtered = holdings.filter(h => h.productType === activeSlice.name);
    } else if (activeSlice.type === 'person') {
      filtered = holdings.filter(h => h.ownerId === activeSlice.name);
    }

    // Return descending by value
    return filtered.sort((a, b) => b.currentValue - a.currentValue);
  }, [activeSlice, holdings]);

  const totalValue = detailData.reduce((acc, h) => acc + h.currentValue, 0);

  const personBreakdown = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    const map: Record<string, { ownerId: string; total: number; categories: Record<string, number> }> = {};
    let totalPortfolioVal = 0;

    for (const h of holdings) {
      const cat = h.strategicAssetClass || "Other";

      if (h.owners && h.owners.length > 0) {
        for (const o of h.owners) {
          const owner = o.ownerName || o.ownerId;
          if (!owner || owner === 'ALL') continue;

          const val = o.currentValue || 0;
          totalPortfolioVal += val;

          if (!map[owner]) {
            map[owner] = { ownerId: owner, total: 0, categories: {} };
          }
          map[owner].total += val;
          map[owner].categories[cat] = (map[owner].categories[cat] || 0) + val;
        }
      } else {
        const owner = h.ownerId;
        if (!owner || owner === 'ALL') continue;

        const val = h.currentValue || 0;
        totalPortfolioVal += val;

        if (!map[owner]) {
          map[owner] = { ownerId: owner, total: 0, categories: {} };
        }
        map[owner].total += val;
        map[owner].categories[cat] = (map[owner].categories[cat] || 0) + val;
      }
    }

    return Object.values(map)
      .filter(p => p.ownerId && p.ownerId !== 'ALL')
      .sort((a, b) => b.total - a.total)
      .map(p => ({
        ...p,
        sharePct: totalPortfolioVal > 0 ? (p.total / totalPortfolioVal) * 100 : 0
      }));
  }, [holdings]);

  const columns: ColumnDef<Holding>[] = [
    {
      header: "Instrument Name",
      accessorKey: "name",
      enableSorting: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{resolveDisplayName(row, growwCache)}</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-xs">{row.productType}</Badge>
            {row.category && <Badge variant="secondary" className="text-xs">{row.category}</Badge>}
          </div>
        </div>
      ),
    },
    {
      header: "Current Value",
      accessorKey: "currentValue",
      enableSorting: true,
      cell: (row) => <span className="font-semibold">{formatCurrency(row.currentValue)}</span>,
    },
    {
      header: "Allocation %",
      accessorKey: "currentValue", // Sort by value to also sort by %
      enableSorting: false,
      cell: (row) => <span className="font-mono text-muted-foreground">{((row.currentValue / totalValue) * 100).toFixed(2)}%</span>,
    }
  ];

  const renderChartOrValue = (allocData: ChartData[], type: SliceType, colorOffset = 0) => {
    if (allocData.length === 1 && allocData[0].value > 0) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full space-y-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveSlice({ type, name: allocData[0].name })}
        >
          <div className="text-6xl font-bold text-muted-foreground/30">100%</div>
          <div className="text-xl font-medium">{allocData[0].name}</div>
          <div className="text-muted-foreground">{formatCurrency(allocData[0].value)}</div>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart style={{ outline: 'none' }}>
          <Pie
            data={allocData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={92}
            paddingAngle={4}
            cornerRadius={6}
            stroke="none"
            activeShape={renderActiveShape}
            label={renderCustomizedLabel}
            onClick={(data) => setActiveSlice({ type, name: data.name || "" })}
            className="cursor-pointer"
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            {allocData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[(index + colorOffset) % COLORS.length]}
                stroke="none"
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value: any) => formatCurrency(Number(value))}
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
          <Legend wrapperStyle={{ paddingTop: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Strategic Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {renderChartOrValue(strategicAlloc, 'strategic', 0)}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Product Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {renderChartOrValue(productAlloc, 'product', 3)}
          </CardContent>
        </Card>
      </div>

      {showPersonAlloc && (
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-5 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Person-wise Family Wealth & Asset Matrix</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Itemized wealth distribution and asset allocation per family member
                </p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {personBreakdown.length} Family Members
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Pie Chart */}
              <div className="lg:col-span-5 h-[280px]">
                {renderChartOrValue(personAlloc, 'person', 0)}
              </div>

              {/* Right Column: Sleek Person Wealth & Asset Breakdown Matrix */}
              <div className="lg:col-span-7 space-y-2.5">
                {personBreakdown.map((person) => (
                  <div
                    key={person.ownerId}
                    className="p-3 rounded-lg border border-border/70 bg-card hover:border-indigo-500/40 transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                          {person.ownerId.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{person.ownerId}</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {person.sharePct.toFixed(1)}% of family wealth
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-foreground font-mono">
                          {formatCurrency(person.total)}
                        </div>
                      </div>
                    </div>

                    {/* Asset allocation breakdown chips */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {Object.entries(person.categories).map(([cat, val]) => {
                        const pct = person.total > 0 ? (val / person.total) * 100 : 0;
                        return (
                          <div
                            key={cat}
                            className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-medium border border-border/30"
                          >
                            <span className="text-muted-foreground">{cat}:</span>
                            <span className="font-semibold text-foreground">{formatCurrency(val)}</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">({pct.toFixed(0)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!activeSlice} onOpenChange={(open) => !open && setActiveSlice(null)}>
        {/* Task 10: Increased modal size with max-w-4xl */}
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[85vh] overflow-y-auto w-full p-0">
          {activeSlice && (
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 border-b sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <DialogTitle className="text-2xl font-bold tracking-tight">{activeSlice.name} Allocation</DialogTitle>
                <p className="text-muted-foreground mt-1">
                  Total Exposure: <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span>
                </p>
              </DialogHeader>
              <div className="p-6">
                <DataTable
                  columns={columns}
                  data={detailData}
                  searchKey="name"
                  searchPlaceholder={`Search ${activeSlice.name} assets...`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
