"use client";

import { useEffect, useRef } from "react";
import { usePortfolioStore, loadStoredPortfolio } from "@/store/portfolioStore";
import { PortfolioData } from "@/lib/types";

export default function StoreInitializer({ initialData }: { initialData: PortfolioData | null }) {
  const lastDataRef = useRef<PortfolioData | null>(null);

  if (initialData && lastDataRef.current !== initialData) {
    usePortfolioStore.getState().setData(initialData);
    lastDataRef.current = initialData;
  }

  useEffect(() => {
    // If no server data was provided, check if client has previous session saved in localStorage
    const currentData = usePortfolioStore.getState().data;
    if (!currentData) {
      const stored = loadStoredPortfolio();
      if (stored) {
        usePortfolioStore.getState().setData(stored);
      }
    }
  }, []);

  return null;
}
