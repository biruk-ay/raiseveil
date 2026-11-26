import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSignedAttestation } from "../src/services/attestation.js";

const subjectId = "a".repeat(64);

function attestation(activityPolicyId: string) {
  return {
    signature: {
      announcement: { x: "1", y: "2" },
      response: "3",
    },
    message: {
      tradeCount: "1",
      tradeVolume: "100000",
      averageTradeSize: "100000",
      averageReturn: "0",
      startDate: "0",
      lastTradeDate: "0",
      subjectId: "1",
      activityPolicyId,
    },
    stats: {},
    userPubKeyHash: subjectId,
  };
}

function stubAttestationService(activityPolicyId: string) {
  vi.stubEnv("RAISEVEIL_ATTESTATION_API_URL", "https://attestation.example");
  vi.stubEnv("RAISEVEIL_ATTESTATION_SHARED_SECRET", "s".repeat(32));
  vi.stubEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_X", "10");
  vi.stubEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_Y", "20");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const { pathname } = new URL(input instanceof Request ? input.url : String(input));
      const response = pathname === "/provider-info"
        ? { providerId: 1, publicKey: { x: "10", y: "20" } }
        : attestation(activityPolicyId);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("requestSignedAttestation activity policies", () => {
  it("accepts the basic activity policy", async () => {
    stubAttestationService("2");

    await expect(requestSignedAttestation("oanda-token", subjectId)).resolves.toMatchObject({
      message: { activityPolicyId: "2" },
    });
  });

  it("rejects an attestation that meets neither policy", async () => {
    stubAttestationService("0");

    await expect(requestSignedAttestation("oanda-token", subjectId)).rejects.toThrow(
      "Basic activity requires at least 1 executed fill",
    );
  });
});
