import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

let dbInstance:
  | ReturnType<typeof drizzle>
  | undefined;

function connectionString(): string {
  const raw =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.SUPABASE_DB_URL ??
    "";
  const url = raw.trim();
  if (!url) {
    throw new Error(
      "Database URL is not set. Set DATABASE_URL (or POSTGRES_URL / SUPABASE_DB_URL) in your hosting env.",
    );
  }
  return url;
}

export function getDb() {
  if (!dbInstance) {
    const databaseUrl = connectionString();

    const pool = globalForDb.pool ?? new Pool({ connectionString: databaseUrl });

    if (!globalForDb.pool) {
      globalForDb.pool = pool;
    }

    dbInstance = drizzle(pool);
  }

  return dbInstance;
}

