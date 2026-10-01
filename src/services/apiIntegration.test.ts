import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "./authService";
import { membershipApi } from "./membershipApi";

const makeStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
};

const json = (body: unknown, status = 200): Response => new Response(
  JSON.stringify(body),
  { status, headers: { "Content-Type": "application/json" } },
);

const authSession = (role: "Member" | "CenterManager" | "Receptionist" = "Member") => ({
  accessToken: `token-${role}`,
  tokenType: "Bearer",
  expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
  accountId: role === "Member" ? "usr_member_01" : `usr_${role.toLowerCase()}_01`,
  email: role === "Member" ? "member@sportscenter.com" : `${role.toLowerCase()}@sportscenter.com`,
  role,
});

const packageDto = {
  id: 1,
  name: "Gói Tháng",
  price: 450000,
  durationMonths: 1,
  benefits: ["Phòng tập"],
  isActive: true,
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: null,
};

const receiptDto = {
  invoiceId: 8,
  invoiceNumber: "INV-8",
  amount: 450000,
  paymentMethod: "CASH",
  invoiceStatus: "PAID",
  createdAt: "2026-09-30T00:00:00Z",
  paidAt: "2026-09-30T00:01:00Z",
  paidByStaffId: "usr_recept_01",
  paidByStaffName: "Lễ tân",
  subscriptionId: 7,
  subscriptionStatus: "CONFIRMED",
  kind: "REGISTER",
  startDate: "2026-09-30",
  endDate: "2026-10-29",
  packageId: 1,
  packageName: "Gói Tháng",
  packagePrice: 450000,
  durationMonths: 1,
  benefits: ["Phòng tập"],
  memberAccountId: "usr_member_01",
  memberCode: "MB-DEMO-001",
  memberFullName: "Thành viên",
  memberEmail: "member@sportscenter.com",
  memberPhone: "0987654321",
};

const accountProfile = (email: string, accountId: string) => ({
  accountId,
  email,
  role: "Member",
  fullName: "Thành viên API",
  phone: null,
  dateOfBirth: null,
  avatarUrl: null,
  specialization: null,
  workSchedule: null,
  memberCode: "MB-API-001",
  createdAt: "2026-09-30T00:00:00Z",
});

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sprint 1 API adapters", () => {
  it("connects UC1 register and starts the new member session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ message: "sent", expiresInSeconds: 300, cooldownSeconds: 60, demoCode: "123456" }))
      .mockResolvedValueOnce(json({ accountId: "new-1", email: "new@example.com", memberCode: "MB-1" }))
      .mockResolvedValueOnce(json({ ...authSession(), accountId: "new-1", email: "new@example.com" }))
      .mockResolvedValueOnce(json(accountProfile("new@example.com", "new-1")))
      .mockResolvedValueOnce(json({
        ...accountProfile("new@example.com", "new-1"),
        fullName: "New Member",
      }));
    vi.stubGlobal("fetch", fetchMock);
    const otp = await authService.requestEmailVerification({ email: "new@example.com", purpose: "REGISTER" });
    const result = await authService.register({
      username: "new_member",
      email: "new@example.com",
      fullName: "New Member",
      password: "Training@123",
      confirmPassword: "Training@123",
      emailVerificationCode: otp.demoCode,
    });
    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/Account/request-register-email-verification");
    expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/api/Account/Register_member");
    expect(fetchMock.mock.calls[2][0]).toBe("http://api.test/api/Auth/login");
    expect(fetchMock.mock.calls[3][0]).toBe("http://api.test/api/Account/profile");
    expect(fetchMock.mock.calls[4][0]).toBe("http://api.test/api/Account/profile");
  });

  it("connects UC2 login and UC3 logout with the bearer token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ message: "sent", expiresInSeconds: 300, cooldownSeconds: 60, demoCode: "654321" }))
      .mockResolvedValueOnce(json(authSession()))
      .mockResolvedValueOnce(json(accountProfile("member@sportscenter.com", "usr_member_01")))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const otp = await authService.requestEmailVerification({
      email: "member@sportscenter.com",
      password: "valid-password",
      purpose: "LOGIN",
    });
    const result = await authService.login({
      email: "member@sportscenter.com",
      password: "valid-password",
      emailVerificationCode: otp.demoCode,
    });
    expect(result.success).toBe(true);
    await authService.logout();
    expect(fetchMock.mock.calls[3][0]).toBe("http://api.test/api/Auth/Logout");
    const logoutHeaders = fetchMock.mock.calls[3][1]?.headers as Headers;
    expect(logoutHeaders.get("Authorization")).toBe("Bearer token-Member");
    expect(localStorage.getItem("scms_auth_token")).toBeNull();
  });

  it("connects UC9 package CRUD and visibility", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ items: [packageDto], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }))
      .mockResolvedValueOnce(json(packageDto, 201))
      .mockResolvedValueOnce(json({ ...packageDto, name: "Gói Tháng Mới" }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await membershipApi.listPackages()).toHaveLength(1);
    await membershipApi.savePackage({ name: packageDto.name, price: 450000, durationMonths: 1, benefits: ["Phòng tập"] });
    await membershipApi.savePackage({ name: "Gói Tháng Mới", price: 450000, durationMonths: 1, benefits: ["Phòng tập"] }, "1");
    await membershipApi.setPackageStatus("1", false);
    await membershipApi.deletePackage("1");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/MembershipPackage?page=1&pageSize=20",
      "http://api.test/api/MembershipPackage",
      "http://api.test/api/MembershipPackage/1",
      "http://api.test/api/MembershipPackage/1/status",
      "http://api.test/api/MembershipPackage/1",
    ]);
  });

  it("connects UC11 member registration and UC15 counter registration", async () => {
    const pending = {
      subscriptionId: 5,
      invoiceNumber: "INV-5",
      packageId: 1,
      packageName: "Gói Tháng",
      packagePrice: 450000,
      durationMonths: 1,
      benefits: ["Phòng tập"],
      startDate: "2026-09-30",
      endDate: "2026-10-29",
      kind: "REGISTER",
      status: "PENDING_PAYMENT",
      amount: 450000,
      paymentMethod: "CASH",
      createdAt: "2026-09-30T00:00:00Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(pending, 201))
      .mockResolvedValueOnce(json(receiptDto, 201));
    vi.stubGlobal("fetch", fetchMock);
    const actor = {
      id: "usr_member_01",
      username: "member",
      email: "member@sportscenter.com",
      role: "MEMBER" as const,
      fullName: "Thành viên",
      createdAt: "2026-09-30T00:00:00Z",
      failedAttempts: 0,
      isLocked: false,
    };
    expect((await membershipApi.registerOrRenew(actor, "1", "CASH")).invoice.status).toBe("PENDING_PAYMENT");
    expect((await membershipApi.counterRegisterOrRenew("usr_member_01", "1", "CASH")).invoice.status).toBe("PAID");
  });
});
