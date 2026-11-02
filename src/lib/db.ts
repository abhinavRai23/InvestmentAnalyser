import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

let dbInstance: DatabaseSync | null = null;

const DB_PATH = path.join(process.cwd(), 'data', 'investments.db');

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_PATH);

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS groww_cache (
      key TEXT PRIMARY KEY,
      isin TEXT,
      name TEXT,
      nav REAL,
      nav_date TEXT,
      category TEXT,
      sub_category TEXT,
      groww_rating REAL,
      expense_ratio REAL,
      aum REAL,
      exit_load TEXT,
      logo_url TEXT,
      data_json TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_groww_cache_isin ON groww_cache(isin);
    CREATE INDEX IF NOT EXISTS idx_groww_cache_name ON groww_cache(name);

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL, /* 'SUCCESS', 'WARN', 'ERROR' */
      source TEXT NOT NULL, /* 'GROWW', 'YAHOO', 'MFAPI', 'SGB', 'SYSTEM' */
      asset_name TEXT,
      asset_type TEXT,
      isin TEXT,
      message TEXT NOT NULL,
      details_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp);

    CREATE TABLE IF NOT EXISTS sgb_mappings (
      isin TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nse_symbol TEXT NOT NULL,
      groww_search_id TEXT NOT NULL,
      redemption_date TEXT
    );
  `);

  // Seed verified SGB mappings
  const insertSgb = dbInstance.prepare(`
    INSERT OR REPLACE INTO sgb_mappings (isin, name, nse_symbol, groww_search_id, redemption_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const initialSgbs = [
    { isin: 'IN0020230093', name: '2.50%GOLDBONDS2031SR-II', symbol: 'SGBSEP31II', searchId: 'sgbsep31ii', redemption: '2031-09-22' },
    { isin: 'IN0020230069', name: '2.50%GOLDBONDS2031SR-I', symbol: 'SGBJUN31I', searchId: 'sgbjun31i', redemption: '2031-06-27' },
    { isin: 'IN0020210178', name: '2.5%GOLDBONDS2029SR-VII', symbol: 'SGBNV29VII', searchId: 'sgbnv29vii', redemption: '2029-11-02' },
    { isin: 'IN0020230168', name: '2.50%GOLDBONDS2031SR-III', symbol: 'SGBDE31III', searchId: 'sgbde31iii', redemption: '2031-12-28' },
    { isin: 'IN0020230184', name: '2.50%GOLDBONDS2032SR-IV', symbol: 'SGBFEB32IV', searchId: 'sgbfeb32iv', redemption: '2032-02-21' },
  ];

  for (const s of initialSgbs) {
    insertSgb.run(s.isin, s.name, s.symbol, s.searchId, s.redemption);
  }

  return dbInstance;
}

