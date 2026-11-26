function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class AttestationServiceError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AttestationServiceError";
  }
}

function requireDecimal(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`Attestation service returned invalid ${field}`);
  }
  return value;
}

function getBaseUrl(): URL {
  const rawUrl = process.env.RAISEVEIL_ATTESTATION_API_URL;
  if (!rawUrl) {
    throw new Error("RAISEVEIL_ATTESTATION_API_URL is not configured");
  }

  const url = new URL(rawUrl);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  ) {
    throw new Error("The attestation service URL must use HTTPS except on localhost");
  }
  return url;
}

async function requestJson(url: URL, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string" ? body.error : response.statusText;
    throw new AttestationServiceError(response.status, message);
  }
  return body;
}

function validateAttestation(
  value: unknown,
): Record<string, unknown> & {
  userPubKeyHash: string;
  message: Record<string, string>;
} {
  if (
    !isRecord(value) ||
    !isRecord(value.signature) ||
    !isRecord(value.signature.announcement) ||
    !isRecord(value.message) ||
    !isRecord(value.stats)
  ) {
    throw new Error("Attestation service returned an invalid attestation");
  }
  const announcement = value.signature.announcement;
  const message = value.message;
  requireDecimal(announcement.x, "signature announcement x coordinate");
  requireDecimal(announcement.y, "signature announcement y coordinate");
  requireDecimal(value.signature.response, "signature response");
  for (const field of [
    "tradeCount",
    "tradeVolume",
    "averageTradeSize",
    "averageReturn",
    "startDate",
    "lastTradeDate",
    "subjectId",
    "activityPolicyId",
  ]) {
    requireDecimal(message[field], field);
  }
  if (typeof value.userPubKeyHash !== "string" ||
      !/^[a-fA-F0-9]{64}$/.test(value.userPubKeyHash)) {
    throw new Error("Attestation service returned invalid subject metadata");
  }
  return value as Record<string, unknown> & {
    userPubKeyHash: string;
    message: Record<string, string>;
  };
}

export async function requestSignedAttestation(
  token: string,
  subjectId: string,
): Promise<Record<string, unknown>> {
  const sharedSecret = process.env.RAISEVEIL_ATTESTATION_SHARED_SECRET;
  const expectedKeyX = process.env.RAISEVEIL_PROVIDER_PUBLIC_KEY_X;
  const expectedKeyY = process.env.RAISEVEIL_PROVIDER_PUBLIC_KEY_Y;
  if (!sharedSecret || sharedSecret.length < 32) {
    throw new Error("RAISEVEIL_ATTESTATION_SHARED_SECRET must contain at least 32 characters");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(subjectId)) {
    throw new Error("The subject identifier must be a 32-byte hexadecimal value");
  }
  if (!expectedKeyX || !/^\d+$/.test(expectedKeyX) || !expectedKeyY || !/^\d+$/.test(expectedKeyY)) {
    throw new Error("The expected provider public key must be configured as decimal coordinates");
  }

  const baseUrl = getBaseUrl();
  const providerInfo = await requestJson(new URL("/provider-info", baseUrl));
  if (
    !isRecord(providerInfo) ||
    !isRecord(providerInfo.publicKey) ||
    providerInfo.publicKey.x !== expectedKeyX ||
    providerInfo.publicKey.y !== expectedKeyY
  ) {
    throw new Error("The attestation service public key does not match the trusted provider key");
  }

  const response = await requestJson(new URL("/attest", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sharedSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, userPubKeyHash: subjectId }),
  });
  const attestation = validateAttestation(response);
  if (attestation.userPubKeyHash !== subjectId.toLowerCase()) {
    throw new Error("Attestation service returned an unexpected subject identifier");
  }
  if (attestation.message.activityPolicyId !== "0" &&
      attestation.message.activityPolicyId !== "1" &&
      attestation.message.activityPolicyId !== "2") {
    throw new Error("Attestation service returned an unknown activity policy");
  }
  if (attestation.message.activityPolicyId === "0") {
    throw new AttestationServiceError(
      422,
      "Your OANDA history does not meet either activity policy yet. Basic activity requires at least 1 executed fill; long-term activity requires at least 100 executed fills spanning 180 days.",
    );
  }
  return attestation;
}
