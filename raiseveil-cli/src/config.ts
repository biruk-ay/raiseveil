import path from "node:path";
import { fileURLToPath } from "node:url";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

export const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const contractConfig = {
  privateStateStoreName: "raiseveil-private-state",
  zkConfigPath: path.resolve(
    currentDir,
    "..",
    "..",
    "contract",
    "src",
    "managed",
    "raiseveil",
  ),
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkId: string;
}

export class PreprodConfig implements Config {
  private readonly projectId: string;

  constructor() {
    this.projectId = process.env.BLOCKFROST_PROJECT_ID?.trim() ?? "";
    if (!this.projectId) {
      throw new Error("BLOCKFROST_PROJECT_ID is required for the preprod network");
    }
  }

  logDir = path.resolve(
    currentDir,
    "..",
    "logs",
    "preprod",
    `${new Date().toISOString()}.log`,
  );
  get indexer(): string {
    return `https://midnight-preprod.blockfrost.io/api/v0?project_id=${encodeURIComponent(this.projectId)}`;
  }
  get indexerWS(): string {
    return `wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=${encodeURIComponent(this.projectId)}`;
  }
  get node(): string {
    return `wss://rpc.midnight-preprod.blockfrost.io?project_id=${encodeURIComponent(this.projectId)}`;
  }
  proofServer = "http://127.0.0.1:6300";
  networkId = "preprod";
}


export class StandaloneConfig implements Config {
  logDir = path.resolve(
    currentDir,
    "..",
    "logs",
    "standalone",
    `${new Date().toISOString()}.log`,
  );
  indexer = "http://127.0.0.1:8088/api/v4/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v4/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  networkId = "undeployed";
}

export function getConfig(network: string | undefined): Config {
  let config: Config;
  if (network === undefined || network === "standalone") {
    config = new StandaloneConfig();
  } else if (network === "preprod") {
    config = new PreprodConfig();
  } else {
    throw new Error(`Unsupported RAISEVEIL_NETWORK "${network}". Use "standalone" or "preprod".`);
  }

  setNetworkId(config.networkId);
  return config;
}