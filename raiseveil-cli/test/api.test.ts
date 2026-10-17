import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseAttestation, readAttestationFile } from "../src/api.js";

function validAttestation() {
  return {
    signature: {
      announcement: { x: "11", y: "12" },
      response: "13",
    },
    message: {
      tradeCount: "4",
      tradeVolume: "500000",
      averageTradeSize: "125000",
      averageReturn: "25000",
      startDate: "1704067200000",
      lastTradeDate: "1704153600000",
    },
    stats: {
      tradeCount: 4,
      tradeVolume: 5,
      averageTradeSize: 1.25,
      averageReturn: 0.25,
      startDate: "2024-01-01T00:00:00.000Z",
      lastTradeDate: "2024-01-02T00:00:00.000Z",
    },
    userPubKeyHash: "42",
  };
}

let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("attestation files", () => {
  it("parses and validates a signed attestation", () => {
    expect(parseAttestation(validAttestation())).toMatchObject({
      signature: {
        announcement: { x: "11", y: "12" },
        response: "13",
      },
      message: { tradeCount: "4", averageReturn: "25000" },
      userPubKeyHash: "42",
    });
  });

  it("rejects an invalid signed field", () => {
    const attestation = validAttestation();
    attestation.message.averageReturn = "-25000";

    expect(() => parseAttestation(attestation)).toThrow(
      "Attestation file contains an invalid average return",
    );
  });

  it("loads and validates JSON from a local attestation file", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "raiseveil-cli-"));
    const path = join(temporaryDirectory, "attestation.json");
    await writeFile(path, JSON.stringify(validAttestation()), "utf8");

    await expect(readAttestationFile(path)).resolves.toMatchObject({
      message: { tradeCount: "4" },
      userPubKeyHash: "42",
    });
  });

  it("rejects malformed JSON from a local file", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "raiseveil-cli-"));
    const path = join(temporaryDirectory, "attestation.json");
    await writeFile(path, "{", "utf8");

    await expect(readAttestationFile(path)).rejects.toThrow(
      "Attestation file must contain valid JSON",
    );
  });
});
