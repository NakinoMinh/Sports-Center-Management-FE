const configuredBaseUrl = (): string =>
  (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

export const isApiConfigured = (): boolean =>
  configuredBaseUrl().length > 0 &&
  (import.meta.env.MODE !== "test" || import.meta.env.VITE_API_TEST_MODE === "true");

const token = (): string | null =>
  sessionStorage.getItem("scms_auth_token") ||
  localStorage.getItem("scms_auth_token");

export const API_UNAUTHORIZED_EVENT = "scms:api-unauthorized";
const API_TIMEOUT_MS = 15_000;

const clearExpiredSession = (): void => {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem("scms_auth_token");
    storage.removeItem("scms_demo_session_v1");
    storage.removeItem("scms_api_user");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
  }
};

const errorMessage = (body: unknown, status: number): string => {
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const value = body as {
      error?: { message?: string; details?: Record<string, string[]> };
      message?: string;
      title?: string;
    };
    if (value.error?.details) {
      const first = Object.values(value.error.details).flat()[0];
      if (first) return first;
    }
    if (value.error?.message) return value.error.message;
    if (value.message) return value.message;
    if (value.title) return value.title;
  }
  return `Yêu cầu API thất bại (${status}).`;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!isApiConfigured()) throw new Error("VITE_API_BASE_URL chưa được cấu hình.");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const controller = init.signal ? null : new AbortController();
  const timeout = controller
    ? globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    : undefined;
  let response: Response;
  try {
    response = await fetch(`${configuredBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller?.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối và thử lại.",
        408,
        "REQUEST_TIMEOUT",
      );
    }
    throw error;
  } finally {
    if (timeout !== undefined) globalThis.clearTimeout(timeout);
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  const body: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const envelope = body && typeof body === "object"
      ? body as { error?: { code?: string; details?: unknown } }
      : undefined;
    const apiError = new ApiError(
      errorMessage(body, response.status),
      response.status,
      envelope?.error?.code,
      envelope?.error?.details,
    );
    if (response.status === 401 && accessToken) clearExpiredSession();
    throw apiError;
  }
  return body as T;
}
