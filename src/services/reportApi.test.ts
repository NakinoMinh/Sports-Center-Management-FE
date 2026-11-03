import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiClient";
import { describeError } from "./apiErrors";
import { accessRules } from "./accessControl";
import { reportApi } from "./reportApi";
import type { ClassReport, MemberReport, RevenueReport } from "../types/reports";

const MEMBER_REPORT: MemberReport = {
  from: null, to: "2026-11-03", asOfDate: "2026-11-03", timeZoneId: "SE Asia Standard Time",
  totalMembers: 100, newMembers: 7, activeMembers: 65, expiredMembers: 10,
  suspendedMembers: 5, upcomingMembers: 6, pendingPaymentMembers: 9,
  membersWithoutSubscription: 5, inactiveAccounts: 4,
};

const CLASS_REPORT: ClassReport = {
  from: "2026-11-01", to: "2026-11-03", timeZoneId: "SE Asia Standard Time",
  classId: null, sportId: 2, registrationStatus: "ALL", totalClasses: 21,
  totalSessions: 50, canceledSessions: 3, totalRegistrations: 200, uniqueMembers: 70,
  page: 2, pageSize: 20, totalPages: 2,
  items: [{ classId: 21, className: "Yoga tối", sportId: 2, sportName: "Yoga", sessionCount: 2, canceledSessionCount: 1, registrationCount: 8, uniqueMemberCount: 5 }],
};

function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: () => {} });
  vi.stubGlobal("localStorage", { getItem: () => null, removeItem: () => {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Tam UC36–UC38 API contract", () => {
  it.each([
    [{ from: "2020-01-01" }, "from=2020-01-01"],
    [{ to: "2026-11-03" }, "to=2026-11-03"],
    [{}, ""],
  ])("sends each optional member date independently: %j", async (params, expected) => {
    const fetchMock = mockResponse(MEMBER_REPORT);
    expect(await reportApi.getMemberReport(params)).toEqual(MEMBER_REPORT);
    expect(fetchMock.mock.calls[0][0]).toBe(`http://api.test/api/reports/members${expected ? `?${expected}` : ""}`);
  });

  it("preserves server revenue, paid counts and zero buckets without recomputing package prices", async () => {
    const report: RevenueReport = {
      from: "2026-01-01", to: "2026-02-28", timeZoneId: "SE Asia Standard Time",
      groupBy: "MONTH", paymentMethod: "CASH", currency: "VND", totalRevenue: 175000, paidInvoiceCount: 1,
      items: [
        { period: "2026-01", paymentMethod: "CASH", revenue: 175000, invoiceCount: 1 },
        { period: "2026-02", paymentMethod: "CASH", revenue: 0, invoiceCount: 0 },
      ],
    };
    const fetchMock = mockResponse(report);
    expect(await reportApi.getRevenueReport({ from: report.from!, to: report.to!, groupBy: "MONTH", paymentMethod: "CASH" })).toEqual(report);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/reports/revenue?from=2026-01-01&to=2026-02-28&groupBy=MONTH&paymentMethod=CASH");
  });

  it.each(["BOOKED", "CANCELED", "ALL"] as const)("sends class paging and %s status while keeping global totals", async registrationStatus => {
    const fetchMock = mockResponse({ ...CLASS_REPORT, registrationStatus });
    const result = await reportApi.getClassReport({ from: "2026-11-01", to: "2026-11-03", classId: 21, sportId: 2, registrationStatus, page: 2, pageSize: 20 });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams).toEqual(new URLSearchParams({ from: "2026-11-01", to: "2026-11-03", classId: "21", sportId: "2", registrationStatus, page: "2", pageSize: "20" }));
    expect(result).toEqual({ ...CLASS_REPORT, registrationStatus });
    expect(result.totalClasses).toBe(21);
    expect(result.items).toHaveLength(1);
    expect(result.uniqueMembers).toBe(70);
  });

  it("propagates access denial instead of returning fabricated zero totals", async () => {
    expect(accessRules.reports).toEqual(["CENTER_MANAGER"]);
    mockResponse({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    await expect(reportApi.getRevenueReport({})).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("does not claim a 366-day member cap when describing a server date error", () => {
    const message = describeError(new ApiError("Invalid date range", 400, "INVALID_REPORT_DATE_RANGE"));
    expect(message).not.toContain("366");
    expect(message).toContain("Kiểm tra");
  });
});
