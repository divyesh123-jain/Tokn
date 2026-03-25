import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "";

export default {
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;

