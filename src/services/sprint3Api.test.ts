import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { membershipApi } from "./membershipApi";
import { buildCsvContent, escapeCsvCell, reportApi } from "./reportApi";
import { navigationFor } from "../utils/navigation";

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

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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

describe("Sprint 3 API & Reporting (UC33 – UC39)", () => {
  it("UC33: creates a member account at counter without a package order", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json(
        {
          member: {
            accountId: "acc-new-1",
            memberCode: "MB2610270001",
            fullName: "Lê Văn Mới",
            email: "levanmoi@example.com",
            phone: "0912345678",
            status: "Active",
            createdAt: "2026-10-27T08:00:00Z",
          },
          emailDelivery: "NOT_CONFIGURED",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await membershipApi.counterRegisterMember({
      fullName: "Lê Văn Mới",
      email: "levanmoi@example.com",
      phone: "0912345678",
      dateOfBirth: "1998-05-12",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://api.test/api/Member/counter-registration",
    );
    expect(result.member.id).toBe("acc-new-1");
    expect(result.emailDelivery).toBe("NOT_CONFIGURED");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      fullName: "Lê Văn Mới", email: "levanmoi@example.com", phone: "0912345678", dateOfBirth: "1998-05-12",
    });
  });

  it("UC34 & UC35: confirms cash payment and supports paginated invoice search", async () => {
    const paidReceipt = {
      invoiceId: 101,
      invoiceNumber: "INV-20261027-0001",
      amount: 500000,
      paymentMethod: "CASH",
      invoiceStatus: "PAID",
      createdAt: "2026-10-27T08:00:00Z",
      paidAt: "2026-10-27T08:05:00Z",
      paidByStaffId: "staff-1",
      paidByStaffName: "Lễ tân Minh",
      subscriptionId: 201,
      subscriptionStatus: "CONFIRMED",
      kind: "REGISTER",
      startDate: "2026-10-27",
      endDate: "2026-11-26",
      packageId: 1,
      packageName: "Gói 1 Tháng",
      packagePrice: 500000,
      durationMonths: 1,
      benefits: ["Gym"],
      memberAccountId: "acc-new-1",
      memberCode: "MB2610270001",
      memberFullName: "Lê Văn Mới",
      memberEmail: "levanmoi@example.com",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(paidReceipt, 200))
      .mockResolvedValueOnce(
        json(
          {
            items: [paidReceipt],
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1,
          },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const paidOrder = await membershipApi.payInvoice("101", "CASH", 500000);
    expect(paidOrder.invoice.status).toBe("PAID");
    expect(paidOrder.subscription.status).toBe("CONFIRMED");
    // Tên trường phải khớp PayMembershipInvoiceAPIViewModel, nếu không API chặn
    // ngay ở model binding với "The Amount field is required.".
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      paymentMethod: "CASH",
      amount: 500000,
      confirmReceivedCash: true,
    });

    const paged = await membershipApi.searchInvoices({
      status: "PAID",
      paymentMethod: "CASH",
      search: "INV-20261027",
      page: 1,
      pageSize: 20,
    });
    expect(paged.items).toHaveLength(1);
    expect(paged.totalItems).toBe(1);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://api.test/api/MembershipInvoice/search?status=PAID&search=INV-20261027&paymentMethod=CASH&page=1&pageSize=20",
    );
  });

  it("UC36 – UC38: fetches revenue, member, and class reports from /api/reports", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          from: "2026-10-01",
          to: "2026-10-31",
          timeZoneId: "SE Asia Standard Time",
          groupBy: "DAY",
          paymentMethod: "CASH",
          currency: "VND",
          totalRevenue: 1500000,
          paidInvoiceCount: 2,
          items: [
            {
              period: "2026-10-27",
              paymentMethod: "CASH",
              revenue: 1500000,
              invoiceCount: 2,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          from: "2026-10-01",
          to: "2026-10-31",
          asOfDate: "2026-10-31",
          timeZoneId: "SE Asia Standard Time",
          totalMembers: 12,
          newMembers: 3,
          activeMembers: 8,
          expiredMembers: 2,
          suspendedMembers: 1,
          upcomingMembers: 0,
          pendingPaymentMembers: 1,
          membersWithoutSubscription: 0,
          inactiveAccounts: 0,
        }),
      )
      .mockResolvedValueOnce(
        json({
          from: "2026-10-01",
          to: "2026-10-31",
          timeZoneId: "SE Asia Standard Time",
          classId: null,
          sportId: 1,
          registrationStatus: "BOOKED",
          totalClasses: 2,
          totalSessions: 6,
          canceledSessions: 1,
          totalRegistrations: 25,
          uniqueMembers: 10,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          items: [],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const rev = await reportApi.getRevenueReport({
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "DAY",
      paymentMethod: "CASH",
    });
    expect(rev.totalRevenue).toBe(1500000);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://api.test/api/reports/revenue?from=2026-10-01&to=2026-10-31&groupBy=DAY&paymentMethod=CASH",
    );

    const mem = await reportApi.getMemberReport({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(mem.totalMembers).toBe(12);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://api.test/api/reports/members?from=2026-10-01&to=2026-10-31",
    );

    const cls = await reportApi.getClassReport({
      from: "2026-10-01",
      to: "2026-10-31",
      sportId: 1,
      registrationStatus: "BOOKED",
    });
    expect(cls.totalRegistrations).toBe(25);
    expect(fetchMock.mock.calls[2][0]).toBe(
      "http://api.test/api/reports/classes?from=2026-10-01&to=2026-10-31&sportId=1&registrationStatus=BOOKED",
    );
  });

  it("UC39: neutralizes CSV formula injection and includes UTF-8 BOM", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe("\"'=CMD|' /C calc'!A0\"");
    expect(escapeCsvCell("+SUM(A1:A2)")).toBe("\"'+SUM(A1:A2)\"");
    expect(escapeCsvCell("-1000")).toBe("\"'-1000\"");
    expect(escapeCsvCell("@evil")).toBe("\"'@evil\"");
    expect(escapeCsvCell("Nguyễn Văn A")).toBe("\"Nguyễn Văn A\"");

    const csv = buildCsvContent(
      ["Mã hóa đơn", "Hội viên"],
      [["INV-001", "=HYPERLINK(\"http://evil\")"]],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil\"\")\"");
  });

  it("exposes /invoices for member, receptionist, and manager", () => {
    const managerPaths = navigationFor("CENTER_MANAGER").flatMap((s) =>
      s.items.map((i) => i.to),
    );
    const receptionistPaths = navigationFor("RECEPTIONIST").flatMap((s) =>
      s.items.map((i) => i.to),
    );
    const memberPaths = navigationFor("MEMBER").flatMap((s) =>
      s.items.map((i) => i.to),
    );
    const coachPaths = navigationFor("COACH").flatMap((s) =>
      s.items.map((i) => i.to),
    );

    expect(managerPaths).toContain("/invoices");
    expect(receptionistPaths).toContain("/invoices");
    expect(memberPaths).toContain("/invoices");
    expect(coachPaths).not.toContain("/invoices");
  });
});
