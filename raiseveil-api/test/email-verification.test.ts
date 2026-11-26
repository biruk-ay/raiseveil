import { describe, expect, it } from "vitest";
import { isEmailVerificationRequired } from "../src/auth/email-verification.js";

describe("isEmailVerificationRequired", () => {
  it("requires verification by default in production", () => {
    expect(isEmailVerificationRequired("production", undefined)).toBe(true);
  });

  it("allows explicit opt-out in production", () => {
    expect(isEmailVerificationRequired("production", "false")).toBe(false);
  });

  it("allows explicit opt-in outside production", () => {
    expect(isEmailVerificationRequired("development", "true")).toBe(true);
  });

  it("rejects invalid overrides", () => {
    expect(() => isEmailVerificationRequired("production", "sometimes")).toThrow(
      "REQUIRE_EMAIL_VERIFICATION must be 'true' or 'false'",
    );
  });
});
