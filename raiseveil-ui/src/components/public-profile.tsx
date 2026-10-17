import { useEffect, useState } from "react";
import { apiRequest, type TraderProfile } from "../lib/api";
import { StatsGrid } from "./stats";
import "./workspace.css";

interface ProfileResponse {
  profile: TraderProfile;
}

export function PublicProfile({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiRequest<ProfileResponse>(`/api/profiles/${encodeURIComponent(slug)}`)
      .then(({ profile: result }) => {
        if (!cancelled) setProfile(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load profile");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <main className="profile-page">
      <header className="public-header">
        <a className="public-brand allison-regular" href="/">RaiseVeil</a>
        <nav aria-label="Main navigation">
          <a href="/market">Marketplace</a>
          <a href="/dashboard">Your workspace</a>
          <a className="public-header__signin" href="/login">Sign in</a>
        </nav>
      </header>
      {error ? (
        <section className="profile-empty">
          <h1>Profile not available</h1>
          <p>{error}</p>
          <a className="button button--dark" href="/market">Return to marketplace</a>
        </section>
      ) : !profile ? (
        <p className="workspace-loading">Loading public profile…</p>
      ) : (
        <>
          <section className="profile-heading">
            <div>
              <p className="marketplace-kicker">Public trader profile</p>
              <h1>{profile.displayName}</h1>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            </div>
            <span className="verified-badge">
              <span aria-hidden="true">✓</span>
              Read from Midnight
            </span>
          </section>
          <section className="profile-stats">
            <div className="market-results__heading">
              <h2>Contract-published stats</h2>
              {profile.observedAt && (
                <span>Read {new Date(profile.observedAt).toLocaleString()}</span>
              )}
            </div>
            {profile.stats ? (
              <StatsGrid stats={profile.stats} />
            ) : (
              <div className="empty-state">
                <h3>No verified record is linked yet</h3>
                <p>The profile will show stats after its owner publishes contract data.</p>
              </div>
            )}
          </section>
          {profile.contractAddress && (
            <section className="contract-source">
              <h2>Public contract source</h2>
              <code>{profile.contractAddress}</code>
              <p>
                Stats are read from this contract&apos;s public ledger. The page does
                not include broker credentials or private strategy details.
              </p>
              <p>
                RaiseVeil verifies the contract data, but the current contract does
                not cryptographically link this profile name to a wallet identity.
              </p>
            </section>
          )}
        </>
      )}
      <footer className="public-footer">
        <a href="/market">Back to marketplace</a>
        <p>Public records are not investment advice.</p>
      </footer>
    </main>
  );
}
