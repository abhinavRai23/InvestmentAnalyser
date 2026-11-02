"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Layers,
  ListFilter
} from "lucide-react";

interface SyncLogItem {
  id: number;
  timestamp?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  level: "SUCCESS" | "INFO" | "WARN" | "ERROR";
  source: string;
  assetName?: string;
  assetType?: string;
  isin?: string;
  message: string;
  details?: any;
  attemptCount?: number;
  failureCount?: number;
  successCount?: number;
  internalRetries?: number;
}

interface SyncStats {
  totalAssets: number;
  unresolvedIssues: number;
  syncedSuccess: number;
  totalLogEntries: number;
}

interface SyncLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncLogsModal({ open, onOpenChange }: SyncLogsModalProps) {
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [filter, setFilter] = useState<"issues" | "all" | "raw">("issues");
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const isRaw = filter === "raw";
      const isFailed = filter === "issues";
      const queryParams = new URLSearchParams({
        failed: isFailed ? "true" : "false",
        grouped: isRaw ? "false" : "true",
        limit: "150",
      });

      const res = await fetch(`/api/sync-logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.error("Failed to fetch sync logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, filter]);

  const handleClearLogs = async () => {
    try {
      await fetch("/api/sync-logs", { method: "DELETE" });
      setLogs([]);
      setStats({
        totalAssets: 0,
        unresolvedIssues: 0,
        syncedSuccess: 0,
        totalLogEntries: 0,
      });
    } catch (e) {
      console.error("Failed to clear sync logs", e);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Sync Diagnostics & Error Summary
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Persistent tracking of Groww NAVs, Yahoo quotes, and physical spot prices stored in SQLite.
            </p>
          </div>
        </DialogHeader>

        {/* Status Highlights Banner */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-muted/40 rounded-lg text-xs border">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-muted-foreground">Unresolved Issues:</span>
              <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                {stats.unresolvedIssues}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Synced Successfully:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {stats.syncedSuccess}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-muted-foreground">Securities Monitored:</span>
              <span className="font-bold font-mono text-foreground">
                {stats.totalAssets}
              </span>
            </div>
          </div>
        )}

        {/* Toolbar & Filter Tabs */}
        <div className="flex items-center justify-between gap-3 py-2 border-b">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-md text-xs">
            <button
              onClick={() => setFilter("issues")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filter === "issues"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              Persistent Issues
              {stats && stats.unresolvedIssues > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full text-[10px] font-mono">
                  {stats.unresolvedIssues}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filter === "all"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              All Securities (Summary)
            </button>
            <button
              onClick={() => setFilter("raw")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filter === "raw"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
              Raw Stream
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLogs}
              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Log Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-75" />
              <div className="font-semibold text-foreground">
                {filter === "issues"
                  ? "No Unresolved Sync Failures"
                  : "No log records recorded"}
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {filter === "issues"
                  ? "All market data feeds, NAV lookups, and Groww metadata are syncing smoothly without persistent failures."
                  : "Click 'Sync Prices & Groww Metadata' on the dashboard to trigger an update cycle."}
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isError = log.level === "ERROR";
              const isWarn = log.level === "WARN";
              const isSuccess = log.level === "SUCCESS";
              const isInfo = log.level === "INFO";

              const attempts = Math.max(
                log.failureCount || 0,
                log.attemptCount || 0,
                log.internalRetries || 0,
                1
              );

              const timeDisplay = log.lastTimestamp
                ? new Date(log.lastTimestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "";

              const hasDetails = log.details && (typeof log.details === "object" ? Object.keys(log.details).length > 0 : true);
              const isExpanded = !!expandedItems[log.id];

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isError
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                      : isWarn
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                      : isInfo
                      ? "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30"
                      : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isError && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                      {isWarn && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                      {isInfo && <Info className="h-4 w-4 text-blue-500 shrink-0" />}
                      {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase px-1.5 py-0 ${
                          isError
                            ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                            : isWarn
                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                            : isInfo
                            ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {log.source}
                      </Badge>

                      {log.assetName && (
                        <span className="font-semibold text-foreground font-mono">
                          {log.assetName}
                        </span>
                      )}

                      {log.isin && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ISIN: {log.isin}
                        </span>
                      )}

                      {/* Retry / Attempt Badge in Grouped Mode */}
                      {filter !== "raw" && attempts > 1 && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 font-medium ${
                            isError || isWarn
                              ? "bg-rose-100/80 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isError || isWarn
                            ? `Failed after ${attempts} attempts`
                            : `Synced (${attempts} runs)`}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeDisplay}
                      </span>
                      {hasDetails && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                          title="Toggle technical details"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    {log.message}
                  </p>

                  {/* Expandable Technical Details / Search Attempts */}
                  {hasDetails && isExpanded && (
                    <div className="mt-2 space-y-1">
                      {Array.isArray(log.details?.searchAttempts) && (
                        <div className="p-2 rounded bg-background/90 border text-[11px] font-mono space-y-1">
                          <span className="font-bold text-foreground block">
                            Search Attempts ({log.details.searchAttempts.length}):
                          </span>
                          {log.details.searchAttempts.map((attempt: any, idx: number) => (
                            <div key={idx} className="text-muted-foreground flex items-center gap-2">
                              <span className="text-foreground font-semibold">
                                Attempt {attempt.attempt || idx + 1} ({attempt.type}):
                              </span>
                              <span className="truncate">{attempt.query || attempt.url}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <pre className="p-2 rounded bg-background/80 border text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-32">
                        {typeof log.details === "string"
                          ? log.details
                          : JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
