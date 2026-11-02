import fs from 'fs';
import path from 'path';
import { getDb } from './db';

const LOG_FILE = path.join(process.cwd(), 'data', 'sync_errors.log');

export interface SyncLogEntry {
  id?: number;
  timestamp: string;
  level: 'SUCCESS' | 'INFO' | 'WARN' | 'ERROR';
  source: 'GROWW' | 'YAHOO' | 'MFAPI' | 'SGB' | 'SYSTEM';
  assetName?: string;
  assetType?: string;
  isin?: string;
  message: string;
  details?: any;
}

export interface GroupedSyncLogEntry {
  id: number;
  firstTimestamp: string;
  lastTimestamp: string;
  level: 'SUCCESS' | 'INFO' | 'WARN' | 'ERROR';
  source: 'GROWW' | 'YAHOO' | 'MFAPI' | 'SGB' | 'SYSTEM';
  assetName?: string;
  assetType?: string;
  isin?: string;
  message: string;
  details?: any;
  attemptCount: number;
  failureCount: number;
  successCount: number;
  internalRetries?: number;
}

export interface SyncStats {
  totalAssets: number;
  unresolvedIssues: number;
  syncedSuccess: number;
  totalLogEntries: number;
}

export function logSync(entry: Omit<SyncLogEntry, 'timestamp'>) {
  const timestamp = new Date().toISOString();
  const db = getDb();

  try {
    const insert = db.prepare(`
      INSERT INTO sync_logs (timestamp, level, source, asset_name, asset_type, isin, message, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      timestamp,
      entry.level,
      entry.source,
      entry.assetName || null,
      entry.assetType || null,
      entry.isin || null,
      entry.message,
      entry.details ? JSON.stringify(entry.details) : null
    );

    // Also write to plain text log file if WARN or ERROR
    if (entry.level === 'WARN' || entry.level === 'ERROR') {
      const line = `[${timestamp}] [${entry.level}] [${entry.source}] ${entry.assetName ? `[${entry.assetName}] ` : ''}${entry.message}${entry.details ? ' ' + JSON.stringify(entry.details) : ''}\n`;
      fs.appendFileSync(LOG_FILE, line, 'utf8');
    }
  } catch (err) {
    console.error('Failed to write to sync_logs SQLite table', err);
  }
}

export function getRecentLogs(limit = 100): SyncLogEntry[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, timestamp, level, source, asset_name as assetName, asset_type as assetType, isin, message, details_json
      FROM sync_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : undefined
    }));
  } catch (e) {
    console.error('Failed to query sync_logs', e);
    return [];
  }
}

export function getFailedSyncs(): SyncLogEntry[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, timestamp, level, source, asset_name as assetName, asset_type as assetType, isin, message, details_json
      FROM sync_logs
      WHERE level IN ('WARN', 'ERROR')
      ORDER BY id DESC
      LIMIT 100
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      details: r.details_json ? JSON.parse(r.details_json) : undefined
    }));
  } catch (e) {
    console.error('Failed to query failed syncs', e);
    return [];
  }
}

/**
 * Aggregates logs by asset & source so that each security appears only once in the summary,
 * even after multiple retries or sync attempts.
 */
export function getGroupedSyncLogs(failedOnly = false, limit = 100): GroupedSyncLogEntry[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT id, timestamp, level, source, asset_name as assetName, asset_type as assetType, isin, message, details_json
      FROM sync_logs
      ORDER BY id DESC
      LIMIT 1000
    `).all() as any[];

    const groupedMap = new Map<string, GroupedSyncLogEntry>();
    const keyByIsin = new Map<string, string>();
    const keyByName = new Map<string, string>();

    for (const r of rows) {
      const normSource = r.source || 'SYSTEM';
      const normName = r.assetName ? r.assetName.trim().toUpperCase() : '';
      const normIsin = r.isin ? r.isin.trim().toUpperCase() : '';
      const normMsg = r.message ? r.message.trim() : '';

      // Determine or reuse grouping key for this asset and source
      let key = '';
      if (normIsin && keyByIsin.has(`${normSource}:isin:${normIsin}`)) {
        key = keyByIsin.get(`${normSource}:isin:${normIsin}`)!;
      } else if (normName && keyByName.has(`${normSource}:name:${normName}`)) {
        key = keyByName.get(`${normSource}:name:${normName}`)!;
      } else {
        key = normIsin
          ? `${normSource}:isin:${normIsin}`
          : normName
          ? `${normSource}:name:${normName}`
          : `${normSource}:msg:${normMsg}`;

        if (normIsin) keyByIsin.set(`${normSource}:isin:${normIsin}`, key);
        if (normName) keyByName.set(`${normSource}:name:${normName}`, key);
      }

      // Also ensure cross-association between isin and name
      if (normIsin) keyByIsin.set(`${normSource}:isin:${normIsin}`, key);
      if (normName) keyByName.set(`${normSource}:name:${normName}`, key);

      const isFailure = r.level === 'WARN' || r.level === 'ERROR';
      const isSuccess = r.level === 'SUCCESS';

      let parsedDetails: any = undefined;
      if (r.details_json) {
        try {
          parsedDetails = JSON.parse(r.details_json);
        } catch {
          parsedDetails = r.details_json;
        }
      }

      if (!groupedMap.has(key)) {
        // Most recent record for this asset/source
        const internalRetries = Array.isArray(parsedDetails?.searchAttempts)
          ? parsedDetails.searchAttempts.length
          : undefined;

        groupedMap.set(key, {
          id: r.id,
          firstTimestamp: r.timestamp,
          lastTimestamp: r.timestamp,
          level: r.level,
          source: r.source,
          assetName: r.assetName || undefined,
          assetType: r.assetType || undefined,
          isin: r.isin || undefined,
          message: r.message,
          details: parsedDetails,
          attemptCount: 1,
          failureCount: isFailure ? 1 : 0,
          successCount: isSuccess ? 1 : 0,
          internalRetries,
        });
      } else {
        // Older attempt for the same asset/source
        const existing = groupedMap.get(key)!;
        existing.attemptCount += 1;
        if (isFailure) existing.failureCount += 1;
        if (isSuccess) existing.successCount += 1;
        existing.firstTimestamp = r.timestamp;

        // If existing record was missing isin or assetName, backfill from older record
        if (!existing.isin && r.isin) existing.isin = r.isin;
        if (!existing.assetName && r.assetName) existing.assetName = r.assetName;
        if (!existing.assetType && r.assetType) existing.assetType = r.assetType;
      }
    }

    const allGrouped = Array.from(groupedMap.values());

    if (failedOnly) {
      // Only return assets that remain failed in their latest recorded state
      return allGrouped
        .filter(item => item.level === 'WARN' || item.level === 'ERROR')
        .slice(0, limit);
    }

    return allGrouped.slice(0, limit);
  } catch (e) {
    console.error('Failed to query grouped sync logs', e);
    return [];
  }
}

export function getSyncStats(): SyncStats {
  const db = getDb();
  try {
    const countRow = db.prepare(`SELECT count(*) as count FROM sync_logs`).get() as { count: number };
    const grouped = getGroupedSyncLogs(false, 1000);
    const unresolvedIssues = grouped.filter(g => g.level === 'WARN' || g.level === 'ERROR').length;
    const syncedSuccess = grouped.filter(g => g.level === 'SUCCESS').length;

    return {
      totalAssets: grouped.length,
      unresolvedIssues,
      syncedSuccess,
      totalLogEntries: countRow?.count || 0
    };
  } catch (e) {
    console.error('Failed to get sync stats', e);
    return {
      totalAssets: 0,
      unresolvedIssues: 0,
      syncedSuccess: 0,
      totalLogEntries: 0
    };
  }
}

export function clearLogs() {
  const db = getDb();
  try {
    db.exec(`DELETE FROM sync_logs`);
    if (fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, '', 'utf8');
    }
  } catch (e) {
    console.error('Failed to clear logs', e);
  }
}
