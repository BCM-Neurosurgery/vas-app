import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
    if (!db) throw new Error("DB not initialized. Call initDb() first.");
    return db;
}

export async function initDb(): Promise<void> {
    if (db) return;
    db = await SQLite.openDatabaseAsync("survey_local.db")
    await db.execAsync(SCHEMA_SQL);
}

// Convenience helpers

export async function runAsync(sql: string, args: any[] = []): Promise<void> {
  const d = getDb();
  await d.runAsync(sql, args);
}

export async function getAllAsync<T>(sql: string, args: any[] = []): Promise<T[]> {
  const d = getDb();
  return await d.getAllAsync<T>(sql, args);
}

export async function getFirstAsync<T>(sql: string, args: any[] = []): Promise<T | null> {
  const d = getDb();
  const row = await d.getFirstAsync<T>(sql, args);
  return row ?? null;
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const d = getDb();
  await d.execAsync("BEGIN;");
  try {
    const out = await fn();
    await d.execAsync("COMMIT;");
    return out;
  } catch (e) {
    await d.execAsync("ROLLBACK;");
    throw e;
  }
}