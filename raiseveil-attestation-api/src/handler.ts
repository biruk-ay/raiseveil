import type { IncomingMessage, ServerResponse } from "node:http";
import { attestationServer } from "./service.js";

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  attestationServer.emit("request", request, response);
}
