import type { User } from "./auth";

export type MembershipActor = Omit<User, "passwordHash">;
export type MembershipDuration = 1 | 3 | 6 | 12 | 24;
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";
export type MembershipOrderKind =
  "REGISTER" | "RENEW" | "UPGRADE" | "DOWNGRADE" | "CHANGE";
export type SubscriptionDisplayStatus =
  | "ACTIVE"
  | "SUSPENDED"
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
}

export interface MembershipPackage extends MembershipPackageInput {
  id: string;
  isActive: boolean;
  /** Number of distinct members that have ever subscribed to this package. */
  subscriberCount?: number;
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
  packagePrice: number;
  previousSubscriptionId?: string;
  previousPackagePrice?: number;
}

export interface MembershipTermsSection {
  id: string;
  title: string;
  body: string;
}

export interface MembershipTermsAcknowledgement {
  id: string;
  label: string;
}

export interface CurrentMembershipTerms {
  version: string;
  title: string;
  effectiveFrom: string;
  contentHash: string;
  sections: MembershipTermsSection[];
  requiredAcknowledgements: MembershipTermsAcknowledgement[];
  accepted: boolean;
  acceptedAtUtc?: string;
}

export interface MemberTermsStatus {
  memberId: string;
  currentVersion: string;
  accepted: boolean;
  acceptedVersion?: string;
  acceptedAtUtc?: string;
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
  packagePrice: number;
  previousSubscriptionId?: string;
  replacedOn?: string;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELED";
  /** Access suspension does not change paid dates or invoice status. */
  isSuspended?: boolean;
  suspensionReason?: string;
  invoiceId: string;
  createdAt: string;
}

/** Package, member and price snapshots must not change when the catalog changes. */
export interface MembershipInvoice extends MembershipQuote {
  isDemo?: boolean;
  id: string;
  number: string;
  subscriptionId: string;
  status: "PAID" | "PENDING_PAYMENT" | "CANCELED";
  isSuspended?: boolean;
  suspensionReason?: string;
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
  dateOfBirth?: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  expectedPrice: number;
}

/**
 * Totals across every invoice matching the current filters, computed by the
 * API. The counter screens present these as centre-wide figures, so they must
 * not be derived from the page that happens to be on screen.
 */
export type InvoiceSummary = {
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  pendingAmount: number;
  canceledCount: number;
  canceledAmount: number;
};
