import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vnpayApi } from "./vnpayApi";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  vi.stubGlobal("localStorage", { getItem: () => null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function respond(body: unknown) {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("VNPAY checkout", () => {
  it("asks BE for server-priced checkout without client amount", async () => {
    const url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test";
    const mock = respond({ invoiceId: 4, paymentUrl: url, isTestMode: true });
    expect(await vnpayApi.checkout("4")).toBe(url);
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/vnpay-sandbox/4/checkout");
    expect(mock.mock.calls[0][1].method).toBe("POST");
    expect(mock.mock.calls[0][1].body).toBeUndefined();
  });
  it.each(["https://evil.example/payment", "https://sandbox.vnpayment.vn.evil.example/payment", "https://pay.vnpay.vn/paymentv2/vpcpay.html"])("rejects unexpected redirect %s", async (url) => {
    respond({ paymentUrl: url, isTestMode: true });
    await expect(vnpayApi.checkout("4")).rejects.toThrow("không hợp lệ");
  });
  it("reads status from BE instead of browser success parameters", async () => {
    const body = { invoiceId: 4, status: "PENDING_PAYMENT", amount: 500000, paymentMethod: "BANK_TRANSFER" };
    const mock = respond(body);
    expect(await vnpayApi.status("4")).toEqual(body);
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/vnpay-sandbox/4/status");
  });
  it("rejects malformed invoice IDs before calling BE", async () => {
    const mock = respond({});
    await expect(vnpayApi.status("../1")).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
