import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSession } from "../types/auth";
import {
  apiConfigured,
  apiRequest,
  clearApiSession,
  getApiSession,
  mapApiRole,
  saveApiSession,
} from "./apiClient";

const makeStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
};

const session: ApiSession = {
  token: "test-token",
  expiresAt: "2026-10-01T12:00:00Z",
  user: {
    id: "manager-1",
    username: "manager@example.com",
    email: "manager@example.com",
    role: "CENTER_MANAGER",
    fullName: "Center Manager",
    createdAt: "2026-09-30T00:00:00Z",
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  },
};

beforeEach(() => {
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("API client boundary", () => {
  it("adds a bearer token and returns camelCase JSON", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198/");
    saveApiSession(session, true);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ value: 7 }), { status: 200 }),
    );

    await expect(apiRequest<{ value: number }>("/api/test")).resolves.toEqual({
      value: 7,
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5198/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${session.token}`,
        }),
      }),
    );
  });

  it("stores remembered sessions locally and temporary sessions per tab", () => {
    saveApiSession(session, true);
    expect(localStorage.getItem("scms_api_session_v1")).not.toBeNull();
    expect(sessionStorage.getItem("scms_api_session_v1")).toBeNull();

    saveApiSession(session, false);
    expect(localStorage.getItem("scms_api_session_v1")).toBeNull();
    expect(sessionStorage.getItem("scms_api_session_v1")).not.toBeNull();
    expect(getApiSession()).toEqual(session);
  });

  it("returns undefined for a 204 response", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest<void>("/api/test")).resolves.toBeUndefined();
  });

  it("uses structured backend error messages", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Account is inactive." } }),
        { status: 403 },
      ),
    );

    await expect(apiRequest("/api/test")).rejects.toThrow(
      "Account is inactive.",
    );
  });

  it("uses response text or status for unstructured errors", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("Plain failure", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }));

    await expect(apiRequest("/api/test")).rejects.toThrow("Plain failure");
    await expect(apiRequest("/api/test")).rejects.toThrow("502");
  });

  it("clears both session stores after a 401 response", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    saveApiSession(session, true);
    sessionStorage.setItem("scms_api_session_v1", JSON.stringify(session));
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    await expect(apiRequest("/api/test")).rejects.toThrow();
    expect(localStorage.getItem("scms_api_session_v1")).toBeNull();
    expect(sessionStorage.getItem("scms_api_session_v1")).toBeNull();
  });

  it("maps backend roles and rejects unknown roles", () => {
    expect(mapApiRole("CenterManager")).toBe("CENTER_MANAGER");
    expect(mapApiRole("Coach")).toBe("COACH");
    expect(mapApiRole("Member")).toBe("MEMBER");
    expect(mapApiRole("Receptionist")).toBe("RECEPTIONIST");
    expect(() => mapApiRole("Owner")).toThrow("Owner");
  });

  it("does not issue a request when the API base URL is missing", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(apiConfigured()).toBe(false);
    await expect(apiRequest("/api/test")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    clearApiSession();
  });
});
