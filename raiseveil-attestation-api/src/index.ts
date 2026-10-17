import { serve } from "@hono/node-server";
import { attestationServer } from "./service.js";

const port = Number(process.env.ATTESTATION_PORT ?? '3100');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('ATTESTATION_PORT must be an integer between 1 and 65535');
}

const server = serve(
  {
    fetch: attestationServer.fetch,
    hostname: process.env.HOST ?? '127.0.0.1',
    port,
  },
  (info) => {
    console.info(`RaiseVeil attestation service listening on http://${info.address}:${info.port}`);
  },
);

process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
