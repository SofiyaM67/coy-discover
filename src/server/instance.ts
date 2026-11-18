import path from "node:path";
import { ensureSchema, openDatabase, type DB } from "./db";
import { createDiscoverService, type DiscoverService } from "./discover";
import { seedIfEmpty } from "./seed";

export { CURRENT_USER_ID } from "./seed-data";

/**
 * Hosted Turso database in production (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN),
 * a local SQLite file otherwise.
 */
export const DB_URL =
  process.env.TURSO_DATABASE_URL ?? `file:${process.env.COY_DB_PATH ?? path.join(process.cwd(), "data", "coy.db")}`;

// Only the connection is shared on globalThis, so dev hot reloads and every
// route bundle reuse one connection. The service is built per module: Next
// bundles each route separately, and a service shared across bundles would
// throw error classes from another bundle's copy of the code.
const g = globalThis as unknown as { __coyLibsql?: Promise<DB> };
let ready: Promise<{ db: DB; service: DiscoverService }> | undefined;

function getDb(): Promise<DB> {
  g.__coyLibsql ??= openDatabase(DB_URL, process.env.TURSO_AUTH_TOKEN).then(async (db) => {
    await seedIfEmpty(db);
    return db;
  });
  // Don't cache a failed connection attempt.
  g.__coyLibsql.catch(() => (g.__coyLibsql = undefined));
  return g.__coyLibsql;
}

export function getInstance(): Promise<{ db: DB; service: DiscoverService }> {
  ready ??= getDb().then(async (db) => {
    // The connection can outlive a code reload, so apply any new tables here too.
    await ensureSchema(db);
    return { db, service: createDiscoverService(db) };
  });
  ready.catch(() => (ready = undefined));
  return ready;
}
