import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { env } from "@/lib/env";

// Single shared connection. Next.js may re-import in dev, so cache on globalThis.
const globalForDb = globalThis as unknown as {
  __sqlite?: Database.Database;
};

function createConnection() {
  mkdirSync(dirname(env.databasePath), { recursive: true });
  const sqlite = new Database(env.databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

const sqlite = globalForDb.__sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
