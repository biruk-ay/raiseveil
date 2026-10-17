import { afterEach, describe, expect, it, vi } from "vitest";
import { validateOandaToken } from "../src/services/oanda.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("OANDA token validation", () => {
  it("accepts a token when OANDA returns an accounts list", async () => {
    vi.stubEnv("OANDA_API_URL", "https://api-fxpractice.oanda.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accounts: [{ id: "account-1" }] }), { status: 200 }),
    ));

    await expect(validateOandaToken("secret-token")).resolves.toBeUndefined();
  });

  it("reports rejected credentials without exposing the token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    await expect(validateOandaToken("secret-token")).rejects.toThrow(
      "OANDA rejected this API token",
    );
  });

  it("rejects an insecure remote OANDA endpoint", async () => {
    vi.stubEnv("OANDA_API_URL", "http://broker.example");

    await expect(validateOandaToken("secret-token")).rejects.toThrow(
      "OANDA_API_URL must use HTTPS",
    );
  });
});
