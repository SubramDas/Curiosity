import type { SupabaseClient } from "@supabase/supabase-js";

export async function authenticateAccount(
  auth: Pick<SupabaseClient["auth"], "signInWithPassword" | "signUp">,
  action: "sign-in" | "sign-up",
  email: string,
  password: string,
) {
  const credentials = { email: email.trim(), password };
  // Existing account holders can use either button with their correct password.
  const login = await auth.signInWithPassword(credentials);
  if (!login.error) return login.data.session;
  if (action === "sign-in" || login.error.code !== "invalid_credentials")
    throw login.error;
  const signup = await auth.signUp({
    ...credentials,
    options: { emailRedirectTo: window.location.origin },
  });
  if (signup.error) throw signup.error;
  return signup.data.session;
}
