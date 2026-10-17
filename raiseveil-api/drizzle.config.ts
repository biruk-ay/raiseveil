import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), "../.env") });

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL before running Drizzle migrations");
}
const migrationDatabaseUrl = new URL(databaseUrl);
if (migrationDatabaseUrl.hostname.endsWith(".neon.tech")) {
  migrationDatabaseUrl.searchParams.set("sslmode", "verify-full");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseUrl.toString(),
  },
});
