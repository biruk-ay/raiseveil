#!/usr/bin/env node
import { RaiseVeil } from "raiseveil-contract";
import { readAttestationFile } from "./api.js";
import { getConfig } from "./config.js";
import { deployRaiseVeilContract, joinContract } from "./contract.js";
import { assertNetworkSupportsRaiseVeil, createProviders } from "./providers.js";
import type { RaiseVeilPrivateState } from "./types.js";
import { buildWallet } from "./wallet.js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function parseDecimal(value: string, name: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be a non-negative decimal integer`);
  }
  return BigInt(value);
}

function help(): void {
  console.log(`RaiseVeil CLI

Usage:
  raiseveil deploy
  raiseveil verify <contract-address> --attestation-file <path>

Required environment:
  MIDNIGHT_WALLET_SEED                 64-character hexadecimal wallet seed
  RAISEVEIL_PROVIDER_PUBLIC_KEY_X      Locally pinned provider public-key x coordinate
  RAISEVEIL_PROVIDER_PUBLIC_KEY_Y      Locally pinned provider public-key y coordinate
  RAISEVEIL_PRIVATE_STATE_PASSWORD     Strong password for encrypted local private state

Optional environment:
  RAISEVEIL_NETWORK                    "standalone" (default) or "preprod"
  BLOCKFROST_PROJECT_ID                Required when using preprod

The authenticated dashboard creates the attestation file without exposing the broker
token to this CLI. Deploy sets the trusted provider key once in the contract constructor.
Verify checks that key before publishing the six signed values on-chain.`);
}

function createEmptyPrivateState(): RaiseVeilPrivateState {
  return {
    tradeCount: 0n,
    tradeVolume: 0n,
    averageTradeSize: 0n,
    averageReturn: 0n,
    startDate: 0n,
    lastTradeDate: 0n,
    attestationSignature: {
      announcement: { x: 0n, y: 0n },
      response: 0n,
    },
  };
}

function createPrivateState(attestation: Awaited<ReturnType<typeof readAttestationFile>>): RaiseVeilPrivateState {
  return {
    tradeCount: BigInt(attestation.message.tradeCount),
    tradeVolume: BigInt(attestation.message.tradeVolume),
    averageTradeSize: BigInt(attestation.message.averageTradeSize),
    averageReturn: BigInt(attestation.message.averageReturn),
    startDate: BigInt(attestation.message.startDate),
    lastTradeDate: BigInt(attestation.message.lastTradeDate),
    attestationSignature: {
      announcement: {
        x: BigInt(attestation.signature.announcement.x),
        y: BigInt(attestation.signature.announcement.y),
      },
      response: BigInt(attestation.signature.response),
    },
  };
}

async function verify(contractAddress: string, attestationFile: string): Promise<void> {
  const walletSeed = requiredEnv("MIDNIGHT_WALLET_SEED");
  const attestation = await readAttestationFile(attestationFile);
  const pinnedKey = {
    x: parseDecimal(
      requiredEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_X"),
      "RAISEVEIL_PROVIDER_PUBLIC_KEY_X",
    ),
    y: parseDecimal(
      requiredEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_Y"),
      "RAISEVEIL_PROVIDER_PUBLIC_KEY_Y",
    ),
  };
  const privateStatePassword = requiredEnv("RAISEVEIL_PRIVATE_STATE_PASSWORD");
  const config = getConfig(process.env.RAISEVEIL_NETWORK);

  await assertNetworkSupportsRaiseVeil(config);
  const wallet = await buildWallet(walletSeed, config);

  try {
    const providers = await createProviders(wallet, config, privateStatePassword);
    const chainState = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!chainState) {
      throw new Error(`Contract ${contractAddress} was not found on the selected network`);
    }

    const ledgerState = RaiseVeil.ledger(chainState.data);
    if (ledgerState.trustedSignerPk.x !== pinnedKey.x ||
        ledgerState.trustedSignerPk.y !== pinnedKey.y) {
      throw new Error(
        "The contract's trusted signer key does not match the pinned provider key. " +
        "The CLI will not submit trader data to a contract with a different signer key.",
      );
    }

    const initialPrivateState = createPrivateState(attestation);
    const contract = await joinContract(providers, contractAddress, initialPrivateState);
    const txData = await contract.callTx.verifyData();

    console.log("Trader data verified on-chain.");
    console.log(`Transaction: ${txData.public.txId}`);
    console.log(`Block: ${txData.public.blockHeight}`);
    console.log(`Trade count: ${attestation.stats.tradeCount}`);
    console.log(`Trade volume: ${attestation.stats.tradeVolume}`);
    console.log(`Average trade size: ${attestation.stats.averageTradeSize}`);
    console.log(`Average return: ${attestation.stats.averageReturn}`);
    console.log(`First fill: ${attestation.stats.startDate}`);
    console.log(`Last fill: ${attestation.stats.lastTradeDate}`);
  } finally {
    await wallet.facade.stop();
  }
}

async function deploy(): Promise<void> {
  const walletSeed = requiredEnv("MIDNIGHT_WALLET_SEED");
  const trustedSignerPk = {
    x: parseDecimal(
      requiredEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_X"),
      "RAISEVEIL_PROVIDER_PUBLIC_KEY_X",
    ),
    y: parseDecimal(
      requiredEnv("RAISEVEIL_PROVIDER_PUBLIC_KEY_Y"),
      "RAISEVEIL_PROVIDER_PUBLIC_KEY_Y",
    ),
  };
  const privateStatePassword = requiredEnv("RAISEVEIL_PRIVATE_STATE_PASSWORD");
  const config = getConfig(process.env.RAISEVEIL_NETWORK);
  await assertNetworkSupportsRaiseVeil(config);
  const wallet = await buildWallet(walletSeed, config);

  try {
    const providers = await createProviders(wallet, config, privateStatePassword);
    const deployed = await deployRaiseVeilContract(
      providers,
      trustedSignerPk,
      createEmptyPrivateState(),
    );

    console.log("RaiseVeil contract deployed.");
    console.log(`Contract address: ${deployed.deployTxData.public.contractAddress}`);
    console.log(`Transaction: ${deployed.deployTxData.public.txId}`);
    console.log(`Block: ${deployed.deployTxData.public.blockHeight}`);
    console.log(
      "Confirm these signer coordinates match the attestation provider before sharing the address.",
    );
  } finally {
    await wallet.facade.stop();
  }
}

async function main(): Promise<void> {
  const [command, contractAddress, ...extraArgs] = process.argv.slice(2);
  if (command === "--help" || command === "-h" || command === undefined) {
    help();
    return;
  }

  if (command === "deploy") {
    if (contractAddress === "--help" || contractAddress === "-h") {
      help();
      return;
    }
    if (contractAddress !== undefined) {
      throw new Error("Usage: raiseveil deploy");
    }
    await deploy();
    return;
  }

  if (command !== "verify" || contractAddress === "--help" || contractAddress === "-h") {
    help();
    if (command !== "verify") {
      throw new Error(`Unknown command "${command}"`);
    }
    return;
  }
  if (
    !contractAddress ||
    extraArgs.length !== 2 ||
    extraArgs[0] !== "--attestation-file" ||
    !extraArgs[1]
  ) {
    throw new Error("Usage: raiseveil verify <contract-address> --attestation-file <path>");
  }

  await verify(contractAddress, extraArgs[1]);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RaiseVeil command failed: ${message}`);
  process.exitCode = 1;
});
