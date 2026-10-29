"use client";

import { Suspense } from "react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Dashboard } from "@/components/Dashboard";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import StoreInitializer from "@/components/StoreInitializer";
import { PortfolioData } from "@/lib/types";

export function PortfolioContainer({ initialData }: { initialData: PortfolioData | null }) {
  const data = usePortfolioStore((state) => state.data);

  return (
    <div>
      <StoreInitializer initialData={initialData} />
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

