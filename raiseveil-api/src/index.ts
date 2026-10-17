import { serve } from "@hono/node-server";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { auth } from "./auth/index.js";
import { pool } from "./db/client.js";
import { api } from "./routes/api.js";

const app = new Hono();
const trustedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "/api/*",
  cors({
    origin: trustedOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/api/*", bodyLimit({ maxSize: 32 * 1024 }));
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.get("/api/health", async (c) => {
  await pool.query("select 1");
  return c.json({ status: "ok" });
});
app.route("/", api);
app.onError((error, c) => {
  console.error("RaiseVeil API request failed", error);
  return c.json({ error: "The request could not be completed" }, 500);
});
app.notFound((c) => c.json({ error: "Route not found" }, 404));

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const server = serve(
  {
    fetch: app.fetch,
    hostname: process.env.HOST ?? "127.0.0.1",
    port,
  },
  (info) => {
    console.info(`RaiseVeil API listening on http://${info.address}:${info.port}`);
  },
);

async function shutdown(): Promise<void> {
  server.close();
  await pool.end();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
