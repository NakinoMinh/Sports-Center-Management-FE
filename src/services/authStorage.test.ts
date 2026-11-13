import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TOKEN_KEY,
  USER_KEY,
  clearTabSession,
  getTabToken,
  readTabItem,
  updateTabItem,
  writeTabSession,
} from "./authStorage";

const makeStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

// One shared localStorage, one sessionStorage per tab — the same split a browser makes.
let sharedLocal: Storage;
const tabs: Storage[] = [];

const useTab = (index: number): void => {
  while (tabs.length <= index) tabs.push(makeStorage());
  vi.stubGlobal("sessionStorage", tabs[index]);
};

const login = (token: string, rememberMe = true): void =>
  writeTabSession({ [TOKEN_KEY]: token, [USER_KEY]: JSON.stringify({ id: token }) }, rememberMe);

beforeEach(() => {
  sharedLocal = makeStorage();
  tabs.length = 0;
  vi.stubGlobal("localStorage", sharedLocal);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authStorage – one session per tab", () => {
  it("keeps four tabs signed in as four different accounts", () => {
    const roles = ["manager", "receptionist", "coach", "member"];
    roles.forEach((role, index) => {
      useTab(index);
      login(`token-${role}`);
    });

    roles.forEach((role, index) => {
      useTab(index);
      expect(getTabToken()).toBe(`token-${role}`);
    });
  });

  it("lets a new tab start from the latest remembered login", () => {
    useTab(0);
    login("token-member");

    useTab(1);
    expect(getTabToken()).toBe("token-member");
  });

  it("does not remember a login without remember-me", () => {
    useTab(0);
    login("token-member", false);

    useTab(1);
    expect(getTabToken()).toBeNull();
  });

  it("signs out only the current tab", () => {
    useTab(0);
    login("token-manager");
    useTab(1);
    login("token-coach");

    clearTabSession();

    expect(getTabToken()).toBeNull();
    useTab(0);
    expect(getTabToken()).toBe("token-manager");
  });

  it("does not adopt another account after this tab signed out", () => {
    useTab(0);
    login("token-manager");
    clearTabSession();
    useTab(1);
    login("token-coach");

    useTab(0);
    expect(getTabToken()).toBeNull();
  });

  it("updates the remembered copy only when it belongs to this tab", () => {
    useTab(0);
    login("token-manager");
    useTab(1);
    login("token-coach");

    useTab(0);
    updateTabItem(USER_KEY, "manager-profile");

    expect(readTabItem(USER_KEY)).toBe("manager-profile");
    expect(sharedLocal.getItem(USER_KEY)).toBe(JSON.stringify({ id: "token-coach" }));
  });
});
