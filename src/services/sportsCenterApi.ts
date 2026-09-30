import type { MemberInput } from "./memberService";
import type {
  CounterMemberRegistrationInput,
  CounterRegistrationResult,
  MemberPage,
  MemberSubscription,
  MembershipActor,
  MembershipDuration,
  MembershipOrder,
  MembershipOrderKind,
  MembershipStatusFilter,
  MembershipStatusRow,
  MembershipStatusSubscription,
  PaymentMethod,
  PublicMembershipPackage,
} from "../types/membership";
import { apiConfigured, apiRequest, getApiSession } from "./apiClient";
import { authService } from "./authService";
import { memberService } from "./memberService";
import {
  getMembershipStatusSummary,
  membershipService,
} from "./membershipService";

interface ApiMember {
  accountId: string;
  memberCode: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  status: string;
  dateOfBirth: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

interface ApiMemberPage {
  items: ApiMember[];
  page: number;
  totalItems: number;
  totalPages: number;
}

interface ApiPublicMembershipPackage {
  id: number;
  name: string;
  price: number;
  durationMonths: MembershipDuration;
  benefits: string[];
}

interface ApiMembershipReceipt {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  invoiceStatus: "PAID" | "PENDING_PAYMENT" | "CANCELED";
  createdAt: string;
  paidAt?: string | null;
  paidByStaffId?: string | null;
  paidByStaffName?: string | null;
  subscriptionId: number;
  subscriptionStatus: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELED";
  kind: MembershipOrderKind;
  startDate: string;
  endDate: string;
  packageId: number;
  packageName: string;
  packagePrice: number;
  durationMonths: MembershipDuration;
  benefits: string[];
  memberAccountId: string;
  memberCode: string;
  memberFullName: string | null;
  memberEmail: string;
}

interface ApiCounterRegistrationResult {
  member: ApiMember;
  receipt: ApiMembershipReceipt;
  initialPassword: string;
  emailDelivery: CounterRegistrationResult["emailDelivery"];
}

interface ApiMembershipStatusRow {
  accountId: string;
  memberCode: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  status: MembershipStatusRow["status"];
  remainingDays: number;
  expiringSoon: boolean;
  subscriptionId: number | null;
  packageName: string | null;
  startDate: string | null;
  endDate: string | null;
  suspensionReason: string | null;
  upcomingSubscriptionId: number | null;
  upcomingPackageName: string | null;
  upcomingStartDate: string | null;
  upcomingEndDate: string | null;
}

const mapMember = (member: ApiMember): MembershipActor => ({
  id: member.accountId,
  username: member.memberCode,
  email: member.email,
  role: "MEMBER",
  fullName: member.fullName ?? "",
  avatar: member.avatarUrl ?? undefined,
  createdAt: member.createdAt,
  failedAttempts: 0,
  isLocked: false,
  phone: member.phone ?? undefined,
  dateOfBirth: member.dateOfBirth ?? undefined,
  isActive: member.status.toUpperCase() === "ACTIVE",
});

const requireMockActor = (): MembershipActor => {
  const actor = authService.getCurrentUser();
  if (!actor) throw new Error("Sign in to continue.");
  return actor;
};

const mapStatusSubscription = (
  id: number | null,
  packageName: string | null,
  startDate: string | null,
  endDate: string | null,
  suspensionReason?: string | null,
): MembershipStatusSubscription | undefined =>
  id !== null && packageName && startDate && endDate
    ? {
        id: String(id),
        packageName,
        startDate,
        endDate,
        suspensionReason: suspensionReason ?? undefined,
      }
    : undefined;

const mapApiStatusRow = (row: ApiMembershipStatusRow): MembershipStatusRow => {
  const subscription = mapStatusSubscription(
    row.subscriptionId,
    row.packageName,
    row.startDate,
    row.endDate,
    row.suspensionReason,
  );
  const upcoming = mapStatusSubscription(
    row.upcomingSubscriptionId,
    row.upcomingPackageName,
    row.upcomingStartDate,
    row.upcomingEndDate,
  );
  return {
    member: {
      id: row.accountId,
      username: row.memberCode,
      fullName: row.fullName ?? "",
      email: row.email,
      phone: row.phone ?? undefined,
    },
    status: row.status,
    remainingDays: row.remainingDays,
    expiringSoon: row.expiringSoon,
    subscription,
    upcoming: row.status === "UPCOMING" ? subscription : upcoming,
  };
};

const mapMockStatus = (status: string): MembershipStatusRow["status"] => {
  if (status === "SCHEDULED_DOWNGRADE") return "UPCOMING";
  if (
    status === "ACTIVE" ||
    status === "EXPIRED" ||
    status === "SUSPENDED" ||
    status === "UPCOMING" ||
    status === "PENDING_PAYMENT"
  ) {
    return status;
  }
  return "NONE";
};

const mapMockStatusSubscription = (
  subscription: MemberSubscription | undefined,
): MembershipStatusSubscription | undefined =>
  subscription
    ? {
        id: subscription.id,
        packageName: subscription.packageName,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        suspensionReason: subscription.suspensionReason,
      }
    : undefined;

const mapReceipt = (
  receipt: ApiMembershipReceipt,
  createdBy: string,
): MembershipOrder => ({
  subscription: {
    id: String(receipt.subscriptionId),
    memberId: receipt.memberAccountId,
    packageId: String(receipt.packageId),
    packageName: receipt.packageName,
    durationMonths: receipt.durationMonths,
    benefits: [...receipt.benefits],
    amount: receipt.amount,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    kind: receipt.kind,
    packagePrice: receipt.packagePrice,
    status: receipt.subscriptionStatus,
    invoiceId: String(receipt.invoiceId),
    createdAt: receipt.createdAt,
  },
  invoice: {
    id: String(receipt.invoiceId),
    number: receipt.invoiceNumber,
    subscriptionId: String(receipt.subscriptionId),
    memberId: receipt.memberAccountId,
    memberName: receipt.memberFullName ?? receipt.memberCode,
    memberEmail: receipt.memberEmail,
    packageId: String(receipt.packageId),
    packageName: receipt.packageName,
    durationMonths: receipt.durationMonths,
    benefits: [...receipt.benefits],
    amount: receipt.amount,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    packagePrice: receipt.packagePrice,
    paymentMethod: receipt.paymentMethod,
    kind: receipt.kind,
    status: receipt.invoiceStatus,
    createdAt: receipt.createdAt,
    createdBy,
    paidAt: receipt.paidAt ?? undefined,
    paidBy: receipt.paidByStaffId ?? undefined,
    paidByName: receipt.paidByStaffName ?? undefined,
  },
});

export const sportsCenterApi = {
  async listMembers(
    query: string,
    status: "ALL" | "ACTIVE" | "INACTIVE",
    page: number,
  ): Promise<MemberPage> {
    if (!apiConfigured()) {
      return memberService.list(requireMockActor(), query, status, page);
    }
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (query.trim()) params.set("search", query.trim());
    if (status !== "ALL") {
      params.set("status", status === "ACTIVE" ? "Active" : "Inactive");
    }
    const result = await apiRequest<ApiMemberPage>(`/api/Member?${params}`);
    return {
      items: result.items.map(mapMember),
      total: result.totalItems,
      page: result.page,
      pages: Math.max(1, result.totalPages),
    };
  },

  async createMember(
    input: MemberInput,
  ): Promise<{ member: MembershipActor; initialPassword: string }> {
    if (!apiConfigured()) {
      return memberService.create(requireMockActor(), input);
    }
    const result = await apiRequest<{
      member: ApiMember;
      initialPassword: string;
    }>("/api/Member", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return {
      member: mapMember(result.member),
      initialPassword: result.initialPassword,
    };
  },

  async updateMember(
    id: string,
    input: MemberInput,
  ): Promise<MembershipActor> {
    if (!apiConfigured()) {
      return memberService.update(requireMockActor(), id, input);
    }
    const result = await apiRequest<ApiMember>(
      `/api/Member/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return mapMember(result);
  },

  async deleteMember(id: string): Promise<void> {
    if (!apiConfigured()) {
      memberService.remove(requireMockActor(), id);
      return;
    }
    await apiRequest<void>(`/api/Member/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async listActivePackages(): Promise<PublicMembershipPackage[]> {
    if (!apiConfigured()) return membershipService.listPublicPackages();
    const packages = await apiRequest<ApiPublicMembershipPackage[]>(
      "/api/MembershipPackage/active",
      { token: null },
    );
    return packages.map((item) => ({ ...item, id: String(item.id) }));
  },

  async registerMemberAtCounter(
    input: CounterMemberRegistrationInput,
  ): Promise<CounterRegistrationResult> {
    if (!apiConfigured()) {
      const result = await membershipService.registerMemberWithGeneratedCredentials(
        requireMockActor(),
        input,
      );
      return { ...result, emailDelivery: "NOT_CONFIGURED" };
    }
    const packageId = Number(input.packageId);
    if (!Number.isInteger(packageId) || packageId < 1) {
      throw new Error("Invalid package.");
    }
    const createdBy = getApiSession()?.user.id;
    if (!createdBy) throw new Error("Invalid sign-in session.");
    const result = await apiRequest<ApiCounterRegistrationResult>(
      "/api/Member/counter-registration",
      {
        method: "POST",
        body: JSON.stringify({ ...input, packageId }),
      },
    );
    return {
      member: mapMember(result.member),
      order: mapReceipt(result.receipt, createdBy),
      initialPassword: result.initialPassword,
      emailDelivery: result.emailDelivery,
    };
  },

  async listMembershipStatuses(
    search = "",
    filter: MembershipStatusFilter = "ALL",
  ): Promise<MembershipStatusRow[]> {
    if (apiConfigured()) {
      const params = new URLSearchParams({ filter });
      if (search.trim()) params.set("search", search.trim());
      const rows = await apiRequest<ApiMembershipStatusRow[]>(
        `/api/Member/membership-status?${params}`,
      );
      return rows.map(mapApiStatusRow);
    }

    const actor = requireMockActor();
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    return membershipService
      .listMembers(actor)
      .filter((member) =>
        `${member.username} ${member.fullName} ${member.email} ${member.phone ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(normalizedSearch),
      )
      .map((member): MembershipStatusRow => {
        const summary = getMembershipStatusSummary(
          membershipService.getMemberSubscriptions(actor, member.id),
        );
        const status = mapMockStatus(summary.status);
        const subscription = mapMockStatusSubscription(summary.subscription);
        return {
          member: {
            id: member.id,
            username: member.username,
            fullName: member.fullName,
            email: member.email,
            phone: member.phone,
          },
          status,
          remainingDays: summary.remainingDays,
          expiringSoon: summary.expiringSoon,
          subscription,
          upcoming:
            status === "UPCOMING"
              ? subscription
              : mapMockStatusSubscription(summary.upcoming),
        };
      })
      .filter(
        (row) =>
          filter === "ALL" ||
          (filter === "EXPIRING" ? row.expiringSoon : row.status === filter),
      );
  },
};
