import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), "../.env") });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/raiseveil",
  },
});
