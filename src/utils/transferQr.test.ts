import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { transferQrLink } from "./transferQr";

describe("transfer QR link", () => {
  it("keeps invoice payment capability only in the URL fragment", () => {
    const token = randomBytes(32).toString("hex");
    const url = new URL(transferQrLink("https://payment.example/path?old=value", token));
    expect(url.origin).toBe("https://payment.example");
    expect(url.pathname).toBe("/payments/transfer/confirm");
    expect(url.search).toBe("");
    expect(new URLSearchParams(url.hash.slice(1)).get("token")).toBe(token);
  });
  it("supports a local network address for phone access", () => {
    expect(new URL(transferQrLink("http://192.168.1.20:5173", randomBytes(32).toString("hex"))).host).toBe("192.168.1.20:5173");
  });
  it.each(["javascript:alert(1)", "https://user:pass@example.com", "file:///tmp/payment"])("rejects unsafe origin %s", (origin) => {
    expect(() => transferQrLink(origin, randomBytes(32).toString("hex"))).toThrow();
  });
  it("rejects missing or malformed capabilities", () => {
    expect(() => transferQrLink("https://payment.example", "")).toThrow();
    expect(() => transferQrLink("https://payment.example", "../invoice/1")).toThrow();
  });
});
