import type {
  MembershipActor,
  MembershipInvoice,
  MembershipOrder,
  MembershipPackage,
  MembershipPackageInput,
  PaymentMethod,
} from "../types/membership";
import { apiRequest } from "./apiClient";

interface PackageDto {
  id: number;
  name: string;
  price: number;
  durationMonths: 1 | 3 | 12;
  benefits?: string[];
  subscriberCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

interface PagedPackagesDto {
  items: PackageDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface SubscriptionDto {
  invoiceId?: number;
  subscriptionId: number;
  invoiceNumber: string;
  packageId: number;
  packageName: string;
  packagePrice: number;
  durationMonths: 1 | 3 | 12;
  benefits: string[];
  startDate: string;
  endDate: string;
  kind: "REGISTER" | "RENEW";
  status: "PENDING_PAYMENT" | "CONFIRMED";
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

interface ReceiptDto {
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
  kind: "REGISTER" | "RENEW";
  startDate: string;
  endDate: string;
  packageId: number;
  packageName: string;
  packagePrice: number;
  durationMonths: 1 | 3 | 12;
  benefits: string[];
  memberAccountId: string;
  memberCode: string;
  memberFullName?: string;
  memberEmail: string;
  memberPhone?: string;
}

interface CounterMemberDto {
  accountId: string;
  memberCode: string;
  fullName?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
}

interface CounterRegistrationResponseDto {
  member: CounterMemberDto;
  receipt: ReceiptDto;
  initialPassword: string;
  emailDelivery: "SENT" | "FAILED" | "NOT_CONFIGURED";
}

export interface CounterMemberRegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  packageId: string;
  expectedPrice: number;
  paymentMethod: PaymentMethod;
}

const mapPackage = (item: PackageDto): MembershipPackage => ({
  id: String(item.id),
  name: item.name,
  price: item.price,
  durationMonths: item.durationMonths,
  benefits: Array.isArray(item.benefits) ? item.benefits : [],
  subscriberCount: item.subscriberCount ?? 0,
  isActive: item.isActive ?? true,
  createdAt: item.createdAt ?? new Date().toISOString(),
  updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
});

const orderFromSubscription = (
  data: SubscriptionDto,
  member: MembershipActor,
): MembershipOrder => {
  const invId = data.invoiceId ? String(data.invoiceId) : data.invoiceNumber;
  return {
    subscription: {
      id: String(data.subscriptionId),
      memberId: member.id,
      packageId: String(data.packageId),
      packageName: data.packageName,
      packagePrice: data.packagePrice,
      durationMonths: data.durationMonths,
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate,
      kind: data.kind,
      status: data.status,
      invoiceId: invId,
      createdAt: data.createdAt,
    },
    invoice: {
      id: invId,
      number: data.invoiceNumber,
      subscriptionId: String(data.subscriptionId),
      memberId: member.id,
      memberName: member.fullName,
      memberEmail: member.email,
      packageId: String(data.packageId),
      packageName: data.packageName,
      packagePrice: data.packagePrice,
      durationMonths: data.durationMonths,
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate,
      kind: data.kind,
      paymentMethod: data.paymentMethod,
      status: "PENDING_PAYMENT",
      createdAt: data.createdAt,
      createdBy: member.id,
    },
  };
};

const orderFromReceipt = (data: ReceiptDto): MembershipOrder => ({
  subscription: {
    id: String(data.subscriptionId),
    memberId: data.memberAccountId,
    packageId: String(data.packageId),
    packageName: data.packageName,
    packagePrice: data.packagePrice,
    durationMonths: data.durationMonths,
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    amount: data.amount,
    startDate: data.startDate,
    endDate: data.endDate,
    kind: data.kind,
    status: data.subscriptionStatus,
    invoiceId: String(data.invoiceId),
    createdAt: data.createdAt,
  },
  invoice: {
    id: String(data.invoiceId),
    number: data.invoiceNumber,
    subscriptionId: String(data.subscriptionId),
    memberId: data.memberAccountId,
    memberName: data.memberFullName ?? data.memberCode,
    memberEmail: data.memberEmail,
    packageId: String(data.packageId),
    packageName: data.packageName,
    packagePrice: data.packagePrice,
    durationMonths: data.durationMonths,
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    amount: data.amount,
    startDate: data.startDate,
    endDate: data.endDate,
    kind: data.kind,
    paymentMethod: data.paymentMethod,
    status: data.invoiceStatus,
    createdAt: data.createdAt,
    createdBy: data.memberAccountId,
    paidAt: data.paidAt ?? undefined,
    paidBy: data.paidByStaffId ?? undefined,
    paidByName: data.paidByStaffName ?? undefined,
  },
});

export const subscriptionFromInvoice = (
  invoice: MembershipInvoice,
): MembershipOrder["subscription"] => ({
  id: invoice.subscriptionId,
  memberId: invoice.memberId,
  packageId: invoice.packageId,
  packageName: invoice.packageName,
  packagePrice: invoice.packagePrice,
  durationMonths: invoice.durationMonths,
  benefits: invoice.benefits,
  amount: invoice.amount,
  startDate: invoice.startDate,
  endDate: invoice.endDate,
  kind: invoice.kind,
  status:
    invoice.status === "PAID"
      ? "CONFIRMED"
      : invoice.status === "CANCELED"
        ? "CANCELED"
        : "PENDING_PAYMENT",
  invoiceId: invoice.id,
  createdAt: invoice.createdAt,
});

export const membershipApi = {
  async listPublicPackages(): Promise<MembershipPackage[]> {
    const items = await apiRequest<PackageDto[]>("/MembershipPackage/active");
    return items.map(mapPackage).sort((a, b) => a.price - b.price);
  },

  async listPackages(): Promise<MembershipPackage[]> {
    const items: PackageDto[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await apiRequest<PagedPackagesDto>(
        `/MembershipPackage?page=${page}&pageSize=20`,
      );
      items.push(...result.items);
      totalPages = Math.max(1, result.totalPages);
      page += 1;
    } while (page <= totalPages);
    return items.map(mapPackage).sort((a, b) => a.price - b.price);
  },

  async getPackageById(id: string): Promise<MembershipPackage> {
    const result = await apiRequest<PackageDto>(`/MembershipPackage/${id}`);
    return mapPackage(result);
  },

  async savePackage(input: MembershipPackageInput, id?: string): Promise<MembershipPackage> {
    const result = await apiRequest<PackageDto>(id ? `/MembershipPackage/${id}` : "/MembershipPackage", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    });
    return mapPackage(result);
  },

