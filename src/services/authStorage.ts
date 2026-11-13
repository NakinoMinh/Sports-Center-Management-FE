/**
 * Where the login session lives in the browser.
 *
 * Every tab keeps its own session in sessionStorage, so four tabs can be signed
 * in as four different accounts at the same time (Manager, Receptionist, Coach,
 * Member during a demo). localStorage is shared by every tab of the origin;
 * using it as the live session made each new login overwrite the others.
 *
 * localStorage only keeps a "remembered" copy of the latest login with
 * "Ghi nhớ đăng nhập", which a brand-new tab adopts once when it opens.
 */
export const TOKEN_KEY = "scms_auth_token";
export const SESSION_KEY = "scms_api_session";
export const USER_KEY = "scms_api_user";

const LEGACY_DEMO_SESSION_KEY = "scms_demo_session_v1";
// Marks that this tab already decided its starting session. Without it a tab
// that signed out would silently adopt another account's remembered session
// the next time it reads storage.
const TAB_INITIALIZED_KEY = "scms_tab_initialized";
const SESSION_KEYS: readonly string[] = [TOKEN_KEY, SESSION_KEY, USER_KEY];

const adoptRememberedSessionOnce = (): void => {
  try {
    if (sessionStorage.getItem(TAB_INITIALIZED_KEY)) return;
    sessionStorage.setItem(TAB_INITIALIZED_KEY, "1");
    if (sessionStorage.getItem(TOKEN_KEY) || !localStorage.getItem(TOKEN_KEY)) return;
    for (const key of SESSION_KEYS) {
      const value: string | null = localStorage.getItem(key);
      if (value !== null) sessionStorage.setItem(key, value);
    }
  } catch {
    // Storage can be blocked (private mode, strict site settings); the tab
    // then simply starts signed out instead of crashing.
  }
};

const isRememberedCopyOfThisTab = (): boolean => {
  const tabToken: string | null = sessionStorage.getItem(TOKEN_KEY);
  return tabToken !== null && localStorage.getItem(TOKEN_KEY) === tabToken;
};

export const readTabItem = (key: string): string | null => {
  adoptRememberedSessionOnce();
  return sessionStorage.getItem(key);
};

export const getTabToken = (): string | null => readTabItem(TOKEN_KEY);

export const writeTabSession = (entries: Record<string, string>, rememberMe: boolean): void => {
  adoptRememberedSessionOnce();
  for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  for (const [key, value] of Object.entries(entries)) sessionStorage.setItem(key, value);
  for (const key of SESSION_KEYS) localStorage.removeItem(key);
  if (!rememberMe) return;
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
};

/** Updates one field of this tab's session, and the remembered copy only when it is the same login. */
export const updateTabItem = (key: string, value: string): void => {
  adoptRememberedSessionOnce();
  if (isRememberedCopyOfThisTab()) localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
};

/** Signs this tab out without touching sessions of other tabs. */
export const clearTabSession = (): void => {
  adoptRememberedSessionOnce();
  if (isRememberedCopyOfThisTab()) {
    for (const key of SESSION_KEYS) localStorage.removeItem(key);
  }
  for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  sessionStorage.removeItem(LEGACY_DEMO_SESSION_KEY);
  localStorage.removeItem(LEGACY_DEMO_SESSION_KEY);
};
