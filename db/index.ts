import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

let dbInstance:
  | ReturnType<typeof drizzle>
  | undefined;

export function getDb() {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = globalForDb.pool ?? new Pool({ connectionString: databaseUrl });

    if (!globalForDb.pool) {
      globalForDb.pool = pool;
    }

    dbInstance = drizzle(pool);
  }

  return dbInstance;
}

