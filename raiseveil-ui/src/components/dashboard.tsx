import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "../lib/auth-client";
import { apiRequest, type DashboardResponse } from "../lib/api";
import { StatsGrid } from "./stats";
import "./workspace.css";

interface AttestationEnvelope {
  attestation: unknown;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  async function loadDashboard() {
    try {
      const result = await apiRequest<DashboardResponse>("/api/me");
      setData(result);
      setDisplayName(result.profile.displayName);
      setBio(result.profile.bio);
      setIsPublic(result.profile.isPublic ?? true);
      setContractAddress(result.profile.contractAddress ?? "");
    } catch (error) {
      if (error instanceof Error && error.message === "Sign in to continue") {
        window.location.assign("/login");
        return;
      }
      setNotice(error instanceof Error ? error.message : "Unable to load your workspace");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function connectOanda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/api/me/broker/oanda", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setToken("");
      setNotice("OANDA is connected. Your credential is encrypted and never displayed again.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to connect OANDA");
    } finally {
      setBusy(false);
    }
  }

  async function linkContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/api/me/contract", {
        method: "POST",
        body: JSON.stringify({ contractAddress }),
      });
      setNotice("RaiseVeil contract linked. Your profile now reflects its public ledger data.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to read that contract");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await apiRequest("/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({ displayName, bio, isPublic }),
      });
      setNotice("Profile settings saved.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save your profile");
    } finally {
      setBusy(false);
    }
  }

  async function generateAttestation() {
    setBusy(true);
    setNotice("");
    try {
      const result = await apiRequest<AttestationEnvelope>("/api/me/attestation", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const file = new Blob([JSON.stringify(result.attestation, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "raiseveil-attestation.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Attestation downloaded. Use it with the RaiseVeil CLI to submit the proof.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create an attestation");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <a className="workspace-brand allison-regular" href="/">RaiseVeil</a>
        <div className="workspace-nav">
          <a className="workspace-nav__item is-current" href="/dashboard">Your workspace</a>
          <a className="workspace-nav__item" href="/market">Trader marketplace</a>
          {data?.profile && (
            <a className="workspace-nav__item" href={`/trader/${data.profile.slug}`}>
              Public profile
            </a>
          )}
        </div>
        <div className="workspace-sidebar__bottom">
          <span>{data?.user.email ?? "Loading account…"}</span>
          <button className="quiet-button" onClick={() => void signOut()} type="button">Sign out</button>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <p className="workspace-breadcrumb">Your workspace</p>
            <h1>Trader dashboard</h1>
          </div>
          <a className="button button--dark" href="/market">Explore traders</a>
        </header>

        {notice && <p className="workspace-notice" role="status">{notice}</p>}
        {!data ? (
          <p className="workspace-loading">Loading your workspace…</p>
        ) : (
          <>
            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <h2>Your verified record</h2>
                  <p>Metrics are read from your linked RaiseVeil contract.</p>
                </div>
                {data.profile.observedAt && (
                  <span className="data-timestamp">
                    Read {new Date(data.profile.observedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {data.profile.stats ? (
                <StatsGrid stats={data.profile.stats} />
              ) : (
                <div className="empty-state">
                  <h3>No on-chain record linked yet</h3>
                  <p>Link a RaiseVeil contract after submitting a valid attestation proof.</p>
                </div>
              )}
            </section>

            <div className="workspace-columns">
              <section className="workspace-section">
                <div className="section-heading">
                  <div>
                    <h2>Broker connection</h2>
                    <p>Connect a supported broker to request an attestation.</p>
                  </div>
                  <span className={`connection-pill ${data.broker ? "is-connected" : ""}`}>
                    {data.broker ? "Connected" : "Not connected"}
                  </span>
                </div>
                {data.broker ? (
                  <div className="connection-details">
                    <strong>OANDA</strong>
                    <span>Credential stored encrypted</span>
                    <button
                      className="quiet-button"
                      disabled={busy}
                      onClick={async () => {
                        await apiRequest("/api/me/broker/oanda", { method: "DELETE" });
                        setNotice("OANDA disconnected.");
                        await loadDashboard();
                      }}
                      type="button"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <form className="workspace-form" onSubmit={(event) => void connectOanda(event)}>
                    <label className="workspace-label" htmlFor="oanda-token">OANDA API token</label>
                    <input
                      autoComplete="off"
                      id="oanda-token"
                      onChange={(event) => setToken(event.currentTarget.value)}
                      placeholder="Paste your OANDA token"
                      required
                      type="password"
                      value={token}
                    />
                    <p className="field-help">
                      The token is encrypted at rest and only used by the attestation service.
                    </p>
                    <button className="button button--dark" disabled={busy} type="submit">
                      Verify and connect OANDA
                    </button>
                  </form>
                )}
                {data.broker && (
                  <div className="attestation-action">
                    <button className="button button--soft" disabled={busy} onClick={() => void generateAttestation()} type="button">
                      Create signed attestation
                    </button>
                    <p>Download the signed data, then submit it with the local CLI and proof server.</p>
                  </div>
                )}
              </section>

              <section className="workspace-section">
                <div className="section-heading">
                  <div>
                    <h2>On-chain source</h2>
                    <p>Link the deployed RaiseVeil contract you verified.</p>
                  </div>
                </div>
                <form className="workspace-form" onSubmit={(event) => void linkContract(event)}>
                  <label className="workspace-label" htmlFor="contract-address">Contract address</label>
                  <input
                    id="contract-address"
                    onChange={(event) => setContractAddress(event.currentTarget.value)}
                    placeholder="Midnight contract address"
                    required
                    value={contractAddress}
                  />
                  <p className="field-help">
                    The API checks the configured signer and reads only the public ledger fields.
                  </p>
                  <button className="button button--dark" disabled={busy} type="submit">
                    Read verified contract
                  </button>
                </form>
              </section>
            </div>

            <section className="workspace-section profile-settings">
              <div className="section-heading">
                <div>
                  <h2>Public profile</h2>
                  <p>Share only the statistics already exposed by your contract.</p>
                </div>
              </div>
              <form className="profile-settings__form" onSubmit={(event) => void saveProfile(event)}>
                <label className="workspace-label" htmlFor="display-name">Display name</label>
                <input
                  id="display-name"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                  required
                  value={displayName}
                />
                <label className="workspace-label" htmlFor="profile-bio">About you</label>
                <textarea
                  id="profile-bio"
                  maxLength={280}
                  onChange={(event) => setBio(event.currentTarget.value)}
                  rows={3}
                  value={bio}
                />
                <label className="visibility-toggle">
                  <input
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>Show my profile in the public trader marketplace</span>
                </label>
                <button className="button button--dark" disabled={busy} type="submit">Save profile</button>
                {data.profile.contractAddress && (
                  <a className="text-link" href={`/trader/${data.profile.slug}`}>
                    View your public profile
                  </a>
                )}
              </form>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
