import type { ConnectedAPI } from "@midnightntwrk/dapp-connector-api";
import {
  dappConnectorProofProvider,
  dappConnectorWalletProviders,
} from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import {
  indexerPublicDataProvider,
  type IndexerProviderConfig,
} from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { CostModel } from "@midnight-ntwrk/midnight-js-protocol/v9";
import type {
  ContractPrivateStates,
  PrivateStateProvider,
} from "@midnight-ntwrk/midnight-js-types";
import type {
  ContractAddress,
  SigningKey,
} from "@midnight-ntwrk/midnight-js-protocol/v9/compact-runtime";
import {
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,
  assertIsContractAddress,
} from "@midnight-ntwrk/midnight-js-utils";
import type { RaiseVeilPrivateState } from "./raiseveil.js";

export const MIDNIGHT_NETWORK_ID = import.meta.env.VITE_NETWORK_ID || "preprod";

export function inMemoryPrivateStateProvider():
  PrivateStateProvider<"raiseveil", RaiseVeilPrivateState> {
  const states = new Map<ContractAddress, Map<"raiseveil", RaiseVeilPrivateState>>();
  const signingKeys = new Map<ContractAddress, SigningKey>();
  const unsupported = (method: string) => async (): Promise<never> => {
    throw new Error(`In-memory private state does not support ${method}`);
  };

  const forContract = (address: ContractAddress): ContractPrivateStates<"raiseveil", RaiseVeilPrivateState> => {
    assertIsContractAddress(address);
    const key = address.toLowerCase();
    const scoped = (): Map<"raiseveil", RaiseVeilPrivateState> => {
      let state = states.get(key);
      if (!state) {
        state = new Map();
        states.set(key, state);
      }
      return state;
    };

    return {
      contractAddress: key,
      get: async (id) => states.get(key)?.get(id) ?? null,
      set: async (id, value) => {
        scoped().set(id, value);
      },
      remove: async (id) => {
        states.get(key)?.delete(id);
      },
      clear: async () => {
        states.delete(key);
      },
      exportPrivateStates: unsupported("exportPrivateStates"),
      importPrivateStates: unsupported("importPrivateStates"),
    };
  };

  return {
    forContract,
    clearAll: async () => {
      states.clear();
    },
    setSigningKey: async (address, key) => {
      signingKeys.set(address, key);
    },
    getSigningKey: async (address) => signingKeys.get(address) ?? null,
    removeSigningKey: async (address) => {
      signingKeys.delete(address);
    },
    clearSigningKeys: async () => {
      signingKeys.clear();
    },
    exportSigningKeys: unsupported("exportSigningKeys"),
    importSigningKeys: unsupported("importSigningKeys"),
  };
}

export async function createBrowserProviders(api: ConnectedAPI) {
  const config = await api.getConfiguration();
  if (config.networkId !== MIDNIGHT_NETWORK_ID) {
    throw new Error(`Connect Lace to the Midnight ${MIDNIGHT_NETWORK_ID} network to continue.`);
  }

  const publicDataProvider = indexerPublicDataProvider({
    queryURL: config.indexerUri,
    subscriptionURL: config.indexerWsUri,
    webSocket: globalThis.WebSocket as unknown as IndexerProviderConfig["webSocket"],
  });
  const zkConfigProvider = new FetchZkConfigProvider<"verifyData">(
    new URL(`${import.meta.env.BASE_URL}raiseveil-contract/`, window.location.origin).toString(),
    { fetchFunc: fetch.bind(globalThis) },
  );
  const proofProvider = await dappConnectorProofProvider(
    api,
    zkConfigProvider,
    CostModel.initialCostModel(),
  );
  const connector = await dappConnectorWalletProviders(api);
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
    await api.getShieldedAddresses();
  const coinPublicKey = parseCoinPublicKeyToHex(shieldedCoinPublicKey, config.networkId);
  const encryptionPublicKey = parseEncPublicKeyToHex(shieldedEncryptionPublicKey, config.networkId);

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: {
      supportedEras: connector.walletProvider.supportedEras,
      balanceTx: connector.walletProvider.balanceTx.bind(connector.walletProvider),
      getCoinPublicKey: () => coinPublicKey,
      getEncryptionPublicKey: () => encryptionPublicKey,
    },
    midnightProvider: connector.midnightProvider,
    config: { networkId: config.networkId, ttlSeconds: 3600 },
    dispose: () => publicDataProvider.dispose(),
  };
}
