import { LiveData } from './types';

const MODIFIER_WORDS = ['ultra', 'mid', 'small', 'next', 'overnight', 'liquid', 'arbitrage', 'hybrid', 'dynamic', 'government securities', 'gilt'];

function scoreMfapiCandidate(schemeName: string, query: string): number {
  const qLower = query.toLowerCase();
  const nameLower = schemeName.toLowerCase();
  let score = 0;

  if (nameLower === qLower) score += 100;

  for (const mod of MODIFIER_WORDS) {
    const inCand = nameLower.includes(mod);
    const inQuery = qLower.includes(mod);
    if (inCand && !inQuery) {
      score -= 50;
    } else if (inCand && inQuery) {
      score += 20;
    }
  }

  // Direct vs Regular
  const qDirect = qLower.includes('direct');
  const candDirect = nameLower.includes('direct');
  if (qDirect && candDirect) score += 15;
  if (qDirect && !candDirect) score -= 30;

  // Growth vs IDCW / Dividend
  const qGrowth = qLower.includes('growth');
  const candGrowth = nameLower.includes('growth');
  if (qGrowth && candGrowth) score += 15;
  if (qGrowth && !candGrowth) score -= 30;

  const words = qLower.split(/\s+/).filter(w => !['fund', 'direct', 'growth', 'plan', 'option'].includes(w) && w.length > 2);
  for (const w of words) {
    if (nameLower.includes(w)) score += 5;
  }

  return score;
}

export async function fetchMfapiNav(query: string): Promise<LiveData | null> {
  try {
    // 1. Search for the scheme code
    const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    if (!searchData || searchData.length === 0) return null;
    
    // Sort candidates by match score
    const sorted = [...searchData].sort((a, b) => 
      scoreMfapiCandidate(b.schemeName, query) - scoreMfapiCandidate(a.schemeName, query)
    );
    const schemeCode = sorted[0].schemeCode;
    
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
