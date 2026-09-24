import type { User } from "./auth";

export type MembershipActor = Omit<User, "passwordHash">;
export type MembershipDuration = 1 | 3 | 12;
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";
export type MembershipOrderKind = "REGISTER" | "RENEW";
export type SubscriptionDisplayStatus =
  "ACTIVE" | "UPCOMING" | "EXPIRED" | "PENDING";

export interface MembershipPackageInput {
  name: string;
  price: number;
  durationMonths: MembershipDuration;
  benefits: string[];
}

export interface MembershipPackage extends MembershipPackageInput {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipOrderInput {
  memberId: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  kind: MembershipOrderKind;
}

/** All dates use YYYY-MM-DD; startDate and endDate are both inclusive. */
export interface MembershipQuote extends MembershipOrderInput {
  memberName: string;
  memberEmail: string;
  packageName: string;
  durationMonths: MembershipDuration;
  benefits: string[];
  amount: number;
  startDate: string;
  endDate: string;
}

/** PENDING reserves a proposed period only; it does not grant access. */
export interface MemberSubscription {
  id: string;
  memberId: string;
  packageId: string;
  packageName: string;
  durationMonths: MembershipDuration;
  benefits: string[];
  amount: number;
  startDate: string;
  endDate: string;
  kind: MembershipOrderKind;
  status: "CONFIRMED" | "PENDING";
  invoiceId: string;
  createdAt: string;
}

/** Package, member and price snapshots must not change when the catalog changes. */
export interface MembershipInvoice extends MembershipQuote {
  id: string;
  number: string;
  subscriptionId: string;
  status: "PAID" | "PENDING";
  createdAt: string;
  createdBy: string;
}

export interface MembershipOrder {
  subscription: MemberSubscription;
  invoice: MembershipInvoice;
}
