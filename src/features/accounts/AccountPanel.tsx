import { Icon } from "../navigation/Icon";
import { useState } from "react";
import { callApi } from "../../lib/api";

export function AccountPanel({
  enabled,
  signedIn,
  onSignIn,
  onSignOut,
}: {
  enabled: boolean;
  signedIn: boolean;
  onSignIn: (token: string) => Promise<void>;
  onSignOut: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(action: "sign-in" | "sign-up") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await callApi<{ accessToken: string | null }>(
        `auth/${action}`,
        { email, password },
      );
      setPassword("");
      if (result.accessToken) {
        await onSignIn(result.accessToken);
        setMessage("Signed in. New searches can be saved to your account.");
      } else
        setMessage("Check your email to confirm your account, then sign in.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Account action failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="account-panel">
      <summary className={signedIn ? "profile-summary" : undefined}>
        {signedIn ? (
          <span className="profile-avatar" aria-hidden="true">
            {email.slice(0, 1).toUpperCase() || "U"}
          </span>
        ) : (
          <Icon name="user" />
        )}
        <span className={signedIn ? "sr-only" : undefined}>
          {signedIn ? "Your account" : "Sign in"}
        </span>
      </summary>
      <div className="account-dropdown">
        <h3>{signedIn ? "Your account" : "Save across devices"}</h3>
        {!enabled ? (
          <p>
            Supabase is not configured yet. Guest topics are saved only in this
            browser.
          </p>
        ) : signedIn ? (
          <>
            <p>
              Signed in for this tab. Sign in again after refreshing; account
              topics remain saved online.
            </p>
            <button onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit("sign-in");
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <div className="button-row">
              <button disabled={busy}>Sign in</button>
              <button
                type="button"
                disabled={busy || !email || password.length < 8}
                onClick={() => void submit("sign-up")}
              >
                Create account
              </button>
            </div>
          </form>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}
