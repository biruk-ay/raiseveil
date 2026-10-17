import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest, type TraderProfile } from "../lib/api";
import { demoModeEnabled, demoTraders } from "../lib/demo";
import { StatsGrid } from "./stats";
import "./workspace.css";

interface MarketplaceResponse {
  traders: TraderProfile[];
}

interface MarketplaceLoad {
  query: string;
  traders: TraderProfile[];
  loading: boolean;
  error: string;
}

export function Marketplace() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [load, setLoad] = useState<MarketplaceLoad>({
    query: "",
    traders: [],
    loading: true,
    error: "",
  });

  const sampleTraders = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return demoTraders
      .filter((trader) =>
        `${trader.displayName} ${trader.bio}`.toLowerCase().includes(normalizedQuery),
      )
      .sort(
        (left, right) =>
          Number(right.stats?.averageReturn.replace("%", "") ?? 0) -
          Number(left.stats?.averageReturn.replace("%", "") ?? 0),
      );
  }, [query]);
  const traders = load.query === query ? load.traders : [];
  const visibleTraders = demoModeEnabled ? sampleTraders : traders;
  const visibleError = demoModeEnabled || load.query !== query ? "" : load.error;
  const isLoading = !demoModeEnabled && (load.query !== query || load.loading);

  useEffect(() => {
    if (demoModeEnabled) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    apiRequest<MarketplaceResponse>(`/api/market/traders?${params}`)
      .then((response) => {
        if (!cancelled) {
          setLoad({ query, traders: response.traders, loading: false, error: "" });
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setLoad({
            query,
            traders: [],
            loading: false,
            error: requestError instanceof Error ? requestError.message : "Unable to load traders",
          });
        }
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
          <p className="marketplace-kicker">
            {demoModeEnabled ? "Sample marketplace" : "Public trading records"}
          </p>
          <h1>{demoModeEnabled ? "Preview the trader marketplace." : "Compare what can be proven."}</h1>
          <p className="marketplace-description">
            {demoModeEnabled
              ? "Explore sample profiles and marketplace features. These illustrative figures are fictional and are not verified trading results."
              : "Browse trader stats read from RaiseVeil contracts. Each profile shows only what its public ledger makes visible."}
          </p>
          {demoModeEnabled && (
            <p className="demo-banner" role="status">
              Demo data only. No profiles or figures on this page are verified or
              sourced from Midnight.
            </p>
          )}
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
          <h2>{demoModeEnabled ? "Sample trader profiles" : "Verified trader profiles"}</h2>
          <span>{demoModeEnabled ? "Sample data · sorted by average return" : "Sorted by average return"}</span>
        </div>
        {isLoading ? (
          <p className="workspace-loading">
            {demoModeEnabled ? "Loading sample profiles…" : "Reading public profiles…"}
          </p>
        ) : visibleError ? (
          <div className="empty-state">
            <h3>Marketplace data is unavailable</h3>
            <p>{visibleError}. Check that the RaiseVeil API and PostgreSQL database are running.</p>
          </div>
        ) : visibleTraders.length === 0 ? (
          <div className="empty-state">
            <h3>{demoModeEnabled ? "No sample profiles match that search" : "No public trader profiles yet"}</h3>
            <p>
              {demoModeEnabled
                ? "Try a different name to browse the illustrative profiles."
                : "Profiles appear here after a trader links a contract with verified on-chain data."}
            </p>
            {!demoModeEnabled && <a className="text-link" href="/signup">Create your profile</a>}
          </div>
        ) : (
          <div className="trader-list">
            {visibleTraders.map((trader) => (
              <article className="trader-listing" key={trader.slug}>
                <div className="trader-listing__heading">
                  <div>
                    <h3><a href={`/trader/${trader.slug}`}>{trader.displayName}</a></h3>
                    {trader.bio && <p>{trader.bio}</p>}
                  </div>
                  <div className="trader-listing__actions">
                    {demoModeEnabled && <span className="demo-label">Demo sample</span>}
                    <a className="text-link" href={`/trader/${trader.slug}`}>View profile</a>
                  </div>
                </div>
                {trader.stats && <StatsGrid stats={trader.stats} isSample={demoModeEnabled} />}
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="public-footer">
        <span>RaiseVeil</span>
        <p>
          {demoModeEnabled
            ? "Sample figures are fictional and are not investment advice."
            : "On-chain data is public information, not investment advice."}
        </p>
      </footer>
    </main>
  );
}
