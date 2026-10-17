import type { ProvableCircuitId } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import type { ContractProviders } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { createMidnightProvider, createWalletProvider } from "@midnight-ntwrk/midnight-js-types";
import type { FinalizedTransaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
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
  const walletProvider = createWalletProvider({
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx, ttl) {
      const currentState = await wallet.facade.waitForSyncedState();
      if (currentState.activeProtocolVersion < ProtocolVersion.V9NativeForkVersion) {
        throw new Error("The selected network is not currently using ledger v9");
      }
      const unboundTransaction = WalletTransaction.adopt(
        "Unbound",
        tx,
        currentState.activeProtocolVersion,
      );
      const recipe = await wallet.facade.balanceUnboundTransaction(
        unboundTransaction,
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const finalized = await wallet.facade.finalizeRecipe(recipe);
      const unwrapped = WalletTransaction.unwrapWithin<FinalizedTransaction>(
        finalized,
        ProtocolVersion.makeRange(
          finalized.protocolVersion,
          ProtocolVersion.ProtocolVersion(finalized.protocolVersion + 1n),
        ),
      );
      if (unwrapped._tag === "Left") {
        throw unwrapped.left;
      }
      return unwrapped.right;
    },
  });
  const midnightProvider = createMidnightProvider(async (tx) => {
    const currentState = await wallet.facade.waitForSyncedState();
    if (currentState.activeProtocolVersion < ProtocolVersion.V9NativeForkVersion) {
      throw new Error("The selected network is not currently using ledger v9");
    }
    const finalizedTransaction = WalletTransaction.adopt(
      "Finalized",
      tx,
      currentState.activeProtocolVersion,
    );
    return wallet.facade.submitTransaction(finalizedTransaction);
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
