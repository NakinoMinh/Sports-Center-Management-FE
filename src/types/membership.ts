import type { User } from "./auth";

export type MembershipActor = Omit<User, "passwordHash">;
export type MembershipDuration = 1 | 3 | 12;
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";
export type MembershipOrderKind =
  "REGISTER" | "RENEW" | "UPGRADE" | "DOWNGRADE";
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
  /** Prorated unused value, rounded once to whole VND. Absent on legacy invoices. */
  creditAmount?: number;
  remainingDays?: number;
  previousPeriodDays?: number;
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

export type CounterMemberRegistrationInput = Omit<
  CounterRegistrationInput,
  "username" | "password"
> & { dateOfBirth: string };

export interface MemberPage {
  items: MembershipActor[];
  total: number;
  page: number;
  pages: number;
}

export type PublicMembershipPackage = Pick<
  MembershipPackage,
  "id" | "name" | "price" | "durationMonths" | "benefits"
>;

export type MembershipStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "SUSPENDED"
  | "UPCOMING"
  | "PENDING_PAYMENT"
  | "NONE";

export interface MembershipStatusSubscription {
  id: string;
  packageName: string;
  startDate: string;
  endDate: string;
  suspensionReason?: string;
}

export interface MembershipStatusRow {
  member: Pick<
    MembershipActor,
    "id" | "username" | "fullName" | "email" | "phone"
  >;
  status: Exclude<MembershipStatusFilter, "ALL" | "EXPIRING">;
  remainingDays: number;
  expiringSoon: boolean;
  subscription?: MembershipStatusSubscription;
  upcoming?: MembershipStatusSubscription;
}

export interface CounterRegistrationResult {
  member: MembershipActor;
  order: MembershipOrder;
  initialPassword: string;
  emailDelivery: "SENT" | "FAILED" | "NOT_CONFIGURED";
}
