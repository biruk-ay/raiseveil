# RaiseVeil

<img src="raiseveil-ui/src/assets/midnight.jpg" alt="Midnight" width=20 height=20>

RaiseVeil is a marketplace for trader activity credentials that can be checked
against publicly verifiable smart-contract data. A trader connects an OANDA
account and a Midnight Lace wallet, then requests and submits a signed activity
credential directly from the dashboard. The app deploys a personal Midnight
contract, verifies the credential, and links it to a public profile. No local
CLI is required in the trader workflow.

RaiseVeil is not an investment service. Public stats describe past activity and
are not investment advice or a guarantee of future results.

## What the app includes

- A public landing page, trader marketplace, and profile pages.
- Email-and-password signup, login, and password reset using Better Auth.
- A signed-in dashboard for connecting OANDA, requesting an attestation,
  submitting a verified credential through Lace, and managing profile visibility.
- A backend API using PostgreSQL and Drizzle ORM.
- An attestation service that retrieves OANDA trading history, calculates the
  supported trader summary, and signs its contract-encoded values.
- A Compact smart contract that verifies the attestation signature and records
  an activity badge on the Midnight ledger.
- A browser wallet integration that deploys a personal contract and submits the
  verification transaction through Lace.

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
3. **Verify and publish on Midnight.** The dashboard keeps the signed
   credential in the browser, deploys the trader's contract if needed, and calls
   `verifyData` using Lace-backed proving and transaction submission. The
   contract verifies the provider signature and publishes only the activity
   badge. The trader approves the wallet transactions in Lace.
4. **Link the public profile.** After confirmation, the dashboard sends the
   contract address to the API. The API reads the Ledger 9 state through the
   Midnight indexer, checks the trusted provider key and activity badge, and
   stores the profile snapshot in PostgreSQL.

The contract exposes only the activity badge and credential nullifier. It does
not publish exact trade counts, volume, return, account balance, or win rate.

## Activity credential privacy mode

The current contract includes a subject-bound selective-disclosure credential:

- Policy `1` is issued only when the signed attestation has at least 100 OANDA
  `ORDER_FILL` events spanning at least 180 days.
- The attestation binds a SHA-256-derived subject identifier and policy ID into
  the Schnorr-signed eight-field message.
- The contract verifies the provider signature, discloses only policy ID `1`,
  and records a domain-separated nullifier in `usedActivityCredentials`.
- It does not disclose the exact trade count, dates, volume, size, or return.
- Reusing the same subject-policy credential is rejected by the nullifier set.

The attestation service evaluates the fixed policy; the contract does not infer
the policy from arbitrary public thresholds. The signed metrics are supplied as
private witness input and are not published as separate ledger fields; the public
ledger stores only the badge and nullifier.

## System layout

| Workspace | Responsibility |
| --- | --- |
| `raiseveil-ui` | React/Vite landing page, login/signup, dashboard, marketplace, and public trader profiles |
| `raiseveil-api` | Better Auth, PostgreSQL persistence, encrypted broker credentials, public API, and Midnight indexer integration |
| `raiseveil-attestation-api` | OANDA history retrieval, trader-stat calculation, and provider signing |
| `raiseveil-cli` | Optional legacy developer utility; the trader dashboard does not depend on it |
| `contract` | Compact source, TypeScript witness, and generated contract package/assets |

The API and attestation service are separate processes. The API calls the
attestation service over HTTP; the browser never receives the provider private
key or the stored OANDA token. In production, place both services behind
appropriate network controls and keep secrets in a secret manager.

## Requirements

- Node.js 22 or later and npm.
- PostgreSQL.
- A Neon account with access to the configured organization, project, and
  `production` branch when using the hosted database.
- Midnight Lace configured for Preprod and funded with DUST for transaction fees.
- Compact compiler 0.36.1 only when recompiling the Ledger 9 contract.
- A configured OANDA API token for the account whose history will be attested.
- A Preprod indexer for the API's contract-state checks. The browser loads the
  contract's ZK configuration from static assets and delegates proving and
  transaction submission to Lace; no local proof server is needed.
