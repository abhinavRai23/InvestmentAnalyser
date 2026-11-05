export interface LiveData {
  price: number;
  date: string;
  change?: number;
  changePct?: number;
  return1y?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekAvg?: number;
  twoHundredDayAverage?: number;
  fiftyDayAverage?: number;
}

export interface MarketDataProvider {
  name: string;
  fetchStockPrice(query: string, isin?: string): Promise<LiveData | null>;
  fetchMutualFundNav(query: string, isin?: string): Promise<LiveData | null>;
}
