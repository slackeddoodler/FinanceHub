import { PGlite } from "@electric-sql/pglite";

let authDb: PGlite | null = null;
let activeUserDb: PGlite | null = null;

export async function getAuthDb(): Promise<PGlite> {
  if (!authDb) {
    authDb = new PGlite('idb://financehub_system_directory');
    await authDb.waitReady;
  }
  return authDb;
}

export async function setActiveUserDb(username: string): Promise<void> {
  if (activeUserDb) await activeUserDb.close();

  activeUserDb = new PGlite(`idb://financehub_user_${username}`);
  await activeUserDb.waitReady;

  await activeUserDb.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      allocated_budget REAL NOT NULL,
      created_at TIMESTAMP NOT NULL
    );
  `);

  await activeUserDb.query(`
    CREATE TABLE IF NOT EXISTS spend_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      total_amount REAL NOT NULL,
      amount_paid REAL NOT NULL,
      date TIMESTAMP NOT NULL,
      bill_file_id TEXT,
      last_date_of_payment TIMESTAMP
    );
  `);

  // Auto-Healing Migration: Safely patches existing databases
  await activeUserDb.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS bill_file_id TEXT;`);
  await activeUserDb.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS last_date_of_payment TIMESTAMP;`);
}

export async function getDb(): Promise<PGlite> {
  if (!activeUserDb) {
    throw new Error("Mathematical Violation: Attempted to read data before an isolated user database was routed.");
  }
  return activeUserDb;
}