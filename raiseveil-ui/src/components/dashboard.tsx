import { useCallback, useEffect, useState, type FormEvent } from "react";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { ConnectedAPI } from "@midnightntwrk/dapp-connector-api";
import { authClient } from "../lib/auth-client";
import { apiRequest, type DashboardResponse } from "../lib/api";
import { demoDashboard, demoModeEnabled, endDemoSession, hasDemoSession } from "../lib/demo";
import { createBrowserProviders, MIDNIGHT_NETWORK_ID } from "../lib/midnight";
import { compiledContract, type RaiseVeilPrivateState } from "../lib/raiseveil";
import { StatsGrid } from "./stats";
import "./workspace.css";

function walletErrorMessage(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "DAppConnectorAPIError" &&
    "reason" in error &&
    typeof error.reason === "string"
  ) {
    return error.reason;
  }
}

export function Dashboard() {
  const isDemo = demoModeEnabled && hasDemoSession();
  const [data, setData] = useState<DashboardResponse | null>(() => isDemo ? demoDashboard : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [wallet, setWallet] = useState<{ api: ConnectedAPI; name: string } | null>(null);
  const [displayName, setDisplayName] = useState(() => isDemo ? demoDashboard.profile.displayName : "");
  const [bio, setBio] = useState(() => isDemo ? demoDashboard.profile.bio : "");
  const [isPublic, setIsPublic] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await apiRequest<DashboardResponse>("/api/me");
      setData(result);
      setDisplayName(result.profile.displayName);
      setBio(result.profile.bio);
      setIsPublic(result.profile.isPublic ?? true);
    } catch (error) {
      if (error instanceof Error && error.message === "Sign in to continue") {
        window.location.assign("/login");
        return;
      }
      setNotice(error instanceof Error ? error.message : "Unable to load your workspace");
    }
  }, []);

  useEffect(() => {
    if (isDemo) {
      return;
    }

    let cancelled = false;
    apiRequest<DashboardResponse>("/api/me")
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setDisplayName(result.profile.displayName);
        setBio(result.profile.bio);
        setIsPublic(result.profile.isPublic ?? true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof Error && error.message === "Sign in to continue") {
          window.location.assign("/login");
          return;
        }
        setNotice(error instanceof Error ? error.message : "Unable to load your workspace");
      });

    return () => {
      cancelled = true;
    };
  }, [isDemo]);

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

  async function connectWallet() {
    setBusy(true);
    setNotice("");
    try {
      const lace = Object.values(globalThis.midnight ?? {}).find((candidate) =>
        candidate.name.toLowerCase().includes("lace"),
      );
      if (!lace) {
        throw new Error("Lace was not detected. Install or enable the Midnight Lace wallet extension.");
      }

      const api = await lace.connect(MIDNIGHT_NETWORK_ID);
      const configuration = await api.getConfiguration();
      if (configuration.networkId !== MIDNIGHT_NETWORK_ID) {
        throw new Error(`Select the Midnight ${MIDNIGHT_NETWORK_ID} network in Lace, then connect again.`);
      }
      setWallet({ api, name: lace.name });
      setNotice(`${lace.name} connected on Preprod.`);
    } catch (error) {
      setNotice(
        walletErrorMessage(error) ??
          (error instanceof Error ? error.message : "Unable to connect a Midnight wallet"),
      );
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

  async function createAndSubmitCredential() {
    if (!wallet || !data) {
      setNotice("Connect Lace before submitting your activity credential.");
      return;
    }

    setBusy(true);
    setNotice("");
    let providers: Awaited<ReturnType<typeof createBrowserProviders>> | undefined;
    try {
      const [{ attestation }, { publicKey }] = await Promise.all([
        apiRequest<{
          attestation: {
            signature: {
              announcement: { x: string; y: string };
              response: string;
            };
            message: Record<string, string>;
          };
        }>("/api/me/attestation", {
          method: "POST",
          body: JSON.stringify({}),
        }),
        apiRequest<{ publicKey: { x: string; y: string } }>(
          "/api/me/attestation/provider-key",
        ),
      ]);
      const privateState: RaiseVeilPrivateState = {
        tradeCount: BigInt(attestation.message.tradeCount),
        tradeVolume: BigInt(attestation.message.tradeVolume),
        averageTradeSize: BigInt(attestation.message.averageTradeSize),
        averageReturn: BigInt(attestation.message.averageReturn),
        startDate: BigInt(attestation.message.startDate),
        lastTradeDate: BigInt(attestation.message.lastTradeDate),
        subjectId: BigInt(attestation.message.subjectId),
        activityPolicyId: BigInt(attestation.message.activityPolicyId),
        attestationSignature: {
          announcement: {
            x: BigInt(attestation.signature.announcement.x),
            y: BigInt(attestation.signature.announcement.y),
          },
          response: BigInt(attestation.signature.response),
        },
      };

      const dust = await wallet.api.getDustBalance();
      if (dust.balance <= 0n) {
        throw new Error("Your Lace wallet has no DUST available for transaction fees.");
      }

      providers = await createBrowserProviders(wallet.api);
      const pendingKey = `raiseveil-pending-contract-${data.user.id}`;
      const pendingAddress = sessionStorage.getItem(pendingKey);
      const existingAddress = pendingAddress ?? data.profile.contractAddress;
      let contractAddress: string;
      let contract;

      if (existingAddress) {
        contractAddress = existingAddress;
        contract = await findDeployedContract(providers, {
          contractAddress,
          compiledContract,
          privateStateId: "raiseveil",
          initialPrivateState: privateState,
        });
      } else {
        const deployed = await deployContract(providers, {
          compiledContract,
          privateStateId: "raiseveil",
          initialPrivateState: privateState,
          args: [{ x: BigInt(publicKey.x), y: BigInt(publicKey.y) }],
        });
        contract = deployed;
        contractAddress = deployed.deployTxData.public.contractAddress;
        sessionStorage.setItem(pendingKey, contractAddress);
      }

      try {
        const tx = await contract.callTx.verifyData();
        if (tx.public.status !== "SucceedEntirely") {
          throw new Error(`Activity credential transaction did not succeed (${tx.public.status}).`);
        }
      } catch (error) {
        try {
          await apiRequest("/api/me/contract", {
            method: "POST",
            body: JSON.stringify({ contractAddress }),
          });
          sessionStorage.removeItem(pendingKey);
          setNotice("Your activity credential is already confirmed on Midnight.");
          await loadDashboard();
          return;
        } catch {
          throw error;
        }
      }

      await apiRequest("/api/me/contract", {
        method: "POST",
        body: JSON.stringify({ contractAddress }),
      });
      sessionStorage.removeItem(pendingKey);
      setNotice("Your activity credential was verified on Midnight and your profile is updated.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to submit your activity credential");
    } finally {
      await providers?.dispose();
      setBusy(false);
    }
  }

  async function signOut() {
    if (isDemo) {
      endDemoSession();
      window.location.assign("/");
      return;
    }
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
          {data?.profile.contractAddress && (
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
        {isDemo && (
          <p className="demo-banner" role="status">
            Demo workspace. The figures below are sample data, not verified
            trading results. Changes and broker actions are disabled.
          </p>
        )}
        {!data ? (
          <p className="workspace-loading">Loading your workspace…</p>
        ) : (
          <>
            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <h2>{isDemo ? "Sample trader record" : "Your verified record"}</h2>
                  <p>
                    {isDemo
                      ? "Illustrative values only; no contract has been checked."
                      : "Metrics are read from your linked RaiseVeil contract."}
                  </p>
                </div>
                {data.profile.observedAt && (
                  <span className="data-timestamp">
                    Read {new Date(data.profile.observedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {data.profile.activityBadge === "1" ? (
                <div className="activity-badge" role="status">
                  100+ fill activity · 180+ days
                </div>
              ) : data.profile.stats ? (
                <StatsGrid stats={data.profile.stats} isSample={isDemo} />
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
                    {isDemo ? (
                      <>
                        <strong>Sample broker account</strong>
                        <span>No real broker is connected in demo mode.</span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                ) : isDemo ? (
                  <div className="empty-state">
                    <h3>Broker actions are disabled</h3>
                    <p>This preview does not connect to a brokerage account.</p>
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
                {data.broker && !isDemo && (
                  <div className="attestation-action">
                    <button
                      className="button button--soft"
                      disabled={busy || data.profile.activityBadge === "1"}
                      onClick={() => wallet ? void createAndSubmitCredential() : void connectWallet()}
                      type="button"
                    >
                      {wallet ? "Verify and publish activity badge" : "Connect Lace wallet"}
                    </button>
                    <p>{wallet
                      ? "Your wallet proves and submits the signed credential. Approve each transaction in Lace."
                      : "Connect Lace on Preprod. Eligible OANDA history requires at least 100 executed fills spanning 180 days."
                    }</p>
                  </div>
                )}
              </section>

              <section className="workspace-section">
                <div className="section-heading">
                  <div>
                    <h2>On-chain source</h2>
                    <p>Your individual RaiseVeil contract is deployed and linked from the dashboard.</p>
                  </div>
                </div>
                {isDemo ? (
                  <div className="empty-state">
                    <h3>No live contract is linked</h3>
                    <p>Sample figures above are for preview only and are not read from Midnight.</p>
                  </div>
                ) : data.profile.contractAddress ? (
                  <div className="connection-details">
                    <strong>RaiseVeil activity credential</strong>
                    <code>{data.profile.contractAddress}</code>
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No contract linked yet</h3>
                    <p>Connect Lace and submit an eligible credential to deploy and link your contract.</p>
                  </div>
                )}
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
                  disabled={isDemo}
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                  required
                  value={displayName}
                />
                <label className="workspace-label" htmlFor="profile-bio">About you</label>
                <textarea
                  id="profile-bio"
                  disabled={isDemo}
                  maxLength={280}
                  onChange={(event) => setBio(event.currentTarget.value)}
                  rows={3}
                  value={bio}
                />
                <label className="visibility-toggle">
                  <input
                    checked={isPublic}
                    disabled={isDemo}
                    onChange={(event) => setIsPublic(event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>Show my profile in the public trader marketplace</span>
                </label>
                <button className="button button--dark" disabled={busy || isDemo} type="submit">Save profile</button>
                {isDemo && <p className="field-help">Profile edits are disabled in the sample workspace.</p>}
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
