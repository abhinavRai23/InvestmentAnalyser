import { LiveData } from './types';

export async function fetchMfapiNav(query: string): Promise<LiveData | null> {
  try {
    // 1. Search for the scheme code
    const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    if (!searchData || searchData.length === 0) return null;
    
    // Naively take the first match (In production, we'd do better fuzzy matching)
    const schemeCode = searchData[0].schemeCode;
    
    // 2. Fetch NAV
    const navRes = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    if (!navRes.ok) return null;
    
    const navData = await navRes.json();
    if (navData.data && navData.data.length > 0) {
      const latest = navData.data[0];
      return {
        price: parseFloat(latest.nav),
        date: latest.date
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch MF API for ${query}`, error);
    return null;
  }
}
