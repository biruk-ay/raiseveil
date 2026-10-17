import { RaiseVeil } from "raiseveil-contract";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { RawTraderStats } from "./trader-stats.js";

export interface VerifiedContractState {
  contractAddress: string;
  stats: RawTraderStats;
}

const PREPROD_INDEXER_HTTP_URL = "https://midnight-preprod.blockfrost.io/api/v0";
const PREPROD_INDEXER_WS_URL = "wss://midnight-preprod.blockfrost.io/api/v0/ws";

function withProjectId(endpoint: string, projectId: string): string {
  const url = new URL(endpoint);
  url.searchParams.set("project_id", projectId);
  return url.toString();
}

function getNetworkConfig() {
  const networkId =
    process.env.MIDNIGHT_NETWORK_ID ??
    (process.env.VERCEL === "1" ? "preprod" : "undeployed");
  const projectId = process.env.BLOCKFROST_PROJECT_ID?.trim();
  const preprodQueryURL = projectId
    ? withProjectId(PREPROD_INDEXER_HTTP_URL, projectId)
    : undefined;
  const preprodSubscriptionURL = projectId
    ? withProjectId(PREPROD_INDEXER_WS_URL, projectId)
    : undefined;
  const queryURL =
    process.env.MIDNIGHT_INDEXER_URL ??
    (networkId === "preprod"
      ? preprodQueryURL
      : "http://127.0.0.1:8088/api/v4/graphql");
  const subscriptionURL =
    process.env.MIDNIGHT_INDEXER_WS_URL ??
    (networkId === "preprod"
      ? preprodSubscriptionURL
      : "ws://127.0.0.1:8088/api/v4/graphql/ws");
  const expectedKeyX = process.env.RAISEVEIL_PROVIDER_PUBLIC_KEY_X;
  const expectedKeyY = process.env.RAISEVEIL_PROVIDER_PUBLIC_KEY_Y;

  if (!queryURL || !subscriptionURL) {
    throw new Error(
      "Configure BLOCKFROST_PROJECT_ID or both Midnight indexer URLs for Preprod",
    );
  }

  if (!expectedKeyX || !/^\d+$/.test(expectedKeyX) || !expectedKeyY || !/^\d+$/.test(expectedKeyY)) {
    throw new Error("The expected provider public key must be configured as decimal coordinates");
  }

  return { networkId, queryURL, subscriptionURL, expectedKeyX, expectedKeyY };
}

export async function readVerifiedContract(
  contractAddress: string,
): Promise<VerifiedContractState> {
  if (contractAddress.length < 20 || contractAddress.length > 128) {
    throw new Error("Enter a valid Midnight contract address");
  }

  const config = getNetworkConfig();
  setNetworkId(config.networkId);
  const provider = indexerPublicDataProvider(config.queryURL, config.subscriptionURL);

  try {
    const state = await provider.queryContractState(contractAddress);
    if (!state) {
      throw new Error("No contract was found at that address on the selected network");
    }

    const ledger = RaiseVeil.ledger(state.data);
    if (
      ledger.trustedSignerPk.x.toString() !== config.expectedKeyX ||
      ledger.trustedSignerPk.y.toString() !== config.expectedKeyY
    ) {
      throw new Error("This contract is not configured with RaiseVeil's trusted attestation key");
    }

    const stats = {
      tradeCount: ledger.traderData.tradeCount,
      tradeVolume: ledger.traderData.tradeVolume,
      averageTradeSize: ledger.traderData.averageTradeSize,
      averageReturn: ledger.traderData.averageReturn,
      startDate: ledger.traderData.startDate,
      lastTradeDate: ledger.traderData.lastTradeDate,
    };

    if (stats.tradeCount <= 0n) {
      throw new Error("This contract has not published verified trader data yet");
    }

    return { contractAddress, stats };
  } finally {
    await provider.dispose();
  }
}
