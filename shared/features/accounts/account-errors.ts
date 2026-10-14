export function accountErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  if (code === "email_address_not_authorized")
    return "This project's email sender cannot send to this address. The project owner needs to configure a custom email sender in Supabase.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "The email service limit was reached. Wait before requesting another confirmation email.";
  if (code === "email_not_confirmed")
    return "Your account is not confirmed yet. You can request another confirmation email below.";
  return error instanceof Error
    ? error.message
    : "Account action failed. Please try again.";
}

export function needsEmailConfirmation(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "email_not_confirmed",
  );
}
