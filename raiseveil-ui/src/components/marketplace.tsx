import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type TraderProfile } from "../lib/api";
import { StatsGrid } from "./stats";
import "./workspace.css";

interface MarketplaceResponse {
  traders: TraderProfile[];
}

export function Marketplace() {
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    apiRequest<MarketplaceResponse>(`/api/market/traders?${params}`)
      .then((response) => {
        if (!cancelled) setTraders(response.traders);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load traders");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return (
    <main className="marketplace-page">
      <header className="public-header">
        <a className="public-brand allison-regular" href="/">RaiseVeil</a>
        <nav aria-label="Main navigation">
          <a className="is-active" href="/market">Marketplace</a>
          <a href="/dashboard">Your workspace</a>
          <a className="public-header__signin" href="/login">Sign in</a>
        </nav>
      </header>

      <section className="marketplace-intro">
        <div>
          <p className="marketplace-kicker">Public trading records</p>
          <h1>Compare what can be proven.</h1>
          <p className="marketplace-description">
            Browse trader stats read from RaiseVeil contracts. Each profile shows
            only what its public ledger makes visible.
          </p>
        </div>
        <form className="market-search" onSubmit={submitSearch}>
          <label className="visually-hidden" htmlFor="market-search">Find a trader</label>
          <input
            id="market-search"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search trader names"
            value={search}
          />
          <button className="button button--dark" type="submit">Search</button>
        </form>
      </section>

      <section className="market-results" aria-live="polite">
        <div className="market-results__heading">
          <h2>Verified trader profiles</h2>
          <span>Sorted by average return</span>
        </div>
        {loading ? (
          <p className="workspace-loading">Reading public profiles…</p>
        ) : error ? (
          <div className="empty-state">
            <h3>Marketplace data is unavailable</h3>
            <p>{error}. Check that the RaiseVeil API and PostgreSQL database are running.</p>
          </div>
        ) : traders.length === 0 ? (
          <div className="empty-state">
            <h3>No public trader profiles yet</h3>
            <p>Profiles appear here after a trader links a contract with verified on-chain data.</p>
            <a className="text-link" href="/signup">Create your profile</a>
          </div>
        ) : (
          <div className="trader-list">
            {traders.map((trader) => (
              <article className="trader-listing" key={trader.slug}>
                <div className="trader-listing__heading">
                  <div>
                    <h3><a href={`/trader/${trader.slug}`}>{trader.displayName}</a></h3>
                    {trader.bio && <p>{trader.bio}</p>}
                  </div>
                  <a className="text-link" href={`/trader/${trader.slug}`}>View profile</a>
                </div>
                {trader.stats && <StatsGrid stats={trader.stats} />}
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="public-footer">
        <span>RaiseVeil</span>
        <p>On-chain data is public information, not investment advice.</p>
      </footer>
    </main>
  );
}
