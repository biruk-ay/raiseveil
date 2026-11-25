import type { ProvableCircuitId } from "@midnight-ntwrk/midnight-js-protocol/v9/compact-js";
import type { ContractProviders } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  createLedger9MidnightProvider,
  createLedger9WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { ProtocolVersion, WalletTransaction } from "@midnight-ntwrk/wallet-sdk";
import { contractConfig, type Config } from "./config.js";
import type { AppContract } from "./types.js";
import type { WalletContext } from "./wallet.js";

export type Providers = ContractProviders<AppContract>;

export async function assertNetworkSupportsRaiseVeil(
  config: Config,
): Promise<void> {
  const publicDataProvider = indexerPublicDataProvider(config.indexer, config.indexerWS);

  try {
    const protocolVersion = await publicDataProvider.queryLatestProtocolVersion();
    if (BigInt(protocolVersion) < ProtocolVersion.V9NativeForkVersion) {
      throw new Error(
        `The selected network is at protocol version ${protocolVersion}; ` +
        `RaiseVeil requires ledger v9 (protocol version ${ProtocolVersion.V9NativeForkVersion}).`,
      );
    }
  } finally {
    await publicDataProvider.dispose();
  }
}

async function createWalletProviders(
  wallet: WalletContext,
): Promise<{ walletProvider: Providers["walletProvider"]; midnightProvider: Providers["midnightProvider"] }> {
  const state = await wallet.facade.waitForSyncedState();
  if (state.activeProtocolVersion < ProtocolVersion.V9NativeForkVersion) {
    throw new Error(
      "The RaiseVeil contract requires ledger v9, but the selected network has not reached its v9 protocol version",
    );
  }
  const walletProvider = createLedger9WalletProvider({
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx, ttl) {
      const currentState = await wallet.facade.waitForSyncedState();
      if (currentState.activeProtocolVersion < ProtocolVersion.V9NativeForkVersion) {
        throw new Error("The selected network is not currently using ledger v9");
      }
      const recipe = await wallet.facade.balanceUnboundTransaction(
        wallet.facade.adoptTransaction(tx.serialize(), "Unbound"),
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signed = await wallet.facade.signRecipe(
        recipe,
        wallet.keystore.signDataAsync,
      );
      const finalized = await wallet.facade.finalizeRecipe(signed);
      return Buffer.from(WalletTransaction.toWire(finalized).transaction, "hex");
    },
  });
  const midnightProvider = createLedger9MidnightProvider(async (tx) => {
    const currentState = await wallet.facade.waitForSyncedState();
    if (currentState.activeProtocolVersion < ProtocolVersion.V9NativeForkVersion) {
      throw new Error("The selected network is not currently using ledger v9");
    }
    return wallet.facade.submitTransaction(
      wallet.facade.adoptTransaction(tx.serialize(), "Finalized"),
    );
  });
  return { walletProvider, midnightProvider };
}

export async function createProviders(
  wallet: WalletContext,
  config: Config,
  privateStatePassword: string,
): Promise<Providers> {
  const { walletProvider, midnightProvider } = await createWalletProviders(wallet);
  const zkConfigProvider = new NodeZkConfigProvider<ProvableCircuitId<AppContract>>(
    contractConfig.zkConfigPath,
  );

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: contractConfig.privateStateStoreName,
      privateStoragePasswordProvider: () => privateStatePassword,
      accountId: wallet.accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider,
    config: {
      networkId: config.networkId,
      ttlSeconds: 30 * 60,
    },
  };
}
