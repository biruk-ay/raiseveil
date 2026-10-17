import { attestationServer } from "./service.js";

const port = Number(process.env.ATTESTATION_PORT ?? '3100');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('ATTESTATION_PORT must be an integer between 1 and 65535');
}

attestationServer.listen(port, () => {
  console.info(`RaiseVeil attestation service listening on port ${port}`);
});