- The provider public key configured for the attestation service; the dashboard
  uses it to initialize each trader's contract on first submission.

The example environment targets Preprod and requires `BLOCKFROST_PROJECT_ID`
for API indexer reads. To use a local devnet instead, set both
`VITE_NETWORK_ID` and `MIDNIGHT_NETWORK_ID` to `undeployed`, and configure the
API indexer URLs for your devnet.

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

#### Connect the API to Neon

Neon is linked to the `production` branch in `.neon`, with its policy in
`neon.ts`. With the Neon CLI installed and authenticated, run:

```sh
neon deploy
```

This pulls `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), and
`NEON_BRANCH` into the existing root `.env` while preserving other settings.
The API uses the pooled URL through its existing `pg`/Drizzle stack. Drizzle
migrations use the direct URL, and the API enables TLS automatically for Neon
database hosts.

Set the provider public-key coordinates in
`RAISEVEIL_PROVIDER_PUBLIC_KEY_X` and
`RAISEVEIL_PROVIDER_PUBLIC_KEY_Y`. They must match the public key derived from
the provider signing key and the contract's `trustedSignerPk`.

Keep `RAISEVEIL_PROVIDER_SECRET_KEY` private to the attestation service. Never
commit `.env`, wallet seeds, broker tokens, encryption keys, auth secrets, or
provider signing keys.

### 2. Start PostgreSQL and migrate the database

Create a PostgreSQL database and set its connection string in `DATABASE_URL`.
For Neon, `neon deploy` supplies both the pooled application URL and direct
migration URL. Then apply the Drizzle migrations:

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

For a frontend-only product walkthrough, set `VITE_DEMO_MODE=true` in the
repository-root `.env` and restart Vite. The login and signup pages then show
an “Explore demo workspace” option, and the marketplace and sample profile
pages use clearly marked, read-only fictional data instead of API requests.
This does not create an account or bypass API authentication. Leave it disabled
for normal use; enable it on a Vercel demo deployment when you want a read-only
product walkthrough.

For email verification and password-reset delivery, configure `SMTP_URL` and
`AUTH_EMAIL_FROM`. Verification is required in production; it can be enabled
locally with `REQUIRE_EMAIL_VERIFICATION=true`. To disable verification for a
production demo, explicitly set `REQUIRE_EMAIL_VERIFICATION=false` in the API
environment and redeploy. Unverified addresses can then register and sign in;
this increases spam and account-abuse risk. SMTP is still needed for password
reset emails.

## Deploying the web app to Vercel

The root [vercel.json](./vercel.json) configures a three-service Vercel
deployment. `raiseveil-ui` receives all non-API paths, `raiseveil-api` receives
`/api/*`, and `raiseveil-attestation-api` remains private. The API declares a
service binding to the attestation service; Vercel injects
`RAISEVEIL_ATTESTATION_API_URL` at runtime. Do not set that variable manually
in Vercel. Locally, `.env` can continue to point it at
`http://127.0.0.1:3100`.
The UI service rewrites unmatched paths to its Vite `index.html` so browser
routes such as `/market`, `/login`, and `/signup` load the SPA on direct visits
and refreshes.

The API exports its Hono app for Vercel while retaining the Node server for
local development. Both API services expose Hono apps as Vercel entrypoints;
the attestation service uses `src/index.mts`, while `src/index.ts` remains its
standalone local server. The Compact-generated contract files under
`contract/src/managed/` are kept in Git so the independently built API service
can compile against the contract workspace without needing the Compact
compiler during Vercel's build. `dist/` is generated and intentionally not
committed.

Connect the repository to Vercel with the repository root as the project root,
then configure these environment variables in the Vercel project:

- API: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `BETTER_AUTH_TRUSTED_ORIGINS`, `WEB_ORIGIN`, `BROKER_ENCRYPTION_KEY`,
  `RAISEVEIL_ATTESTATION_SHARED_SECRET`,
  `RAISEVEIL_PROVIDER_PUBLIC_KEY_X`, `RAISEVEIL_PROVIDER_PUBLIC_KEY_Y`,
  `MIDNIGHT_NETWORK_ID`, `BLOCKFROST_PROJECT_ID` (for Preprod),
  `MIDNIGHT_INDEXER_URL`, `MIDNIGHT_INDEXER_WS_URL`, `OANDA_API_URL`, and
  `REQUIRE_EMAIL_VERIFICATION`. Also configure `SMTP_URL` and `AUTH_EMAIL_FROM`
  for verification and password-reset email delivery.
- Attestation service: `RAISEVEIL_PROVIDER_SECRET_KEY`,
  `RAISEVEIL_ATTESTATION_SHARED_SECRET`, `RAISEVEIL_PROVIDER_ID`, and
  `OANDA_API_URL`.
- UI build: `VITE_DEMO_MODE=true` for a read-only demo (set to `false` for
  live marketplace data) and `VITE_NETWORK_ID=preprod` for the Lace connection.

Set `BETTER_AUTH_URL`, `WEB_ORIGIN`, and
`BETTER_AUTH_TRUSTED_ORIGINS` to the deployed site origin (for example,
`https://raiseveil.example.com`). The attestation service's provider secret
key and the shared secret must only be available server-side. Apply the
database migrations to the configured database before using the deployed app.
Set the UI's `VITE_NETWORK_ID` and API's `MIDNIGHT_NETWORK_ID` to the same
network. The API defaults to Midnight Preprod on Vercel and builds its HTTP and
WebSocket indexer URLs from `BLOCKFROST_PROJECT_ID`. You can instead provide
both indexer URLs explicitly. Never use local `127.0.0.1` indexer URLs in
Vercel environment variables. The UI build copies the Ledger 9 compiler
metadata, verifier/prover keys, and ZKIR files into its static output.

For local multi-service routing and binding behavior, use `vercel dev` from
the repository root. The ordinary `npm run dev --workspace ...` commands
remain available for running each service independently.

### 4. Prepare the Ledger 9 contract

The generated contract assets are committed, so application builds do not need
the Compact compiler. If you change the Compact source, compile it with Compact
0.36.1 (language version 0.28.0 / Ledger 9), then rebuild the generated package:

```sh
npm run compact --workspace contract
npm run build --workspace raiseveil-contract
```

The contract's trusted provider key is set at deployment and cannot be changed.

### 5. Submit an activity credential from the dashboard

Create an account at `/signup`, sign in, and connect an OANDA account with
eligible history. In Lace, select Preprod and ensure the wallet has DUST for
fees. From the dashboard, connect Lace and choose **Verify and publish activity
badge**. The app requests the signed credential, deploys your personal contract
on first use, and submits `verifyData`; approve the transactions in Lace. The
dashboard then links the confirmed contract to your profile.

If OANDA reports no filled trades or the account has fewer than 100 qualifying
fills spanning 180 days, the API rejects the request before a contract
transaction is started.

## Useful commands

```sh
# Run the API test suite
npm run test --workspace raiseveil-api

# Run the attestation service test suite
npm run test --workspace raiseveil-attestation-api

# Compile and test the Compact contract
npm run test:compile --workspace contract

# Build the API and attestation service
npm run build --workspace raiseveil-api
npm run build --workspace raiseveil-attestation-api

# Build and lint the UI
npm run build --workspace raiseveil-ui
npm run lint --workspace raiseveil-ui

# Build the workspaces
npm run build
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
- The trader dashboard uses Lace for contract deployment, proving, and
  transaction submission. The optional CLI is not part of this flow.
- Public trader stats are historical data, not recommendations or promises of
  future performance.

See [raiseveil-api/README.md](./raiseveil-api/README.md) for backend setup.
