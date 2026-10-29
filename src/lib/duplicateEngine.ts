import { Holding, Person } from './types';

export interface DuplicateGroup {
  type: 'exact' | 'category';
  title: string;
  description: string;
  items: {
    ownerName: string;
    holdingName: string;
    value: number;
  }[];
  totalValue: number;
}

export function findDuplicateInvestments(
  holdings: Holding[],
  people: Person[]
): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];
  const personMap = new Map(people.map(p => [p.id, p.name]));

  // 1. Exact Duplicates (Same Stock or Mutual Fund held by multiple people or multiple times)
  const exactMap = new Map<string, Holding[]>();
  
  for (const h of holdings) {
    if (h.assetType !== 'stock' && h.assetType !== 'mutual_fund') continue;
    
    // Normalize name for comparison to catch slight variations
    const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(h);
  }

  for (const [key, group] of exactMap.entries()) {
    // Check if held by more than 1 distinct person, or multiple entries by same person
    if (group.length > 1) {
      const distinctOwners = new Set(group.map(h => h.ownerId));
      if (distinctOwners.size > 1) {
        duplicates.push({
          type: 'exact',
          title: `Multiple family members hold ${group[0].name}`,
          description: `This asset is held by ${distinctOwners.size} different family members.`,
          totalValue: group.reduce((sum, h) => sum + h.currentValue, 0),
          items: group.map(h => ({
            ownerName: personMap.get(h.ownerId) || 'Unknown',
            holdingName: h.name,
            value: h.currentValue
          }))
        });
      }
    }
  }

  // 2. Category Duplicates (Multiple funds in the same specific category)
  // E.g., multiple "Mid Cap Fund"s.
  const categoryMap = new Map<string, Holding[]>();
  
  for (const h of holdings) {
    if (h.assetType !== 'mutual_fund') continue;
    
    // Attempt to extract category from name if not provided (many scraping sources include category in the name)
    // Or we could use subCategory if available
    let category = h.subCategory;
    
    if (!category) {
      const name = h.name.toLowerCase();
      if (name.includes('mid cap') || name.includes('midcap')) category = 'Mid Cap Equity';
      else if (name.includes('small cap') || name.includes('smallcap')) category = 'Small Cap Equity';
      else if (name.includes('large cap') || name.includes('largecap') || name.includes('bluechip')) category = 'Large Cap Equity';
      else if (name.includes('flexi cap') || name.includes('flexicap')) category = 'Flexi Cap Equity';
      else if (name.includes('multi cap') || name.includes('multicap')) category = 'Multi Cap Equity';
      else if (name.includes('elss') || name.includes('tax saver')) category = 'ELSS (Tax Saver)';
      else if (name.includes('index')) category = 'Index Fund';
      else if (name.includes('liquid')) category = 'Liquid Fund';
      else if (name.includes('arbitrage')) category = 'Arbitrage Fund';
    }

    if (category) {
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category)!.push(h);
    }
  }

  for (const [category, group] of categoryMap.entries()) {
    // If there are more than 2 distinct funds in this category
    const distinctFunds = new Set(group.map(h => h.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
    if (distinctFunds.size > 1) {
      duplicates.push({
        type: 'category',
        title: `Over-diversification in ${category}`,
        description: `The family holds ${distinctFunds.size} different mutual funds in the "${category}" category. Consider consolidating to reduce overlapping fees.`,
        totalValue: group.reduce((sum, h) => sum + h.currentValue, 0),
        items: group.map(h => ({
          ownerName: personMap.get(h.ownerId) || 'Unknown',
          holdingName: h.name,
          value: h.currentValue
        }))
      });
    }
  }

  return duplicates.sort((a, b) => b.totalValue - a.totalValue);
}
