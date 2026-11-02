import { describe, it, expect } from 'vitest';
import { getDb } from './db';
import { logSync, getRecentLogs, getGroupedSyncLogs, getSyncStats, clearLogs } from './syncLogger';

describe('SQLite Database & Sync Logger', () => {
  it('initializes SQLite database with schema and SGB mappings', () => {
    const db = getDb();
    expect(db).toBeDefined();

    const sgbs = db.prepare('SELECT * FROM sgb_mappings').all() as any[];
    expect(sgbs.length).toBeGreaterThanOrEqual(5);
    expect(sgbs.find(s => s.isin === 'IN0020230093')?.nse_symbol).toBe('SGBSEP31II');
  });

  it('records and retrieves sync logs from SQLite', () => {
    clearLogs();

    logSync({
      level: 'WARN',
      source: 'YAHOO',
      assetName: 'KWALITY WALLS',
      isin: 'INE2KCE01013',
      message: 'Unlisted demerged entity, no market quote',
      details: { isin: 'INE2KCE01013' }
    });

    const logs = getRecentLogs(10);
    expect(logs.length).toBe(1);
    expect(logs[0].assetName).toBe('KWALITY WALLS');
    expect(logs[0].level).toBe('WARN');
    expect(logs[0].source).toBe('YAHOO');
    expect(logs[0].details?.isin).toBe('INE2KCE01013');
  });

  it('deduplicates and groups repeated retries so failed assets appear only once in summary', () => {
    clearLogs();

    // Simulate 3 retry failures for Axis Midcap Fund
    logSync({
      level: 'WARN',
      source: 'GROWW',
      assetName: 'Axis Midcap Fund Direct Growth',
      isin: 'INF179K01BE2',
      message: 'Could not find fund on Groww: Attempt 1 ISIN failed',
    });

    logSync({
      level: 'WARN',
      source: 'GROWW',
      assetName: 'Axis Midcap Fund Direct Growth',
      isin: 'INF179K01BE2',
      message: 'Could not find fund on Groww: Attempt 2 Name failed',
    });

    logSync({
      level: 'WARN',
      source: 'GROWW',
      assetName: 'Axis Midcap Fund Direct Growth',
      isin: 'INF179K01BE2',
      message: 'Could not find fund on Groww: Final attempt failed',
      details: { searchAttempts: [{ attempt: 1 }, { attempt: 2 }, { attempt: 3 }] }
    });

    // Simulate 1 failure that later SUCCEEDED on retry
    logSync({
      level: 'WARN',
      source: 'GROWW',
      assetName: 'Parag Parikh Flexi Cap Fund',
      isin: 'INF879O01019',
      message: 'Temporary timeout',
    });

    logSync({
      level: 'SUCCESS',
      source: 'GROWW',
      assetName: 'Parag Parikh Flexi Cap Fund',
      isin: 'INF879O01019',
      message: 'Synced fund details successfully',
      details: { nav: 82.5 }
    });

    // 1. Raw logs have 5 entries
    const rawLogs = getRecentLogs(10);
    expect(rawLogs.length).toBe(5);

    // 2. Grouped failed summary must only show the one persistent failure ONCE
    const failedGrouped = getGroupedSyncLogs(true);
    expect(failedGrouped.length).toBe(1);
    expect(failedGrouped[0].assetName).toBe('Axis Midcap Fund Direct Growth');
    expect(failedGrouped[0].isin).toBe('INF179K01BE2');
    expect(failedGrouped[0].attemptCount).toBe(3);
    expect(failedGrouped[0].failureCount).toBe(3);
    expect(failedGrouped[0].internalRetries).toBe(3);
    expect(failedGrouped[0].message).toBe('Could not find fund on Groww: Final attempt failed');

    // 3. All grouped assets should show 2 unique assets total
    const allGrouped = getGroupedSyncLogs(false);
    expect(allGrouped.length).toBe(2);

    const ppfas = allGrouped.find(g => g.isin === 'INF879O01019');
    expect(ppfas).toBeDefined();
    expect(ppfas?.level).toBe('SUCCESS');
    expect(ppfas?.attemptCount).toBe(2);
    expect(ppfas?.failureCount).toBe(1);
    expect(ppfas?.successCount).toBe(1);

    // 4. Verify stats
    const stats = getSyncStats();
    expect(stats.totalAssets).toBe(2);
    expect(stats.unresolvedIssues).toBe(1);
    expect(stats.syncedSuccess).toBe(1);
    expect(stats.totalLogEntries).toBe(5);
  });
});