  async setPackageStatus(id: string, isActive: boolean): Promise<void> {
    await apiRequest(`/MembershipPackage/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  async deletePackage(id: string): Promise<void> {
    await apiRequest(`/MembershipPackage/${id}`, { method: "DELETE" });
  },

  async registerOrRenew(
    actor: MembershipActor,
    packageId: string,
    paymentMethod: PaymentMethod,
  ): Promise<MembershipOrder> {
    const result = await apiRequest<SubscriptionDto>("/MemberSubscription/register-or-renew", {
      method: "POST",
      body: JSON.stringify({ packageId: Number(packageId), paymentMethod }),
    });
    return orderFromSubscription(result, actor);
  },

  async counterRegisterOrRenew(
    memberId: string,
    packageId: string,
    paymentMethod: PaymentMethod,
  ): Promise<MembershipOrder> {
    const result = await apiRequest<ReceiptDto>("/MemberSubscription/counter-register-or-renew", {
      method: "POST",
      body: JSON.stringify({ memberAccountId: memberId, packageId: Number(packageId), paymentMethod }),
    });
    return orderFromReceipt(result);
  },

  async counterRegisterMember(input: CounterMemberRegistrationInput): Promise<{
    member: MembershipActor;
    order: MembershipOrder;
    initialPassword: string;
    emailDelivery: CounterRegistrationResponseDto["emailDelivery"];
  }> {
    const result = await apiRequest<CounterRegistrationResponseDto>(
      "/Member/counter-registration",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: input.fullName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          dateOfBirth: input.dateOfBirth,
          packageId: Number(input.packageId),
          expectedPrice: input.expectedPrice,
          paymentMethod: input.paymentMethod,
        }),
      },
    );
    const member: MembershipActor = {
      id: result.member.accountId,
      username: result.member.memberCode,
      email: result.member.email,
      role: "MEMBER",
      fullName: result.member.fullName ?? result.member.memberCode,
      avatar: result.member.avatarUrl ?? undefined,
      createdAt: result.member.createdAt,
      failedAttempts: 0,
      isLocked: false,
      phone: result.member.phone ?? undefined,
      dateOfBirth: result.member.dateOfBirth ?? undefined,
      isActive: result.member.status === "Active",
    };
    return {
      member,
      order: orderFromReceipt(result.receipt),
      initialPassword: result.initialPassword,
      emailDelivery: result.emailDelivery,
    };
  },

  async payInvoice(invoiceId: string, paymentMethod: PaymentMethod): Promise<MembershipOrder> {
    const result = await apiRequest<ReceiptDto>(`/MembershipInvoice/${invoiceId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    });
    return orderFromReceipt(result);
  },

  async getReceipt(invoiceId: string): Promise<MembershipOrder> {
    const result = await apiRequest<ReceiptDto>(`/MembershipInvoice/${invoiceId}/receipt`);
    return orderFromReceipt(result);
  },

  async cancelPendingOrder(invoiceId: string): Promise<void> {
    await apiRequest(`/MembershipInvoice/${invoiceId}/cancel`, {
      method: "POST",
    });
  },

  async listInvoices(params?: {
    memberId?: string;
    status?: string;
    search?: string;
    paymentMethod?: string;
  }): Promise<MembershipInvoice[]> {
    const query = new URLSearchParams();
    if (params?.memberId) query.set("memberId", params.memberId);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.paymentMethod) query.set("paymentMethod", params.paymentMethod);
    const qs = query.toString();
    const result = await apiRequest<ReceiptDto[]>(`/MembershipInvoice${qs ? `?${qs}` : ""}`);
    return result.map((dto) => ({
      id: String(dto.invoiceId),
      number: dto.invoiceNumber,
      subscriptionId: String(dto.subscriptionId),
      memberId: dto.memberAccountId,
      memberName: dto.memberFullName ?? dto.memberCode,
      memberEmail: dto.memberEmail,
      packageId: String(dto.packageId),
      packageName: dto.packageName,
      packagePrice: dto.packagePrice,
      durationMonths: dto.durationMonths,
      benefits: Array.isArray(dto.benefits) ? dto.benefits : [],
      amount: dto.amount,
      startDate: dto.startDate,
      endDate: dto.endDate,
      kind: dto.kind,
      paymentMethod: dto.paymentMethod,
      status: dto.invoiceStatus,
      createdAt: dto.createdAt,
      createdBy: dto.memberAccountId,
      paidAt: dto.paidAt ?? undefined,
      paidBy: dto.paidByStaffId ?? undefined,
      paidByName: dto.paidByStaffName ?? undefined,
    }));
  },
};
