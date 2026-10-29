export interface GrowwFundDetails {
  fund_name: string;
  search_id: string;
  scheme_name: string;
  aum: number;
  expense_ratio: number;
  exit_load: string;
  category: string;
  sub_category: string;
  logo_url: string;
  simple_return?: {
    return1y?: number;
    return3y?: number;
    return5y?: number;
  };
  holdings: Array<{
    company_name: string;
    sector_name: string;
    corpus_per: number;
  }>;
}

export async function fetchGrowwFundDetails(fundName: string): Promise<GrowwFundDetails | null> {
  try {
    const res = await fetch(`/api/groww?q=${encodeURIComponent(fundName)}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data as GrowwFundDetails;
  } catch (error) {
    console.warn(`Failed to fetch Groww details for ${fundName}`, error);
    return null;
  }
}
