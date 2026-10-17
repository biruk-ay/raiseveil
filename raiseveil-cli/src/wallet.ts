import { WebSocket } from "ws";
import {
  createKeystore,
  DustWallet,
  HDWallet,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  Roles,
  ShieldedWallet,
  UnshieldedWallet,
  WalletEntrySchema,
  WalletFacade,
  WalletSeeds,
} from "@midnight-ntwrk/wallet-sdk";
import type { Config } from "./config.js";

// The wallet's indexer client uses WebSocket subscriptions in Node.js.
// @ts-expect-error Install the Node.js WebSocket implementation for the SDK.
globalThis.WebSocket = WebSocket;

export interface WalletContext {
  facade: WalletFacade;
  accountId: string;
}

function deriveUnshieldedSecretKey(seed: Uint8Array): Uint8Array {
  const result = HDWallet.fromSeed(seed);
  if (result.type !== "seedOk") {
    throw new Error("Unable to derive wallet keys from MIDNIGHT_WALLET_SEED");
  }

  try {
    const derived = result.hdWallet
      .selectAccount(0)
      .selectRoles([Roles.EcdsaUnshielded])
      .deriveKeysAt(0);
    if (derived.type !== "keysDerived") {
      throw new Error("Wallet key derivation failed");
    }

    return derived.keys[Roles.EcdsaUnshielded];
  } finally {
    result.hdWallet.clear();
  }
}

export async function buildWallet(
  seed: string,
  config: Config,
): Promise<WalletContext> {
  if (!/^[\da-fA-F]{64}$/.test(seed)) {
    throw new Error("MIDNIGHT_WALLET_SEED must be 64 hexadecimal characters");
  }
  const seedBytes = Buffer.from(seed, "hex");
  const unshieldedSecretKey = deriveUnshieldedSecretKey(seedBytes);
  const keystore = createKeystore(
    { kind: "ecdsa", secret: unshieldedSecretKey },
    config.networkId,
  );

  const walletConfiguration = {
    networkId: config.networkId,
    provers: {
      v9: { kind: "server" as const, url: new URL(config.proofServer) },
    },
    indexerClientConnection: {
      indexerHttpUrl: config.indexer,
      indexerWsUrl: config.indexerWS,
    },
    relayURL: new URL(config.node),
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema),
  };
  const walletSeeds = WalletSeeds.fromMasterSeed(seedBytes, {
    unshieldedRole: Roles.EcdsaUnshielded,
  });

  let facade: WalletFacade;
  try {
    facade = await WalletFacade.init({
      configuration: walletConfiguration,
      shielded: (walletConfig) =>
        ShieldedWallet(walletConfig).startWithSeed(walletSeeds.shielded),
      unshielded: (walletConfig) =>
        UnshieldedWallet({
          ...walletConfig,
          txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema),
        }).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
      dust: (walletConfig) => DustWallet(walletConfig).startWithSeed(walletSeeds.dust),
    });
    await facade.start(walletSeeds);
  } finally {
    seedBytes.fill(0);
  }

  return {
    facade,
    accountId: keystore.getBech32Address().toString(),
  };
}
