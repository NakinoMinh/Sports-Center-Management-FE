import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CounterMemberRegistrationInput,
  MembershipStatusRow,
} from "../types/membership";
import { saveApiSession } from "./apiClient";
import { sportsCenterApi } from "./sportsCenterApi";

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

const mockJson = (body: unknown, status = 200) => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
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

describe("typed Sports Center API facade", () => {
  it("maps the BE member page to the existing manager-page shape", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    mockJson({
      items: [
        {
          accountId: "a1",
          memberCode: "MEM001",
          fullName: "An",
          email: "an@example.com",
          phone: "0912345678",
          status: "Active",
          dateOfBirth: "2000-01-02",
          createdAt: "2026-09-30T00:00:00Z",
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });

    await expect(
      sportsCenterApi.listMembers("an", "ACTIVE", 1),
    ).resolves.toMatchObject({
      total: 1,
      pages: 1,
      items: [
        {
          id: "a1",
          username: "MEM001",
          role: "MEMBER",
          isActive: true,
        },
      ],
    });
  });

  it("maps create, update, and delete member contracts", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    const input = {
      fullName: "Binh",
      email: "binh@example.com",
      phone: "0987654321",
      dateOfBirth: "2001-03-04",
      isActive: true,
    };
    const member = {
      accountId: "a2",
      memberCode: "MEM002",
      fullName: "Binh",
      email: "binh@example.com",
      phone: "0987654321",
      dateOfBirth: "2001-03-04",
      status: "Active",
      createdAt: "2026-09-30T00:00:00Z",
    };
    mockJson({ member, initialPassword: "Tt9!one-time" }, 201);
    mockJson({ ...member, fullName: "Binh Updated" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(sportsCenterApi.createMember(input)).resolves.toMatchObject({
      member: { id: "a2", username: "MEM002" },
      initialPassword: "Tt9!one-time",
    });
    await expect(
      sportsCenterApi.updateMember("a2", { ...input, fullName: "Binh Updated" }),
    ).resolves.toMatchObject({ fullName: "Binh Updated" });
    await expect(sportsCenterApi.deleteMember("a2")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:5198/api/Member/a2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("maps numeric package IDs to the existing string UI contract", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    mockJson([
      {
        id: 11,
        name: "Monthly",
        price: 500000,
        durationMonths: 1,
        benefits: ["Gym"],
      },
    ]);

    await expect(sportsCenterApi.listActivePackages()).resolves.toEqual([
      {
        id: "11",
        name: "Monthly",
        price: 500000,
        durationMonths: 1,
        benefits: ["Gym"],
      },
    ]);
  });

  it("maps counter registration without exposing a password hash", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    saveApiSession(
      {
        token: "staff-token",
        expiresAt: "2026-10-01T12:00:00Z",
        user: {
          id: "staff-1",
          username: "staff@example.com",
          email: "staff@example.com",
          role: "RECEPTIONIST",
          fullName: "Staff",
          createdAt: "2026-09-30T00:00:00Z",
          failedAttempts: 0,
          isLocked: false,
          isActive: true,
        },
      },
      false,
    );
    const input: CounterMemberRegistrationInput = {
      fullName: "Binh",
      email: "binh@example.com",
      phone: "0987654321",
      dateOfBirth: "2001-03-04",
      packageId: "11",
      paymentMethod: "CASH",
      expectedPrice: 500000,
    };
    mockJson({
      member: {
        accountId: "a2",
        memberCode: "MEM002",
        fullName: "Binh",
        email: "binh@example.com",
        phone: "0987654321",
        dateOfBirth: "2001-03-04",
        status: "Active",
        createdAt: "2026-09-30T00:00:00Z",
      },
      initialPassword: "Tt9!one-time",
      emailDelivery: "NOT_CONFIGURED",
      receipt: {
        invoiceId: 4,
        invoiceNumber: "INV-1",
        amount: 500000,
        paymentMethod: "CASH",
        invoiceStatus: "PENDING_PAYMENT",
        createdAt: "2026-09-30T00:00:00Z",
        subscriptionId: 3,
        subscriptionStatus: "PENDING_PAYMENT",
        kind: "REGISTER",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        packageId: 11,
        packageName: "Monthly",
        packagePrice: 500000,
        durationMonths: 1,
        benefits: ["Gym"],
        memberAccountId: "a2",
        memberCode: "MEM002",
        memberFullName: "Binh",
        memberEmail: "binh@example.com",
        memberPhone: "0987654321",
      },
    });

    const result = await sportsCenterApi.registerMemberAtCounter(input);

    expect(result.initialPassword).toBe("Tt9!one-time");
    expect(result.member).not.toHaveProperty("passwordHash");
    expect(result.order.invoice.number).toBe("INV-1");
    expect(result.order.invoice.createdBy).toBe("staff-1");
  });

  it("maps backend membership status rows without recalculating dates", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");
    mockJson([
      {
        accountId: "a1",
        memberCode: "MEM001",
        fullName: null,
        email: "an@example.com",
        phone: null,
        status: "ACTIVE",
        remainingDays: 6,
        expiringSoon: true,
        subscriptionId: 1,
        packageId: 11,
        packageName: "Monthly",
        startDate: "2026-09-01",
        endDate: "2026-10-05",
        suspensionReason: null,
        upcomingSubscriptionId: 2,
        upcomingPackageName: "Quarterly",
        upcomingStartDate: "2026-10-06",
        upcomingEndDate: "2027-01-05",
      },
    ]);

    const rows: MembershipStatusRow[] =
      await sportsCenterApi.listMembershipStatuses("an", "EXPIRING");

    expect(rows[0]).toMatchObject({
      member: { username: "MEM001", fullName: "" },
      remainingDays: 6,
      subscription: { endDate: "2026-10-05" },
      upcoming: { startDate: "2026-10-06" },
    });
  });

  it("rejects non-integer package IDs before issuing counter registration", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");

    await expect(
      sportsCenterApi.registerMemberAtCounter({
        fullName: "Binh",
        email: "binh@example.com",
        phone: "0987654321",
        dateOfBirth: "2001-03-04",
        packageId: "pkg_monthly",
        paymentMethod: "CASH",
        expectedPrice: 500000,
      }),
    ).rejects.toThrow("package");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the existing mock adapter when the API is not configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    const packages = await sportsCenterApi.listActivePackages();

    expect(packages.length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
