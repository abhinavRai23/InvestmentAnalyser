export interface LiveData {
  price: number;
  date: string;
}

export interface MarketDataProvider {
  name: string;
  fetchStockPrice(query: string, isin?: string): Promise<LiveData | null>;
  fetchMutualFundNav(query: string, isin?: string): Promise<LiveData | null>;
}
