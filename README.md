# RaiseVeil

RaiseVeil is a marketplace for trader records that can be checked against
publicly verifiable smart-contract data. A trader connects an OANDA account,
requests a signed summary of their trading history, and uses the RaiseVeil CLI
to submit that summary to a Midnight contract. Once the contract publishes the
verified values, the trader can link it to a public profile for others to
explore.

RaiseVeil is not an investment service. Public stats describe past activity and
are not investment advice or a guarantee of future results.

## What the app includes

- A public landing page, trader marketplace, and profile pages.
- Email-and-password signup, login, and password reset using Better Auth.
- A signed-in dashboard for connecting OANDA, requesting an attestation,
  submitting verified data, and managing profile visibility.
- A backend API using PostgreSQL and Drizzle ORM.
- An attestation service that retrieves OANDA trading history, calculates the
  supported trader summary, and signs its contract-encoded values.
- A Compact smart contract that verifies the attestation signature and
  publishes the six supported trader fields to the Midnight ledger.
- A CLI that checks the attestation and contract signer keys before submitting
  the contract transaction.

## How verification works

1. **Connect a broker.** The signed-in trader submits an OANDA API token through
   the dashboard. The API validates the token with OANDA and encrypts it with
   AES-256-GCM before storing it in PostgreSQL. The raw token is not returned
   by the API.
2. **Create a signed summary.** The dashboard asks the RaiseVeil API for an
   attestation. The API decrypts the token in memory and calls the internal
   attestation service using a shared bearer secret. The attestation service
   fetches the account's trading history, calculates the supported stats, and
   signs the encoded values with its provider key.
3. **Download the attestation.** The dashboard returns the signed JSON file to
   the trader. The CLI uses this file; the CLI does not need the broker token
   or a direct connection to the attestation API.
4. **Verify and publish on Midnight.** The CLI checks the provider key against
   the locally pinned coordinates and the deployed contract's `trustedSignerPk`.
   If the keys differ, it stops without changing the contract configuration.
   The CLI then calls `verifyData`; the contract verifies the Schnorr
   signature and publishes the signed trader data to its public ledger.
5. **Link a public profile.** The account owner enters the deployed contract
   address in the dashboard. The API reads the ledger through the Midnight
   indexer, checks the trusted provider key and that trader data exists, and
   stores a profile snapshot in PostgreSQL. Public marketplace and profile
   pages display this snapshot. Link the contract again after a later
   verification to update the stored snapshot.

The contract currently exposes only:

- Trade count
- Trade volume
- Average trade size
- Average return
- First trade date
- Last trade date

RaiseVeil does not currently expose account balance, profit and loss, win rate,
or other metrics not present in the contract.

## System layout

| Workspace | Responsibility |
| --- | --- |
| `raiseveil-ui` | React/Vite landing page, login/signup, dashboard, marketplace, and public trader profiles |
| `raiseveil-api` | Better Auth, PostgreSQL persistence, encrypted broker credentials, public API, and Midnight indexer integration |
| `raiseveil-attestation-api` | OANDA history retrieval, trader-stat calculation, and provider signing |
| `raiseveil-cli` | Reads a downloaded attestation, checks signer configuration, creates the Midnight transaction, and submits `verifyData` |
| `contract` | Compact source, TypeScript witness, and generated contract package/assets |

The API and attestation service are separate processes. The API calls the
attestation service over HTTP; the browser never receives the provider private
key or the stored OANDA token. In production, place both services behind
appropriate network controls and keep secrets in a secret manager.

## Requirements

- Node.js 22 or later and npm.
- PostgreSQL.
- Compact compiler 0.35.0 for compiling the current contract.
- A configured OANDA API token for the account whose history will be attested.
- A running Midnight network and indexer. The CLI also needs the network node,
  proof server, and contract ZK configuration.
- A deployed RaiseVeil contract whose `trustedSignerPk` is configured to the
  provider public key used by the attestation service.

For local standalone use, the current defaults expect the Midnight indexer at
`http://127.0.0.1:8088`, node at `http://127.0.0.1:9944`, and proof server at
`http://127.0.0.1:6300`. For preprod, configure the project ID and the
appropriate network services.

## Local setup

### 1. Install dependencies and configure environment

From the repository root:

```sh
npm install
cp .env.example .env
```

Fill in the values needed for the services you plan to run. Generate different
random values for `BETTER_AUTH_SECRET`, `BROKER_ENCRYPTION_KEY`, and
`RAISEVEIL_ATTESTATION_SHARED_SECRET`; use `openssl rand -base64 32` for each
secret. The encryption key must decode from Base64 to exactly 32 bytes.

Set the provider public-key coordinates in
`RAISEVEIL_PROVIDER_PUBLIC_KEY_X` and
`RAISEVEIL_PROVIDER_PUBLIC_KEY_Y`. They must match the public key derived from
the provider signing key, the deployed contract's `trustedSignerPk`, and the
public key pinned by the CLI.

