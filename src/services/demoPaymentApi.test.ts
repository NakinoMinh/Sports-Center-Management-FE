import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoPaymentApi } from "./demoPaymentApi";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  vi.stubGlobal("localStorage", { getItem: () => null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("demo payment API", () => {
  it("gets simulation availability from the server", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ enabled: false }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", mock);
    expect(await demoPaymentApi.configuration()).toEqual({ enabled: false });
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/demo/config");
  });
  it("sends explicit simulation confirmation without a client amount or bank OTP", async () => {
    const status = { invoiceId: 7, status: "PAID", amount: 500000, paymentMethod: "BANK_TRANSFER", isDemo: true };
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(status), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", mock);
    expect(await demoPaymentApi.confirm("7")).toEqual(status);
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/demo/7/confirm");
    expect(mock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ confirmSimulation: true });
  });
  it("rejects malformed invoice IDs before sending a request", async () => {
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    await expect(demoPaymentApi.confirm("../7")).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
