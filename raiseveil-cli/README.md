# RaiseVeil CLI

The CLI deploys the RaiseVeil contract with the trusted provider public key
embedded in its sealed ledger, or submits a server-generated OANDA attestation
to an existing contract after checking the signer's public key.

## Build

The contract uses language version 0.27 and requires Compact compiler 0.35.0
(runtime 0.20.0). Select that toolchain before building:

```sh
compact update 0.35.0
npm run build --workspace raiseveil-cli
```

This compiles the Compact contract, builds its TypeScript package, and builds
the CLI. The compiled contract assets are read from `contract/src/managed`.
The CLI uses Midnight SDK 5.0.0-rc.4 and Wallet SDK 2.0.0-rc.1 to support the
contract's runtime; both dependencies are release candidates.

## Configure

Set these variables in the repository-root `.env` file. The `start` and `dev`
scripts load that file automatically:

| Variable | Purpose |
| --- | --- |
| `MIDNIGHT_WALLET_SEED` | 32-byte wallet seed as 64 hexadecimal characters |
| `RAISEVEIL_PROVIDER_PUBLIC_KEY_X` | Locally trusted provider public-key X coordinate, decimal |
| `RAISEVEIL_PROVIDER_PUBLIC_KEY_Y` | Locally trusted provider public-key Y coordinate, decimal |
| `RAISEVEIL_PRIVATE_STATE_PASSWORD` | Password used to encrypt persisted private state |

`RAISEVEIL_NETWORK` is optional and defaults to `standalone`. Supported values
are `standalone` and `preprod`. Standalone requires a running local Midnight
node, indexer, and proof server. Preprod requires `BLOCKFROST_PROJECT_ID` and
the configured proof server at `http://127.0.0.1:6300`.

The wallet seed must be the existing wallet's 32-byte seed; do not generate a
replacement if you intend to use an already-funded account. Set a strong,
persistent `RAISEVEIL_PRIVATE_STATE_PASSWORD` yourself. The provider key
coordinates must be decimal values independently verified against the
attestation provider's public key. The deployment command uses these values as
the contract's immutable trusted signer key.

Keep the wallet seed and OANDA token secret. Prefer injecting them through a
secret manager rather than storing them in shell history or source control.
The CLI does not need the OANDA token or attestation API URL: the authenticated
dashboard requests and downloads the signed attestation. The user hash is
response metadata and is not included in the contract's signed message.

## Deploy and verify trader data

Deploy the contract after starting the selected network's node, indexer, and
proof server:

```sh
npm run start --workspace raiseveil-cli -- deploy
```

The command prints the contract address, transaction, and block. Link that
address from the dashboard's contract-address field. The deployed signer key
cannot be changed; redeploy if the provider key is incorrect.

Then create an attestation from the dashboard and submit it:

```sh
npm run start --workspace raiseveil-cli -- verify <contract-address> \
  --attestation-file ./raiseveil-attestation.json
```

Verification checks that the contract's sealed trusted signer key matches the
provider key pinned above before submitting trader data.
