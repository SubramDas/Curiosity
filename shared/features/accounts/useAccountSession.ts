import { useEffect, useState } from "react";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { callApi } from "../../lib/api";
import { authenticateAccount } from "./account-actions";

interface AccountConfig {
  supabaseConfigured: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

// One client owns browser storage, token renewal, and changes from other tabs.
let clientPromise: Promise<SupabaseClient | null> | undefined;
function loadAccountClient() {
  clientPromise ??= callApi<AccountConfig>("config")
    .then((config) => {
      if (!config.supabaseConfigured) return null;
      if (!config.supabaseUrl || !config.supabasePublishableKey)
        throw new Error(
          "Account configuration is unavailable. Restart npm run dev.",
        );
      return createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    })
    .catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  return clientPromise;
}

export function useAccountSession() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    loadAccountClient()
      .then((loaded) => {
        if (!active) return;
        setClient(loaded);
        if (!loaded) {
          setReady(true);
          return;
        }
        const { data } = loaded.auth.onAuthStateChange((_event, next) => {
          if (!active) return;
          setSession(next);
          setReady(true);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) {
          setError(
            "Accounts could not load. Check your connection and refresh.",
          );
          setReady(true);
        }
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  async function authenticate(
    action: "sign-in" | "sign-up",
    email: string,
    password: string,
  ) {
    if (!client) throw new Error("Accounts are not available yet.");
    return authenticateAccount(client.auth, action, email, password);
  }
  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
  }
  return {
    token: session?.access_token,
    email: session?.user.email,
    userId: session?.user.id,
    resendConfirmation: async (email: string) => {
      if (!client) throw new Error("Accounts are not available yet.");
      const { error } = await client.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    },
    ready,
    enabled: Boolean(client),
    error,
    authenticate,
    signOut,
  };
}
