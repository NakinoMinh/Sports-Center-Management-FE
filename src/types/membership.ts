import type { User } from "./auth";

export type MembershipActor = Omit<User, "passwordHash">;
export type MembershipDuration = 1 | 3 | 12;
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";
export type MembershipTier = "BASIC" | "PREMIUM";
export type MembershipOrderKind =
  "REGISTER" | "RENEW" | "UPGRADE" | "DOWNGRADE";
export type SubscriptionDisplayStatus =
  | "ACTIVE"
  | "UPCOMING"
  | "EXPIRED"
  | "PENDING_PAYMENT"
  | "SCHEDULED_DOWNGRADE"
  | "REPLACED"
  | "CANCELED";

export interface MembershipPackageInput {
  name: string;
  price: number;
  durationMonths: MembershipDuration;
  benefits: string[];
  tier?: MembershipTier;
}

export interface MembershipPackage extends MembershipPackageInput {
  tier: MembershipTier;
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
  tier: MembershipTier;
  packagePrice: number;
  previousSubscriptionId?: string;
  previousPackagePrice?: number;
}

/** PENDING_PAYMENT does not grant access. CONFIRMED is paid; dates determine ACTIVE/scheduled/expired. */
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
  tier: MembershipTier;
  packagePrice: number;
  previousSubscriptionId?: string;
  replacedOn?: string;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELED";
  invoiceId: string;
  createdAt: string;
}

/** Package, member and price snapshots must not change when the catalog changes. */
export interface MembershipInvoice extends MembershipQuote {
  id: string;
  number: string;
  subscriptionId: string;
  status: "PAID" | "PENDING_PAYMENT" | "CANCELED";
  createdAt: string;
  createdBy: string;
  paidAt?: string;
  paidBy?: string;
  paidByName?: string;
  canceledAt?: string;
  canceledBy?: string;
}

export interface MembershipOrder {
  subscription: MemberSubscription;
  invoice: MembershipInvoice;
}

export interface CounterRegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  expectedPrice: number;
}