Keep `RAISEVEIL_PROVIDER_SECRET_KEY` private to the attestation service. Never
commit `.env`, wallet seeds, broker tokens, encryption keys, auth secrets, or
provider signing keys.

### 2. Start PostgreSQL and migrate the database

Create a PostgreSQL database and set its connection string in `DATABASE_URL`.
Then apply the Drizzle migrations:

```sh
npm run db:migrate --workspace raiseveil-api
```

To generate a new migration after changing the API schema:

```sh
npm run db:generate --workspace raiseveil-api
```

### 3. Start the services

Run each command in its own terminal from the repository root:

```sh
npm run dev --workspace raiseveil-api
```

```sh
npm run dev --workspace raiseveil-attestation-api
```

```sh
npm run dev --workspace raiseveil-ui
```

The UI is served at `http://localhost:5173`. In development, Vite forwards
`/api` requests to the API at `http://localhost:3000`. The API and the
attestation service load the repository-root `.env`.

For email verification and password-reset delivery, configure `SMTP_URL` and
`AUTH_EMAIL_FROM`. Verification is required in production; it can be enabled
locally with `REQUIRE_EMAIL_VERIFICATION=true`.

### 4. Build and configure the contract

Install/select Compact 0.35.0, then build the contract and CLI:

```sh
compact update 0.35.0
npm run build --workspace raiseveil-cli
```

Before submitting trader data, deploy the contract and configure its trusted
provider key through the contract's `setSignerPk` circuit. This initialization
is an operator/deployment step, not something the verification CLI performs.
The CLI intentionally refuses to initialize or replace a mismatched key.

### 5. Verify and publish a trader record

Create an account at `/signup`, sign in, and connect the OANDA token from the
dashboard. Request and download the attestation JSON. Set the local CLI
environment values `MIDNIGHT_WALLET_SEED`,
`RAISEVEIL_PROVIDER_PUBLIC_KEY_X`, `RAISEVEIL_PROVIDER_PUBLIC_KEY_Y`, and
`RAISEVEIL_PRIVATE_STATE_PASSWORD`, then run:

```sh
npm run start --workspace raiseveil-cli -- verify <contract-address> \
  --attestation-file ./raiseveil-attestation.json
```

Use the wallet that can transact with the selected network. `RAISEVEIL_NETWORK`
defaults to `standalone`; set it to `preprod` and provide
`BLOCKFROST_PROJECT_ID` when using preprod. After the transaction is confirmed,
link the same contract address from the dashboard to publish the latest
on-chain snapshot on the profile.

## Useful commands

```sh
# Run the API test suite
npm run test --workspace raiseveil-api

# Run the attestation service test suite
npm run test --workspace raiseveil-attestation-api

# Run the CLI test suite
npm run test --workspace raiseveil-cli

# Compile and test the Compact contract
npm run test:compile --workspace contract

# Build the API and attestation service
npm run build --workspace raiseveil-api
npm run build --workspace raiseveil-attestation-api

# Build and lint the UI
npm run build --workspace raiseveil-ui
npm run lint --workspace raiseveil-ui
```

## API overview

Authentication endpoints are provided by Better Auth under `/api/auth/*`.

| Route | Access | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | API health check |
| `GET /api/market/traders` | Public | List public profiles with linked trader snapshots |
| `GET /api/profiles/:slug` | Public | Read one public profile |
| `GET /api/me` | Signed in | Read the current account, profile, broker status, and stats |
| `PUT /api/me/profile` | Signed in | Update profile details and visibility |
| `GET /api/me/broker` | Signed in | Read broker connection status |
| `POST /api/me/broker/oanda` | Signed in | Validate and save an OANDA token |
| `DELETE /api/me/broker/oanda` | Signed in | Remove the OANDA connection |
| `POST /api/me/attestation` | Signed in | Request a signed OANDA attestation |
| `POST /api/me/contract` | Signed in | Verify a contract's ledger and refresh the profile snapshot |

The internal attestation service exposes `/health`, `/provider-info`, and
`POST /attest`. The `/attest` endpoint requires the configured shared bearer
secret.

## Important limitations

- A profile snapshot is stored when its contract is linked or linked again; it
  is not currently refreshed by a background job or live ledger subscription.
- Each RaiseVeil contract represents one trader record. This is not yet a
  multi-trader registry contract.
- The contract verifies that the signed stats came from the trusted provider,
  but does not cryptographically prove that a profile owner controls the
  wallet/contract they link. Profile ownership and contract ownership can
  therefore differ.
- The CLI submits the attestation transaction. Contract deployment and trusted
  signer initialization are separate operator steps.
- The browser dashboard does not generate ZK proofs or submit contract calls
  itself; those actions currently use the CLI and configured Midnight
  proof-server/network components.
- Public trader stats are historical data, not recommendations or promises of
  future performance.

See [raiseveil-api/README.md](./raiseveil-api/README.md) for backend setup and
[raiseveil-cli/README.md](./raiseveil-cli/README.md) for CLI configuration and
verification details.
