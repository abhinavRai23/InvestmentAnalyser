import { Holding, Person } from './types';
import { findDuplicateInvestments } from './duplicateEngine';

export type ActionType = 'KEEP' | 'REVIEW' | 'REDUCE' | 'EXIT';

export interface ActionRecommendation {
  holdingId: string;
  holdingName: string;
  ownerId: string;
  assetType: string;
  action: ActionType;
  score: number; // 0 to 100
  reasons: string[];
  currentValue: number;
}

export function scoreHoldings(
  holdings: Holding[],
  people: Person[]
): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  
  // Calculate globals for concentration checks
  let totalEquity = 0;
  let totalDebt = 0;
  
  const companyExposure = new Map<string, number>();

  for (const h of holdings) {
    if (h.strategicAssetClass === 'Equity' || h.assetType === 'stock') {
      totalEquity += h.currentValue;
      
      if (h.assetType === 'stock') {
        const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        companyExposure.set(key, (companyExposure.get(key) || 0) + h.currentValue);
      }
    } else if (
      h.strategicAssetClass === 'Debt Mutual Funds' || 
      h.strategicAssetClass === 'Fixed Deposits' || 
      h.strategicAssetClass === 'Savings & Cash' || 
      h.strategicAssetClass === 'Provident & Pension Funds'
    ) {
      totalDebt += h.currentValue;
    }
  }

  // Get duplicates to flag
  const duplicates = findDuplicateInvestments(holdings, people);
  const duplicateHoldingNames = new Set<string>();
  const categoryOverdiversified = new Set<string>();

  for (const dup of duplicates) {
    if (dup.type === 'exact') {
      dup.items.forEach(item => duplicateHoldingNames.add(item.holdingName.toLowerCase()));
    } else {
      dup.items.forEach(item => categoryOverdiversified.add(item.holdingName.toLowerCase()));
    }
  }

  for (const h of holdings) {
    let score = 100;
    const reasons: string[] = [];
    let action: ActionType = 'KEEP';
    const nameLower = h.name.toLowerCase();

    // 1. Performance Checks (If absolute return is very negative)
    if (h.returnPercentage < -30) {
      score -= 40;
      reasons.push(`Severely negative return (${h.returnPercentage.toFixed(1)}%).`);
    } else if (h.returnPercentage < -15) {
      score -= 20;
      reasons.push(`Significant negative return (${h.returnPercentage.toFixed(1)}%).`);
    }

    // 2. Mutual Fund Specific Rules
    if (h.assetType === 'mutual_fund') {
      // XIRR checks if available
      if (h.xirr !== undefined) {
        if (h.xirr < 5 && h.xirr > -100) {
          score -= 20;
          reasons.push(`Low annualized return (XIRR: ${h.xirr.toFixed(1)}%). Underperforming inflation/FDs.`);
        }
      }

      // Exact Duplicates across family
      if (duplicateHoldingNames.has(nameLower)) {
        score -= 15;
        reasons.push(`Exact duplicate fund held by multiple family members/accounts.`);
      }

      // Category Over-diversification
      if (categoryOverdiversified.has(nameLower)) {
        score -= 10;
        reasons.push(`Category over-diversification: You hold too many similar funds in this category.`);
      }
    }

    // 3. Direct Stock Specific Rules
    if (h.assetType === 'stock' && totalEquity > 0) {
      const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const totalCompExposure = companyExposure.get(key) || h.currentValue;
      const concentration = (totalCompExposure / totalEquity) * 100;

      if (concentration > 15) {
        score -= 30;
        reasons.push(`Extreme concentration: This stock constitutes ${concentration.toFixed(1)}% of your equity portfolio.`);
      } else if (concentration > 8) {
        score -= 15;
        reasons.push(`High concentration: This stock constitutes ${concentration.toFixed(1)}% of your equity portfolio.`);
      }
    }

    // Determine Action based on Score
    if (score < 40) {
      action = 'EXIT';
    } else if (score < 60) {
      action = 'REDUCE';
    } else if (score < 80) {
      action = 'REVIEW';
    } else {
      action = 'KEEP';
    }

    // Edge Cases: Always keep Gold/Debt if they are performing well as they are meant for stability
    const isStableAsset = 
      h.strategicAssetClass === 'Gold' || 
      h.strategicAssetClass === 'Debt Mutual Funds' || 
      h.strategicAssetClass === 'Fixed Deposits' || 
      h.strategicAssetClass === 'Savings & Cash' || 
      h.strategicAssetClass === 'Provident & Pension Funds';

    if (isStableAsset && score >= 60) {
      action = 'KEEP'; // More lenient on safe assets
      score = Math.max(score, 80);
    }

    recommendations.push({
      holdingId: h.id,
      holdingName: h.name,
      ownerId: h.ownerId,
      assetType: h.assetType,
      action,
      score,
      reasons,
      currentValue: h.currentValue
    });
  }

  // Sort: EXIT first, then REDUCE, then REVIEW, then KEEP
  const actionPriority = { EXIT: 0, REDUCE: 1, REVIEW: 2, KEEP: 3 };
  
  return recommendations.sort((a, b) => {
    if (actionPriority[a.action] !== actionPriority[b.action]) {
      return actionPriority[a.action] - actionPriority[b.action];
    }
    return a.score - b.score;
  });
}
