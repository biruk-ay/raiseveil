import { useEffect, useState } from "react";
import { apiRequest, type TraderProfile } from "../lib/api";
import "./landing.css";

interface MarketplaceResponse {
  traders: TraderProfile[];
}

const sharedMetrics = [
  "Verified trade count",
  "Trade volume",
  "Average trade size",
  "Average return",
  "First trade date",
  "Most recent trade",
];

export function Landing() {
  const [traders, setTraders] = useState<TraderProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<MarketplaceResponse>("/api/market/traders?limit=3")
      .then(({ traders: results }) => {
        if (!cancelled) setTraders(results);
      })
      .catch(() => {
        if (!cancelled) setTraders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="landing">
      <header className="landing-header">
        <a className="landing-brand allison-regular" href="/">RaiseVeil</a>
        <nav aria-label="Main navigation">
          <a href="/market">Marketplace</a>
          <a href="/login">Log in</a>
          <a className="landing-header__cta" href="/signup">Create a profile</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-kicker">A clearer record for independent traders</p>
          <h1>Prove your performance. Keep your strategy private.</h1>
          <p className="landing-lede">
            RaiseVeil turns broker history into a signed, on-chain trading record.
            Investors can compare verified stats without seeing how you trade.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button--dark" href="/signup">Build your profile</a>
            <a className="landing-button landing-button--plain" href="/market">Explore traders</a>
          </div>
          <p className="landing-note">Currently supports OANDA account history and Midnight contract proofs.</p>
        </div>

        <div className="proof-visual" aria-label="The six fields published by a RaiseVeil contract">
          <div className="proof-visual__top">
            <span className="proof-seal" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" />
                <path d="m9 16 4.5 4.5L23 11" />
              </svg>
            </span>
            <span className="proof-state">Contract fields</span>
          </div>
          <h2>What your record shares</h2>
          <ul>
            {sharedMetrics.map((metric) => (
              <li key={metric}>
                <span>{metric}</span>
                <span className="proof-field-state">On-chain</span>
              </li>
            ))}
          </ul>
          <p className="proof-visual__note">
            No account balance, order history, or strategy is included in this record.
          </p>
        </div>
      </section>

      <section className="landing-market" aria-labelledby="landing-market-title">
        <div className="landing-section-heading">
          <div>
            <p className="landing-kicker">The public marketplace</p>
            <h2 id="landing-market-title">Compare verified records, not promises.</h2>
          </div>
          <a href="/market">Browse all profiles</a>
        </div>
        {traders.length > 0 ? (
          <div className="landing-traders">
            {traders.map((trader) => (
              <a className="landing-trader" href={`/trader/${trader.slug}`} key={trader.slug}>
                <span className="landing-trader__name">{trader.displayName}</span>
                <span>{trader.stats?.tradeCount ?? "—"} verified trades</span>
                <span>Avg. return {trader.stats?.averageReturn ?? "—"}</span>
                <span className="landing-trader__link">View profile</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="landing-market__empty">
            Public records will appear here when traders publish verified contract data.
          </p>
        )}
      </section>

      <section className="landing-method">
        <div>
          <p className="landing-kicker">How RaiseVeil works</p>
          <h2>From broker history to a public proof.</h2>
        </div>
        <ol>
          <li>
            <span>Connect OANDA</span>
            <p>Your API token is encrypted by the service and used to request a signed record.</p>
          </li>
          <li>
            <span>Verify on Midnight</span>
            <p>Submit the attestation using your wallet and proof server; the contract checks the signature.</p>
          </li>
          <li>
            <span>Share your profile</span>
            <p>Your page reads only the six statistics the contract makes public.</p>
          </li>
        </ol>
      </section>

      <footer className="landing-footer">
        <a className="allison-regular" href="/">RaiseVeil</a>
        <span>Verified records for a more open path to capital.</span>
        <a href="/market">Trader marketplace</a>
      </footer>
    </main>
  );
}
