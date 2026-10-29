import { describe, it, expect } from 'vitest';
import { calculateOverlap } from './overlapEngine';
import { Holding } from './types';
import { UnderlyingHolding } from './dataProvider';

describe('Overlap Engine', () => {
  it('calculates effective overlap correctly across funds and filters out debt', () => {
    const mfHoldings: Holding[] = [
      { id: '1', ownerId: 'A', name: 'Fund A', assetType: 'mutual_fund', investedValue: 1000, currentValue: 2000, absoluteReturn: 1000, returnPercentage: 100 },
      { id: '2', ownerId: 'A', name: 'Fund B', assetType: 'mutual_fund', investedValue: 500, currentValue: 1000, absoluteReturn: 500, returnPercentage: 100 },
    ];

    const db: Record<string, UnderlyingHolding[]> = {
      'Fund A': [
        { stockName: 'Reliance', sector: 'Energy', weight: 10 },
        { stockName: 'HDFC', sector: 'Financials', weight: 5 },
        { stockName: 'Repo', sector: 'Cash', weight: 2 } // should be filtered out
      ],
      'Fund B': [
        { stockName: 'Reliance', sector: 'Energy', weight: 20 },
        { stockName: 'TCS', sector: 'Tech', weight: 10 }
      ]
    };

    const overlap = calculateOverlap(mfHoldings, db);
    
    // Reliance, HDFC, TCS -> 3 equities
    expect(overlap.length).toBe(3);
    
    const rel = overlap.find(o => o.stockName === 'Reliance');
    expect(rel).toBeDefined();
    // Fund A: 10% of 2000 = 200
    // Fund B: 20% of 1000 = 200
    // Total = 400
    expect(rel?.totalEffectiveValue).toBe(400);
    expect(rel?.fundsHolding.length).toBe(2);

    const hdfc = overlap.find(o => o.stockName === 'HDFC');
    // Fund A: 5% of 2000 = 100
    expect(hdfc?.totalEffectiveValue).toBe(100);
    expect(hdfc?.fundsHolding.length).toBe(1);
    
    const repo = overlap.find(o => o.stockName === 'Repo');
    expect(repo).toBeUndefined(); // Should be filtered
  });
});

