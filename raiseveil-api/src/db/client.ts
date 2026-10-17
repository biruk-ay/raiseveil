import "../config/env.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before starting the RaiseVeil API");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const isNeon = parsedDatabaseUrl.hostname.endsWith(".neon.tech");
if (isNeon) {
  parsedDatabaseUrl.searchParams.set("sslmode", "verify-full");
}
const useTls = isNeon || process.env.DATABASE_SSL === "true";

export const pool = new Pool({
  connectionString: parsedDatabaseUrl.toString(),
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  ssl: useTls ? { rejectUnauthorized: true } : undefined,
});

export const db = drizzle(pool, { schema });
