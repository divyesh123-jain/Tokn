import type { Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "";

export default {
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;

