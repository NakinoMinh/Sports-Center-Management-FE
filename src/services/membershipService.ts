import type {
  MemberSubscription,
  MembershipPackage,
  SubscriptionDisplayStatus,
  MembershipOrderKind,
} from "../types/membership";

export const MEMBERSHIP_STORAGE_KEY = "scms_memberships_v1";

export type PublicMembershipPackage = Pick<
  MembershipPackage,
  "id" | "name" | "price" | "durationMonths" | "benefits"
>;

export function todayDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ngày không hợp lệ.");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Ngày không hợp lệ.");
  }
  return parsed;
}

export function addDateDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Clamp January 31 + one month to February 28 (or February 29 in leap years). */
export function addMonthsClamped(date: string, months: number): string {
  const parsed = parseDate(date);
  const day = parsed.getUTCDate();
  parsed.setUTCDate(1);
  parsed.setUTCMonth(parsed.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0),
  ).getUTCDate();
  parsed.setUTCDate(Math.min(day, lastDay));
  return parsed.toISOString().slice(0, 10);
}

export function getSubscriptionStatus(
  subscription: MemberSubscription,
  today = todayDate(),
): SubscriptionDisplayStatus {
  if (subscription.status === "CANCELED") return "CANCELED";
  if (subscription.status === "PENDING_PAYMENT") return "PENDING_PAYMENT";
  if (subscription.replacedOn && subscription.replacedOn <= today)
    return "REPLACED";
  if (subscription.startDate > today)
    return subscription.kind === "DOWNGRADE"
      ? "SCHEDULED_DOWNGRADE"
      : "UPCOMING";
  if (subscription.endDate < today) return "EXPIRED";
  if (subscription.isSuspended) return "SUSPENDED";
  return "ACTIVE";
}

/** Calendar days including today and the last usable day; unpaid/future periods grant no days yet. */
export function getMembershipStatusSummary(
  subscriptions: MemberSubscription[],
  today = todayDate(),
) {
  const relevant = subscriptions.filter((sub) =>
    ["ACTIVE", "SUSPENDED", "EXPIRED", "UPCOMING", "SCHEDULED_DOWNGRADE"].includes(getSubscriptionStatus(sub, today)),
  );
  const current = relevant.filter((sub) => sub.startDate <= today && sub.endDate >= today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const upcoming = relevant.filter((sub) => sub.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const expired = relevant.filter((sub) => sub.endDate < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const subscription = current ?? upcoming ?? expired;
  const pending = subscriptions.find((sub) => sub.status === "PENDING_PAYMENT");
  const status = subscription ? getSubscriptionStatus(subscription, today)
    : pending ? "PENDING_PAYMENT" : "NONE";
  const remainingDays = current
    ? Math.max(0, Math.round((parseDate(current.endDate).getTime() - parseDate(today).getTime()) / 86400000) + 1)
    : 0;
  return { subscription: subscription ?? pending, status, remainingDays,
    expiringSoon: !!current && remainingDays > 0 && remainingDays < 7, upcoming };
}

export const orderKindLabels: Record<MembershipOrderKind, string> = {
  REGISTER: "Đăng ký mới",
  RENEW: "Gia hạn",
  UPGRADE: "Nâng gói",
  DOWNGRADE: "Hạ gói theo lịch",
  CHANGE: "Đổi gói theo lịch",
};

/** Resolve the action from entitlements, never from the button or a caller-provided kind. */
export function resolveOrderKind(
  subscriptions: MemberSubscription[],
  pkg: MembershipPackage,
  today = todayDate(),
): MembershipOrderKind {
  const confirmed = subscriptions.filter(
    (s) => s.status === "CONFIRMED" && !s.replacedOn,
  );
  const reference = [...confirmed].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (!reference) return "REGISTER";
  const samePackage = reference.packageId === pkg.id;
  if (reference.endDate < today) return samePackage ? "RENEW" : "REGISTER";
  if (samePackage) return "RENEW";
  if (pkg.price < reference.packagePrice) return "DOWNGRADE";
  if (pkg.price > reference.packagePrice) return "UPGRADE";
  return "CHANGE";
}

export function buildMembershipQuote(
  member: import("../types/membership").MembershipActor,
  subscriptions: MemberSubscription[],
  pkg: MembershipPackage,
  paymentMethod: import("../types/membership").PaymentMethod,
  today = todayDate(),
): import("../types/membership").MembershipQuote {
  const latest = subscriptions
    .filter((item) => item.status === "CONFIRMED" && !item.replacedOn)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const startDate = latest && latest.endDate >= today
    ? addDateDays(latest.endDate, 1)
    : today;
  return {
    memberId: member.id,
    memberName: member.fullName,
    memberEmail: member.email,
    packageId: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.price,
    durationMonths: pkg.durationMonths,
    benefits: pkg.benefits,
    paymentMethod,
    kind: resolveOrderKind(subscriptions, pkg, today),
    amount: pkg.price,
    startDate,
    endDate: addDateDays(addMonthsClamped(startDate, pkg.durationMonths), -1),
    previousSubscriptionId: latest?.id,
    previousPackagePrice: latest?.packagePrice,
  };
}
