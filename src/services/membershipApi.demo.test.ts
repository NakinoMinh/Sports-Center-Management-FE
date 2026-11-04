import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { membershipApi } from "./membershipApi";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  vi.stubGlobal("localStorage", { getItem: () => null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each([true, false, undefined])("preserves the persisted demo label in receipts and invoice lists: %s", async (isDemo) => {
  const receipt = {
    invoiceId: 7, invoiceNumber: "DEMO-7", amount: 500000, paymentMethod: "BANK_TRANSFER",
    invoiceStatus: "PAID", subscriptionId: 7, subscriptionStatus: "CONFIRMED", kind: "REGISTER",
    packageId: 1, packageName: "Monthly", packagePrice: 500000, durationMonths: 1, benefits: [],
    memberAccountId: "demo-member", memberCode: "DEMO001", memberEmail: "demo@example.test",
    startDate: "2026-11-04", endDate: "2026-12-03", createdAt: "2026-11-04T00:00:00Z", isDemo,
  };
  const mock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(receipt), { headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify([receipt]), { headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [receipt], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", mock);
  expect((await membershipApi.getReceipt("7")).invoice.isDemo).toBe(isDemo ?? false);
  expect((await membershipApi.listInvoices())[0].isDemo).toBe(isDemo ?? false);
  expect((await membershipApi.searchInvoices()).items[0].isDemo).toBe(isDemo ?? false);
});
