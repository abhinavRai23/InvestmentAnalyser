"use client";

import { Suspense, useEffect, useState } from "react";
import { usePortfolioStore, loadStoredPortfolio } from "@/store/portfolioStore";
import { Dashboard } from "@/components/Dashboard";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { PortfolioData } from "@/lib/types";

export function PortfolioContainer({ initialData }: { initialData: PortfolioData | null }) {
  const [isReady, setIsReady] = useState(false);
  const data = usePortfolioStore((state) => state.data);

  useEffect(() => {
    if (initialData) {
      usePortfolioStore.getState().setData(initialData);
    } else {
      const current = usePortfolioStore.getState().data;
      if (!current) {
        const stored = loadStoredPortfolio();
        if (stored) {
          usePortfolioStore.getState().setData(stored);
        }
      }
    }
    setIsReady(true);
  }, [initialData]);

  if (!isReady && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {!data ? (
        <WelcomeScreen />
      ) : (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>}>
          <Dashboard />
        </Suspense>
      )}
    </div>
  );
}
