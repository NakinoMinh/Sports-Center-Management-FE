import { describe, expect, it } from "vitest";
import type { MemberSubscription, MembershipActor, MembershipPackage } from "../types/membership";
import { buildMembershipQuote, resolveOrderKind } from "./membershipService";

const member: MembershipActor = {
  id: "member-1", username: "MEM001", fullName: "Nguyễn An", email: "an@example.com",
  role: "MEMBER", isActive: true, createdAt: "2026-01-01T00:00:00Z", failedAttempts: 0, isLocked: false,
};
const pkg = (id: string, price: number, durationMonths: 1 | 3 = 1): MembershipPackage => ({
  id, name: `Gói ${id}`, price, durationMonths, benefits: ["Gym"], isActive: true,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});
const sub = (packageId: string, packagePrice: number, endDate = "2026-11-30"): MemberSubscription => ({
  id: "sub-1", memberId: member.id, packageId, packageName: `Gói ${packageId}`,
  packagePrice, durationMonths: 1, benefits: ["Gym"], amount: packagePrice,
  startDate: "2026-11-01", endDate, kind: "REGISTER", status: "CONFIRMED",
  invoiceId: "inv-1", createdAt: "2026-10-01T00:00:00Z",
});

describe("scheduled membership quotes", () => {
  it.each([
    ["same package", pkg("1", 500_000), "RENEW"],
    ["higher price", pkg("2", 900_000), "UPGRADE"],
    ["lower price", pkg("2", 300_000), "DOWNGRADE"],
    ["same-price different package", pkg("2", 500_000), "CHANGE"],
  ] as const)("resolves %s after the latest confirmed end", (_name, next, kind) => {
    const subscriptions = [sub("1", 500_000)];
    expect(resolveOrderKind(subscriptions, next, "2026-11-12")).toBe(kind);
    const quote = buildMembershipQuote(member, subscriptions, next, "CARD", "2026-11-12");
    expect(quote.kind).toBe(kind);
    expect(quote.startDate).toBe("2026-12-01");
    expect(quote.amount).toBe(next.price);
    expect(quote).not.toHaveProperty("creditAmount");
    expect(quote).not.toHaveProperty("remainingDays");
  });

  it("treats expired same package as renewal and expired different package as register", () => {
    const expired = [sub("1", 500_000, "2026-11-11")];
    expect(resolveOrderKind(expired, pkg("1", 500_000), "2026-11-12")).toBe("RENEW");
    expect(resolveOrderKind(expired, pkg("2", 900_000), "2026-11-12")).toBe("REGISTER");
  });

  it("uses calendar dates and inclusive end dates", () => {
    const quote = buildMembershipQuote(member, [], pkg("1", 500_000), "CARD", "2027-01-31");
    expect(quote.startDate).toBe("2027-01-31");
    expect(quote.endDate).toBe("2027-02-27");
  });
});
