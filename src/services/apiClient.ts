import type { ApiSession, UserRole } from "../types/auth";

const API_SESSION_KEY = "scms_api_session_v1";

const apiBaseUrl = (): string =>
  (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

const readSession = (storage: Storage): ApiSession | null => {
  const raw = storage.getItem(API_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as ApiSession;
    if (
      typeof session.token !== "string" ||
      typeof session.expiresAt !== "string" ||
      !session.user ||
      typeof session.user.id !== "string"
    ) {
      storage.removeItem(API_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    storage.removeItem(API_SESSION_KEY);
    return null;
  }
};

export const apiConfigured = (): boolean => apiBaseUrl().length > 0;

export const getApiSession = (): ApiSession | null =>
  readSession(sessionStorage) ?? readSession(localStorage);

export const clearApiSession = (): void => {
  localStorage.removeItem(API_SESSION_KEY);
  sessionStorage.removeItem(API_SESSION_KEY);
};

export const saveApiSession = (
  session: ApiSession,
  rememberMe: boolean,
): void => {
  clearApiSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(API_SESSION_KEY, JSON.stringify(session));
};

export const mapApiRole = (role: string): UserRole => {
  switch (role) {
    case "CenterManager":
      return "CENTER_MANAGER";
    case "Coach":
      return "COACH";
    case "Member":
      return "MEMBER";
    case "Receptionist":
      return "RECEPTIONIST";
    default:
      throw new Error(`Unsupported API role: ${role}`);
  }
};

const errorMessage = (response: Response, body: string): string => {
  if (body) {
    try {
      const value = JSON.parse(body) as {
        error?: { message?: unknown };
        message?: unknown;
      };
      if (typeof value.error?.message === "string") {
        return value.error.message;
      }
      if (typeof value.message === "string") return value.message;
    } catch {
      return body;
    }
    return body;
  }
  return `${response.status} ${response.statusText}`.trim();
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error("Backend API is not configured.");

  const { token = getApiSession()?.token ?? null, ...requestInit } = init;
  const headers: Record<string, string> = {};
  new Headers(requestInit.headers).forEach((value, key) => {
    headers[key] = value;
  });
  if (requestInit.body && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    { ...requestInit, headers },
  );
  if (response.status === 401) clearApiSession();
  if (response.status === 204) return undefined as T;

  const body = await response.text();
  if (!response.ok) throw new Error(errorMessage(response, body));
  if (!body) return undefined as T;
  return JSON.parse(body) as T;
}
