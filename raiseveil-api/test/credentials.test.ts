import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptCredential, encryptCredential } from "../src/services/credentials.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("broker credential encryption", () => {
  it("encrypts credentials with a fresh IV and decrypts them", () => {
    vi.stubEnv("BROKER_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const first = encryptCredential("oanda-secret-token");
    const second = encryptCredential("oanda-secret-token");

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toContain("oanda-secret-token");
    expect(decryptCredential(first)).toBe("oanda-secret-token");
  });

  it("rejects an invalid configured key", () => {
    vi.stubEnv("BROKER_ENCRYPTION_KEY", "not-a-32-byte-key");

    expect(() => encryptCredential("secret")).toThrow(
      "BROKER_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  });

  it("rejects ciphertext tampering", () => {
    vi.stubEnv("BROKER_ENCRYPTION_KEY", Buffer.alloc(32, 3).toString("base64"));
    const encrypted = encryptCredential("oanda-secret-token");
    encrypted.ciphertext = Buffer.alloc(16, 0).toString("base64");

    expect(() => decryptCredential(encrypted)).toThrow();
  });
});
