import { Icon } from "../../components/Icon";
import { accountErrorMessage, needsEmailConfirmation } from "./account-errors";
import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function AccountPanel({
  enabled,
  signedIn,
  ready,
  accountEmail,
  accountError,
  onAuthenticate,
  onResendConfirmation,
  onSignOut,
  presentation = "popover",
  isOpen,
  onOpenChange,
}: {
  presentation?: "popover" | "screen";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  enabled: boolean;
  signedIn: boolean;
  ready: boolean;
  accountEmail?: string;
  accountError: string;
  onAuthenticate: (
    action: "sign-in" | "sign-up",
    email: string,
    password: string,
  ) => Promise<Session | null>;
  onResendConfirmation: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  function closePanel() {
    if (!panel.current) return;
    panel.current.open = false;
    panel.current.querySelector("summary")?.focus();
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  async function submit(action: "sign-in" | "sign-up") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const session = await onAuthenticate(action, email, password);
      setPassword("");
      if (session) {
        setConfirmationEmail("");
        setMessage("Signed in. New searches can be saved to your account.");
      } else {
        setConfirmationEmail(email.trim());
        setMessage(
          "If this is a new account, check your email to confirm it. If you already have an account, sign in with your existing password.",
        );
      }
    } catch (error) {
      if (needsEmailConfirmation(error)) setConfirmationEmail(email.trim());
      setMessage(accountErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      ref={panel}
      open={isOpen}
      onToggle={(event) => onOpenChange?.(event.currentTarget.open)}
      className={`account-panel ${presentation === "screen" ? "account-screen" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") closePanel();
      }}
    >
      <summary className={signedIn ? "profile-summary" : undefined}>
        {signedIn ? (
          <span className="profile-avatar" aria-hidden="true">
            {(accountEmail ?? email).slice(0, 1).toUpperCase() || "U"}
          </span>
        ) : (
          <Icon name="user" />
        )}
        <span className={signedIn ? "sr-only" : undefined}>
          {signedIn ? "Your account" : "Sign in"}
        </span>
      </summary>
      <div className="account-dropdown">
        {presentation === "screen" && (
          <button className="text-button account-close" onClick={closePanel}>
            ← Close account
          </button>
        )}
        <h3>{signedIn ? "Your account" : "Save across devices"}</h3>
        {!ready ? (
          <p>Checking your saved sign-in…</p>
        ) : accountError ? (
          <p role="alert">{accountError}</p>
        ) : !enabled ? (
          <p>
            Supabase is not configured yet. Guest topics are saved only in this
            browser.
          </p>
        ) : signedIn ? (
          <>
            <p>
              Signed in as {accountEmail}. Your sign-in stays saved in this
              browser until you sign out.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  await onSignOut();
                  setMessage("Signed out on this browser.");
                } catch {
                  setMessage(
                    "Sign out could not finish. Check your connection and try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sign out
            </button>
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
        {!signedIn && confirmationEmail && (
          <>
            <p className="fine-print">
              Check spam too. After confirming your email, sign in with your
              password.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("");
                try {
                  await onResendConfirmation(confirmationEmail);
                  setMessage(
                    "Confirmation email requested. Check your inbox and spam folder. Delivery may take a few minutes.",
                  );
                } catch (error) {
                  setMessage(accountErrorMessage(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Resend confirmation email
            </button>
          </>
        )}
      </div>
    </details>
  );
}
