import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoPaymentApi } from "./demoPaymentApi";
import { randomBytes } from "node:crypto";

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  vi.stubGlobal("localStorage", { getItem: () => null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("demo payment API", () => {
  it("creates a QR session without accepting a client amount", async () => {
    const session = { token: randomBytes(32).toString("hex"), recipientName: "TITAN ARENA" };
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(session), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", mock);
    expect(await demoPaymentApi.createQr("7")).toEqual(session);
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/demo/7/qr");
    expect(mock.mock.calls[0][1].body).toBeUndefined();
    await expect(demoPaymentApi.createQr("../7")).rejects.toThrow();
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("posts phone capability in the body and cannot override amount or invoice", async () => {
    const token = randomBytes(32).toString("hex");
    const mock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ status: "PAID" }), { headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("fetch", mock);
    await demoPaymentApi.qrStatus(token);
    await demoPaymentApi.confirmQr(token);
    expect(mock.mock.calls[0][0]).toBe("http://api.test/api/payments/demo/qr/status");
    expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ token });
    expect(mock.mock.calls[1][0]).toBe("http://api.test/api/payments/demo/qr/confirm");
    expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({ token, confirmSimulation: true });
  });
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
