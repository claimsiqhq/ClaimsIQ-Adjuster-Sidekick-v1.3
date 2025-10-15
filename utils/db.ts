// utils/db.ts
// SQLite database initialization and helpers

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('claimsiq.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  // Create tables
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      claim_number TEXT,
      policy_number TEXT,
      carrier_name TEXT,
      insured_name TEXT,
      insured_phone TEXT,
      insured_email TEXT,
      adjuster_name TEXT,
      adjuster_email TEXT,
      adjuster_phone TEXT,
      loss_date TEXT,
      reported_date TEXT,
      loss_type TEXT,
      loss_location TEXT,
      loss_description TEXT,
      cause_of_loss TEXT,
      estimated_loss REAL,
      status TEXT,
      metadata TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      claim_id TEXT,
      user_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      label TEXT,
      local_uri TEXT,
      storage_path TEXT,
      anno_count INTEGER,
      qc TEXT,
      annotation_json TEXT,
      last_error TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      claim_id TEXT,
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      local_uri TEXT,
      storage_path TEXT,
      mime_type TEXT,
      file_size_bytes INTEGER,
      extracted_data TEXT,
      extraction_status TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      synced INTEGER DEFAULT 0,
      error TEXT,
      retry_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
    CREATE INDEX IF NOT EXISTS idx_claims_synced ON claims(synced);
    CREATE INDEX IF NOT EXISTS idx_media_claim_id ON media(claim_id);
    CREATE INDEX IF NOT EXISTS idx_media_synced ON media(synced);
    CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON documents(claim_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
  `);
}

export async function executeQuery(sql: string, params: any[] = []): Promise<any> {
  const database = await getDatabase();
  return database.runAsync(sql, params);
}

export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const database = await getDatabase();
  return database.getAllAsync(sql, params);
}

export async function queryFirst(sql: string, params: any[] = []): Promise<any | null> {
  const database = await getDatabase();
  return database.getFirstAsync(sql, params);
}

