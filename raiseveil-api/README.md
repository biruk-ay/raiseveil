# RaiseVeil API

The API owns email/password authentication, PostgreSQL persistence, private
broker credential storage, trader profiles, and public marketplace endpoints.
It reads trader metrics from the public ledger of a RaiseVeil contract through
the Midnight indexer. It does not publish off-chain broker metrics as verified.

## Local setup

1. Copy the repository-root `.env.example` to `.env` and set `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BROKER_ENCRYPTION_KEY`, and the trusted provider
   public-key coordinates. Generate the encryption and auth secrets with
   `openssl rand -base64 32` (run it separately for each secret).
2. Start PostgreSQL and the Midnight indexer for the selected network.
3. Generate/apply the schema:

   ```sh
   npm run db:generate --workspace raiseveil-api
   npm run db:migrate --workspace raiseveil-api
   ```

4. Start the service with `npm run dev --workspace raiseveil-api`. The API and
   Drizzle configuration load the repository-root `.env` automatically.
5. Start the UI with `npm run dev --workspace raiseveil-ui`; Vite proxies `/api`
   to `http://localhost:3000`.

Configure `SMTP_URL` and `AUTH_EMAIL_FROM` for email verification and password
reset. Email verification is required automatically in production; set
`REQUIRE_EMAIL_VERIFICATION=true` to exercise it locally.

Run the attestation service with
`npm run dev --workspace raiseveil-attestation-api` to load the same
repository-root `.env` during local development. Keep
`RAISEVEIL_PROVIDER_SECRET_KEY` in a separate secret store outside source
control in production.

## Routes

- Better Auth: `/api/auth/*`
- Session-protected account, profile, OANDA, and contract routes: `/api/me/*`
- Public marketplace listing: `GET /api/market/traders`
- Public profile: `GET /api/profiles/:slug`

Broker tokens are validated with OANDA and stored only as AES-256-GCM
ciphertext. They are never returned from the API. The web app must be served
over HTTPS in production, and the encryption key must be stored in a secret
manager rather than in source control.

Trader snapshots contain only the six fields published by the current
RaiseVeil contract: trade count, trade volume, average trade size, average
return, first trade date, and last trade date. A profile snapshot is created
only after the selected network returns contract state with the configured
trusted signer key and non-empty verified trader data.

The public metrics are confirmed against the contract ledger. The current
contract does not bind a profile name to a wallet identity, so linking a
contract does not by itself prove that the account holder controls that
contract's wallet.
