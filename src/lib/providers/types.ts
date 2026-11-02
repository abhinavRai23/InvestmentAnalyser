export interface LiveData {
  price: number;
  date: string;
  change?: number;
  changePct?: number;
  return1y?: number;
}

export interface MarketDataProvider {
  name: string;
  fetchStockPrice(query: string, isin?: string): Promise<LiveData | null>;
  fetchMutualFundNav(query: string, isin?: string): Promise<LiveData | null>;
}
