import { useState, type FormEvent } from "react";
import "./auth-page.css";
import { authClient } from "../lib/auth-client";

type AuthMode = "login" | "signup";

interface AuthPageProps {
  mode: AuthMode;
}

function RecordIllustration() {
  return (
    <div className="record-frame" aria-hidden="true">
      <div className="record-sheet">
        <div className="record-sheet__header">
          <span className="record-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 16.5 13 22l12-13" />
              <circle cx="16" cy="16" r="14" />
            </svg>
          </span>
          <span className="record-status">Verified record</span>
        </div>
        <p className="record-sheet__title">Your trading history</p>
        <div className="record-chart">
          <svg viewBox="0 0 360 104" preserveAspectRatio="none">
            <path className="record-chart__grid" d="M0 20H360M0 52H360M0 84H360" />
            <path className="record-chart__line" d="M4 77C28 73 31 43 57 49s34 22 54 5 33-27 52-12 24 22 47 8 34-23 52-13 36 3 47-10 31-8 47-17" />
          </svg>
        </div>
        <div className="record-sheet__footer">
          <span>Performance, proven</span>
          <span className="record-private">
            <svg viewBox="0 0 16 16" fill="none">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            Strategy stays private
          </span>
        </div>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: AuthPageProps) {
  const isSignup = mode === "signup";
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailValue, setEmailValue] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      if (isSignup) {
        const name = String(formData.get("name") ?? "");
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (result.error) {
          throw new Error(result.error.message ?? "Unable to create your account");
        }
        const session = await authClient.getSession();
        if (!session.data?.user) {
          setNotice("Check your email for a verification link before signing in.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (result.error) {
          throw new Error(result.error.message ?? "Unable to sign in");
        }
      }
      window.location.assign("/dashboard");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to complete sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`auth-page auth-page--${mode}`}>
      <section className="auth-main" aria-labelledby="auth-heading">
        <header className="auth-header">
          <a className="auth-brand allison-regular" href="/" aria-label="RaiseVeil home">
            RaiseVeil
          </a>
          <a className="auth-home-link" href="/">
            Back to home
          </a>
        </header>

        <div className="auth-form-wrap">
          <div className="auth-copy">
            <p className="auth-kicker">RaiseVeil</p>
            <h1 id="auth-heading">
              {isSignup ? "Find your next capital." : "Welcome back."}
            </h1>
            <p className="auth-description">
              {isSignup
                ? "Build trust in your track record without giving away your strategy."
                : "Sign in to continue building your verified track record."}
            </p>
          </div>

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            {isSignup && (
              <label className="auth-field">
                <span>Your name</span>
                <input
                  autoComplete="name"
                  name="name"
                  placeholder="Full name"
                  required
                />
              </label>
            )}
            <label className="auth-field">
              <span>Email address</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmailValue(event.currentTarget.value)}
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type="password"
              />
            </label>
            {!isSignup && (
              <div className="auth-forgot">
                <button
                  className="auth-text-button"
                  onClick={async () => {
                    if (!emailValue.trim()) {
                      setNotice("Enter your email address first to request a password reset.");
                      return;
                    }
                    try {
                      const result = await authClient.requestPasswordReset({
                        email: emailValue.trim(),
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      setNotice(
                        result.error
                          ? result.error.message ?? "Unable to request a password reset."
                          : "If an account exists for that email, reset instructions are on the way.",
                      );
                    } catch (error) {
                      setNotice(error instanceof Error ? error.message : "Unable to request a password reset.");
                    }
                  }}
                  type="button"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? isSignup
                  ? "Creating account…"
                  : "Signing in…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}
          </form>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to RaiseVeil?"}{" "}
            <a href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Log in" : "Create an account"}
            </a>
          </p>
        </div>
      </section>

      <aside className="auth-aside" aria-label="About RaiseVeil">
        <div className="auth-aside__content">
          <div className="auth-aside__heading">
            <p>RaiseVeil</p>
            <h2>Let your results speak. Keep your strategy yours.</h2>
            <span>Private trading proofs for a more open path to capital.</span>
          </div>
          <RecordIllustration />
          <p className="auth-aside__footnote">
            Verified performance. Nothing extra revealed.
          </p>
        </div>
      </aside>
    </main>
  );
}
