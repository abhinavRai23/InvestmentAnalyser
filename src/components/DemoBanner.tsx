"use client";

import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Trash2, X, FileSpreadsheet, UserX } from "lucide-react";
import { useState } from "react";

export function DemoBanner() {
  const { data, removePerson, clearPortfolio } = usePortfolioStore();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !data) return null;

  // Detect if current portfolio is demo data (has Person A or Person B)
  const isDemo = data.people.some(p => p.id === "Person A" || p.id === "Person B");
  if (!isDemo) return null;

  const hasPersonA = data.people.some(p => p.id === "Person A");
  const hasPersonB = data.people.some(p => p.id === "Person B");

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Interactive Demo Mode:</strong> Exploring sample family portfolio with{" "}
            {hasPersonA && hasPersonB ? "Person A & Person B" : (hasPersonA ? "Person A" : "Person B")}.
            You can filter, test mutual fund overlap, or delete members.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Trigger download of the 4 sample files
              window.open("/sample-files/Mutual_Funds_Person_A.xlsx", "_blank");
            }}
            className="h-7 text-[11px] gap-1 bg-background/80 hover:bg-background border-amber-500/30 text-amber-900 dark:text-amber-100"
            title="Download Person A & B Excel Statements (.xlsx) to test manual upload"
          >
            <Download className="h-3 w-3 text-amber-600" />
            <span>Sample Files (.xlsx)</span>
          </Button>

          {hasPersonA && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removePerson("Person A")}
              className="h-7 text-[11px] gap-1 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
              title="Delete Person A from the current demo portfolio"
            >
              <UserX className="h-3 w-3" />
              <span>Delete Person A</span>
            </Button>
          )}

          {hasPersonB && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removePerson("Person B")}
              className="h-7 text-[11px] gap-1 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
              title="Delete Person B from the current demo portfolio"
            >
              <UserX className="h-3 w-3" />
              <span>Delete Person B</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={clearPortfolio}
            className="h-7 text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            title="Clear demo data and load your own statements"
          >
            <Trash2 className="h-3 w-3" />
            <span>Upload My Own</span>
          </Button>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 p-1 rounded-md"
            title="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

