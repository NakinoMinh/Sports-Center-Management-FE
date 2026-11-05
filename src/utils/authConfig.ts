/**
 * Local-development switch that mirrors `Auth:RequireLoginEmailVerification`
 * on the API. Set `VITE_REQUIRE_LOGIN_OTP=false` in `.env.local` together with
 * the API setting to walk the app without a mailbox.
 *
 * It is honoured only in a dev build, so a production bundle always asks for
 * the emailed code even if the variable leaks into the build environment.
 */
export const loginOtpDisabled = (): boolean =>
  import.meta.env.DEV &&
  String(import.meta.env.VITE_REQUIRE_LOGIN_OTP ?? "").trim().toLowerCase() ===
    "false";
