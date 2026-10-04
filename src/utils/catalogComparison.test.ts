import { describe, expect, it } from "vitest";
import type {
  MemberSubscription,
  MembershipPackage,
} from "../types/membership";
import { buildCatalogComparisonPlans } from "./catalogComparison";

const currentSubscription: MemberSubscription = {
  id: "subscription-1",
  memberId: "member-1",
  packageId: "3",
  packageName: "Gói Năng Động 6 Tháng",
  durationMonths: 6,
  benefits: ["Gym", "Bể bơi"],
  amount: 2400000,
  startDate: "2026-09-04",
  endDate: "2027-03-04",
  kind: "REGISTER",
  packagePrice: 2400000,
  status: "CONFIRMED",
  invoiceId: "invoice-1",
  createdAt: "2026-09-04T00:00:00Z",
};

const selectedPackages: MembershipPackage[] = [
  {
    id: "3",
    name: "Gói Năng Động 6 Tháng",
    price: 2400000,
    durationMonths: 6,
    benefits: ["Gym", "Bể bơi"],
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "4",
    name: "Gói Toàn Diện 12 Tháng",
    price: 4200000,
    durationMonths: 12,
    benefits: ["Gym", "Yoga"],
    isActive: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

describe("catalog comparison plans", () => {
  it("pins the member's current package first and excludes its catalog duplicate", () => {
    const plans = buildCatalogComparisonPlans(
      currentSubscription,
      selectedPackages,
    );

    expect(plans.map((plan) => [plan.name, plan.isCurrent])).toEqual([
      ["Gói Năng Động 6 Tháng", true],
      ["Gói Toàn Diện 12 Tháng", false],
    ]);
  });
});
