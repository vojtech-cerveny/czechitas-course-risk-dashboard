import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

let migrated = false;

// Apply migrations once per process. Safe to call on every request / scrape.
export function ensureMigrated() {
  if (migrated) return;
  migrate(db, { migrationsFolder: "./drizzle" });
  migrated = true;
}
