import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { attestationServer } from "./service.js";

const listener = getRequestListener(attestationServer.fetch);

export default function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  return listener(request, response);
}
