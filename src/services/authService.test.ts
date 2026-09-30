import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { authService, SESSION_DURATION_MS } from "./authService";
import { getApiSession, saveApiSession } from "./apiClient";
import { mockDb } from "./mockDb";

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

const memberCredentials = {
  email: "member@sportscenter.com",
  password: "Pass@1234",
};
const registration = {
  username: "new_member",
  email: "new@example.com",
  password: "Training@123",
  confirmPassword: "Training@123",
};

beforeEach(() => {
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sprint 1 auth demo adapter", () => {
  it("registers a member with a bcrypt hash and no hash in its public result", async () => {
    const result = await authService.register({
      ...registration,
      email: " New@Example.com ",
      fullName: "Minh",
    });
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      email: "new@example.com",
      fullName: "Minh",
      role: "MEMBER",
    });
    expect(result.user).not.toHaveProperty("passwordHash");
    const saved = mockDb.findByEmail("new@example.com")!;
    expect(saved.passwordHash).not.toBe(registration.password);
    expect(
      await bcrypt.compare(registration.password, saved.passwordHash),
    ).toBe(true);
  });

  it("rejects invalid email, a short password, and mismatched confirmation", async () => {
    expect(
      (await authService.register({ ...registration, email: "bad-email" }))
        .success,
    ).toBe(false);
    expect(
      (
        await authService.register({
          ...registration,
          password: "short",
          confirmPassword: "short",
        })
      ).success,
    ).toBe(false);
    expect(
      (
        await authService.register({
          ...registration,
          confirmPassword: "different",
        })
      ).success,
    ).toBe(false);
    expect(mockDb.getUsers()).toHaveLength(4);
  });

  it("enforces case-insensitive unique emails and usernames", async () => {
    await authService.register(registration);
    const emailDuplicate = await authService.register({
      ...registration,
      email: " NEW@EXAMPLE.COM ",
      username: "other_user",
    });
    const usernameDuplicate = await authService.register({
      ...registration,
      email: "other@example.com",
      username: " NEW_MEMBER ",
    });
    expect(emailDuplicate).toMatchObject({ success: false });
    expect(usernameDuplicate).toMatchObject({ success: false });
    expect(mockDb.getUsers()).toHaveLength(5);
  });

  it("does not allow a caller to choose a privileged registration role", async () => {
    const injected = { ...registration, role: "CENTER_MANAGER" };
    const result = await authService.register(injected);
    expect(result.user?.role).toBe("MEMBER");
  });

  it("locks the account on the fifth consecutive failure, including subsequent correct login", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await authService.login({
        ...memberCredentials,
        password: "wrong",
      });
      expect(result.success).toBe(false);
      expect(result.failedAttemptsRemaining).toBe(5 - attempt);
    }
    expect(mockDb.findByEmail(memberCredentials.email)?.isLocked).toBe(true);
    expect(await authService.login(memberCredentials)).toMatchObject({
      success: false,
      isLocked: true,
    });
    expect(mockDb.getStoredToken()).toBeNull();
  });

  it("resets consecutive failed attempts after a successful login", async () => {
    await authService.login({ ...memberCredentials, password: "wrong" });
    const success = await authService.login(memberCredentials);
    expect(success.success).toBe(true);
    expect(success.user?.failedAttempts).toBe(0);
    expect(mockDb.findByEmail(memberCredentials.email)?.failedAttempts).toBe(0);
    expect(
      (await authService.login({ ...memberCredentials, password: "wrong" }))
        .failedAttemptsRemaining,
    ).toBe(4);
  });

  it("respects remember-me and uses a fresh token on every login", async () => {
    const persistent = await authService.login({
      ...memberCredentials,
      rememberMe: true,
    });
    expect(localStorage.getItem("scms_auth_token")).toBe(persistent.token);
    expect(sessionStorage.getItem("scms_auth_token")).toBeNull();
    const temporary = await authService.login({
      ...memberCredentials,
      rememberMe: false,
    });
    expect(localStorage.getItem("scms_auth_token")).toBeNull();
    expect(sessionStorage.getItem("scms_auth_token")).toBe(temporary.token);
    expect(temporary.token).not.toBe(persistent.token);
    expect(authService.verifyJWT(persistent.token!).valid).toBe(false);
  });

  it("expires exactly after 24 hours", async () => {
    const result = await authService.login(memberCredentials);
    const session = mockDb.getSession()!;
    expect(session.payload.exp - session.payload.iat).toBe(SESSION_DURATION_MS);
    vi.spyOn(Date, "now").mockReturnValue(session.payload.exp - 1);
    expect(authService.verifyJWT(result.token!).valid).toBe(true);
    vi.mocked(Date.now).mockReturnValue(session.payload.exp);
    expect(authService.verifyJWT(result.token!).valid).toBe(false);
  });

  it("rejects token replacement, malformed stored data, and role mismatch", async () => {
    const result = await authService.login(memberCredentials);
    expect(authService.verifyJWT(`${result.token}.changed`).valid).toBe(false);
    const session = mockDb.getSession()!;
    localStorage.setItem("scms_demo_session_v1", "{broken");
    expect(authService.verifyJWT(result.token!).valid).toBe(false);
    localStorage.setItem(
      "scms_demo_session_v1",
      JSON.stringify({
        ...session,
        payload: { ...session.payload, role: "CENTER_MANAGER" },
      }),
    );
    expect(authService.verifyJWT(result.token!).valid).toBe(false);
  });

  it("removes all session data and invalidates the old token on logout", async () => {
    const result = await authService.login(memberCredentials);
    await authService.logout();
    expect(localStorage.getItem("scms_auth_token")).toBeNull();
    expect(localStorage.getItem("scms_demo_session_v1")).toBeNull();
    expect(sessionStorage.getItem("scms_auth_token")).toBeNull();
    expect(authService.verifyJWT(result.token!).valid).toBe(false);
    expect(authService.getCurrentUser()).toBeNull();
    expect(mockDb.findByEmail(memberCredentials.email)).toBeDefined();
  });

  it("saves the backend JWT session when the API is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            accessToken: "backend-token",
            expiresAtUtc: "2026-10-01T12:00:00Z",
            accountId: "manager-1",
            email: "manager@example.com",
            role: "CenterManager",
            fullName: "Center Manager",
            createdAt: "2026-09-30T00:00:00Z",
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await authService.login({
      email: "manager@example.com",
      password: "Pass@1234",
      rememberMe: true,
    });

    expect(result).toMatchObject({
      success: true,
      token: "backend-token",
      user: { role: "CENTER_MANAGER", fullName: "Center Manager" },
    });
    expect(getApiSession()?.token).toBe("backend-token");
    expect(localStorage.getItem("scms_api_session_v1")).not.toBeNull();
  });

  it("uses backend registration and signs in when the API is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accountId: "member-1",
            email: "new@example.com",
            memberCode: "MB001",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "member-token",
            expiresAtUtc: "2026-10-01T12:00:00Z",
            accountId: "member-1",
            email: "new@example.com",
            role: "Member",
            fullName: null,
            createdAt: "2026-09-30T00:00:00Z",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await authService.register(registration);

    expect(result).toMatchObject({ success: true, token: "member-token" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:5198/api/Account/Register_member",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("clears the backend session even when logout delivery fails", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    saveApiSession(
      {
        token: "backend-token",
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
      },
      true,
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(getApiSession()).toBeNull();
  });

  it("keeps the existing mock login when the API URL is absent", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await authService.login(memberCredentials);

    expect(result.success).toBe(true);
    expect(result.token).toMatch(/^scms-demo\./);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed saved user fields before they can reach workspace rendering", async () => {
    const users = mockDb.getUsers();
    localStorage.setItem(
      "scms_users_database",
      JSON.stringify(users.map((user) => ({ ...user, fullName: null }))),
    );
    await expect(authService.login(memberCredentials)).rejects.toThrow(
      "Không đọc được dữ liệu demo",
    );
    expect(mockDb.getStoredToken()).toBeNull();
    // Corrupt data is preserved for diagnosis instead of silently reseeding it.
    expect(
      JSON.parse(localStorage.getItem("scms_users_database")!)[0].fullName,
    ).toBeNull();
  });
});
