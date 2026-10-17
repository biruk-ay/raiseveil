import { useState, type FormEvent } from "react";
import { authClient } from "../lib/auth-client";
import "./auth-page.css";

export function ResetPassword() {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setNotice("This password reset link is invalid or has expired.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        throw new Error(result.error.message ?? "Unable to reset your password");
      }
      setNotice("Your password has been updated. You can now sign in.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reset your password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page auth-page--login">
      <section className="auth-main" aria-labelledby="reset-heading">
        <header className="auth-header">
          <a className="auth-brand allison-regular" href="/" aria-label="RaiseVeil home">
            RaiseVeil
          </a>
          <a className="auth-home-link" href="/login">Back to sign in</a>
        </header>
        <div className="auth-form-wrap">
          <div className="auth-copy">
            <p className="auth-kicker">Account security</p>
            <h1 id="reset-heading">Choose a new password.</h1>
            <p className="auth-description">Use at least 8 characters.</p>
          </div>
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label className="auth-field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
            </label>
            <button className="auth-submit" disabled={busy || !token} type="submit">
              Update password
            </button>
            {notice && <p className="auth-notice" role="status">{notice}</p>}
          </form>
        </div>
      </section>
      <aside className="auth-aside" aria-label="About RaiseVeil">
        <div className="auth-aside__content">
          <div className="auth-aside__heading">
            <p>RaiseVeil</p>
            <h2>Keep your account yours.</h2>
            <span>Secure access to a trading record you can prove.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
