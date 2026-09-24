import { mockDb } from "./mockDb";
import type { UserRole } from "../types/auth";
import type {
  MemberSubscription,
  MembershipActor,
  MembershipInvoice,
  MembershipOrder,
  MembershipOrderInput,
  MembershipPackage,
  MembershipPackageInput,
  MembershipQuote,
  SubscriptionDisplayStatus,
} from "../types/membership";

export const MEMBERSHIP_STORAGE_KEY = "scms_memberships_v1";

interface MembershipState {
  version: 1;
  packages: MembershipPackage[];
  subscriptions: MemberSubscription[];
  invoices: MembershipInvoice[];
}

const STAFF_ROLES: UserRole[] = ["CENTER_MANAGER", "RECEPTIONIST"];
const MEMBER_ROLES: UserRole[] = [...STAFF_ROLES, "MEMBER"];

export function todayDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(date: string): Date {
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

function saveState(state: MembershipState): void {
  try {
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "Không thể lưu dữ liệu trên trình duyệt. Vui lòng kiểm tra dung lượng lưu trữ rồi thử lại.",
    );
  }
}

function initialState(): MembershipState {
  const createdAt = new Date().toISOString();
  const packages: MembershipPackage[] = [
    {
      id: "pkg_monthly",
      name: "Gói Tháng",
      price: 450000,
      durationMonths: 1,
      benefits: [
        "Tập luyện tại phòng gym",
        "Sử dụng tủ đồ cá nhân",
        "Đánh giá thể lực ban đầu",
      ],
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "pkg_quarterly",
      name: "Gói Quý",
      price: 1200000,
      durationMonths: 3,
      benefits: [
        "Toàn bộ quyền lợi Gói Tháng",
        "Tham gia các lớp tập nhóm",
        "Tư vấn kế hoạch tập luyện",
      ],
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "pkg_yearly",
      name: "Gói Năm",
      price: 4200000,
      durationMonths: 12,
      benefits: [
        "Toàn bộ quyền lợi Gói Quý",
        "Đánh giá tiến độ định kỳ",
        "Ưu tiên đăng ký lớp học",
      ],
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const state: MembershipState = {
    version: 1,
    packages,
    subscriptions: [],
    invoices: [],
  };
  // An explicitly seeded, already-paid demo membership makes renewal reviewable.
  const member = mockDb
    .getUsers()
    .find((user) => user.id === "usr_member_01" && user.role === "MEMBER");
  if (member) {
    const startDate = todayDate();
    const endDate = addDateDays(addMonthsClamped(startDate, 1), -1);
    const quote: MembershipQuote = {
      memberId: member.id,
      memberName: member.fullName || member.username,
      memberEmail: member.email,
      packageId: packages[0].id,
      packageName: packages[0].name,
      durationMonths: 1,
      benefits: [...packages[0].benefits],
      amount: packages[0].price,
      startDate,
      endDate,
      paymentMethod: "CASH",
      kind: "REGISTER",
    };
    state.subscriptions.push({
      id: "sub_demo_01",
      memberId: member.id,
      packageId: quote.packageId,
      packageName: quote.packageName,
      durationMonths: quote.durationMonths,
      benefits: [...quote.benefits],
      amount: quote.amount,
      startDate,
      endDate,
      kind: "REGISTER",
      status: "CONFIRMED",
      invoiceId: "inv_demo_01",
      createdAt,
    });
    state.invoices.push({
      ...quote,
      id: "inv_demo_01",
      number: "HD-DEMO-001",
      subscriptionId: "sub_demo_01",
      status: "PAID",
      createdAt,
      createdBy: "usr_recept_01",
    });
  }
  return state;
}

function readState(): MembershipState {
  let stored: string | null;
  try {
    stored = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
  } catch {
    throw new Error(
      "Không thể đọc dữ liệu trên trình duyệt. Vui lòng cho phép lưu trữ cục bộ.",
    );
  }
  if (stored === null) {
    const state = initialState();
    saveState(state);
    return state;
  }
  try {
    const state = JSON.parse(stored) as MembershipState;
    if (
      state.version !== 1 ||
      !Array.isArray(state.packages) ||
      !Array.isArray(state.subscriptions) ||
      !Array.isArray(state.invoices)
    ) {
      throw new Error("Invalid state");
    }
    return state;
  } catch {
    // Never silently overwrite existing orders or invoices when storage is invalid.
    throw new Error(
      "Dữ liệu gói tập trên trình duyệt không hợp lệ. Vui lòng liên hệ quản trị viên.",
    );
  }
}

function authorize(actor: MembershipActor, roles: UserRole[]): MembershipActor {
  const storedActor = mockDb.getUsers().find((user) => user.id === actor?.id);
  if (
    !storedActor ||
    storedActor.isLocked ||
    storedActor.role !== actor.role ||
    !roles.includes(storedActor.role)
  ) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  const { passwordHash: _passwordHash, ...publicActor } = storedActor;
  return publicActor;
}

function assertMemberAccess(
  actor: MembershipActor,
  memberId: string,
): MembershipActor {
  const currentActor = authorize(actor, MEMBER_ROLES);
  if (currentActor.role === "MEMBER" && memberId !== currentActor.id) {
    throw new Error("Bạn chỉ được xem và đăng ký gói tập của mình.");
  }
  const member = mockDb
    .getUsers()
    .find((user) => user.id === memberId && user.role === "MEMBER");
  if (!member) throw new Error("Không tìm thấy thành viên.");
  const { passwordHash: _passwordHash, ...publicMember } = member;
  return publicMember;
}

function normalizePackage(
  input: MembershipPackageInput,
): MembershipPackageInput {
  const name = input.name.trim();
  const benefits = input.benefits
    .map((benefit) => benefit.trim())
    .filter(Boolean);
  if (name.length < 2 || name.length > 80)
    throw new Error("Tên gói tập phải có từ 2 đến 80 ký tự.");
  if (
    !Number.isSafeInteger(input.price) ||
    input.price <= 0 ||
    input.price > 1000000000
  ) {
    throw new Error(
      "Giá gói tập phải là số nguyên từ 1 đến 1.000.000.000 đồng.",
    );
  }
  if (![1, 3, 12].includes(input.durationMonths))
    throw new Error("Thời hạn gói tập phải là 1, 3 hoặc 12 tháng.");
  if (
    !benefits.length ||
    benefits.length > 12 ||
    benefits.some((benefit) => benefit.length > 200)
  ) {
    throw new Error(
      "Nhập từ 1 đến 12 quyền lợi, mỗi quyền lợi tối đa 200 ký tự.",
    );
  }
  return {
    name,
    price: input.price,
    durationMonths: input.durationMonths,
    benefits: [...new Set(benefits)],
  };
}

export function getSubscriptionStatus(
  subscription: MemberSubscription,
  today = todayDate(),
): SubscriptionDisplayStatus {
  if (subscription.status === "PENDING") return "PENDING";
  if (subscription.startDate > today) return "UPCOMING";
  if (subscription.endDate < today) return "EXPIRED";
  return "ACTIVE";
}

function buildQuote(
  actor: MembershipActor,
  input: MembershipOrderInput,
  state: MembershipState,
): MembershipQuote {
  const member = assertMemberAccess(actor, input.memberId);
  if (member.isLocked) throw new Error("Tài khoản thành viên đang bị khóa.");
  const selectedPackage = state.packages.find(
    (item) => item.id === input.packageId,
  );
  if (!selectedPackage?.isActive)
    throw new Error("Gói tập này hiện không mở đăng ký.");
  if (!["CASH", "BANK_TRANSFER", "CARD"].includes(input.paymentMethod))
    throw new Error("Phương thức thanh toán không hợp lệ.");
  if (!["REGISTER", "RENEW"].includes(input.kind))
    throw new Error("Loại đăng ký không hợp lệ.");
  const memberSubscriptions = state.subscriptions.filter(
    (item) => item.memberId === member.id,
  );
  if (
    memberSubscriptions.some((item) => item.status === "PENDING") ||
    state.invoices.some(
      (item) => item.memberId === member.id && item.status === "PENDING",
    )
  ) {
    throw new Error(
      "Thành viên đã có một yêu cầu đang chờ thanh toán. Vui lòng xử lý yêu cầu hiện tại trước.",
    );
  }
  const confirmed = memberSubscriptions.filter(
    (item) => item.status === "CONFIRMED",
  );
  const today = todayDate();
  const latestEnd = confirmed.reduce(
    (latest, item) => (item.endDate > latest ? item.endDate : latest),
    "",
  );
  if (input.kind === "REGISTER" && latestEnd >= today)
    throw new Error(
      "Thành viên đã có gói còn hạn. Vui lòng chọn Gia hạn để cộng dồn thời gian.",
    );
  if (input.kind === "RENEW" && !confirmed.length)
    throw new Error(
      "Thành viên chưa có gói tập để gia hạn. Vui lòng chọn Đăng ký mới.",
    );
  const startDate =
    input.kind === "RENEW" && latestEnd >= today
      ? addDateDays(latestEnd, 1)
      : today;
  return {
    ...input,
    memberName: member.fullName || member.username,
    memberEmail: member.email,
    packageName: selectedPackage.name,
    durationMonths: selectedPackage.durationMonths,
    benefits: [...selectedPackage.benefits],
    amount: selectedPackage.price,
    startDate,
    endDate: addDateDays(
      addMonthsClamped(startDate, selectedPackage.durationMonths),
      -1,
    ),
  };
}

/** Synchronous mock adapter. Replace this boundary with API calls when the BE is ready. */
export const membershipService = {
  listPackages(
    actor: MembershipActor,
    options: { includeHidden?: boolean } = {},
  ): MembershipPackage[] {
    authorize(actor, MEMBER_ROLES);
    if (options.includeHidden && actor.role !== "CENTER_MANAGER")
      throw new Error("Chỉ quản lý được xem các gói đã ẩn.");
    return readState().packages.filter(
      (item) => options.includeHidden || item.isActive,
    );
  },

  savePackage(
    actor: MembershipActor,
    input: MembershipPackageInput,
    packageId?: string,
  ): MembershipPackage {
    authorize(actor, ["CENTER_MANAGER"]);
    const values = normalizePackage(input);
    const state = readState();
    if (
      state.packages.some(
        (item) =>
          item.id !== packageId &&
          item.name.toLocaleLowerCase("vi") ===
            values.name.toLocaleLowerCase("vi"),
      )
    ) {
      throw new Error("Tên gói tập đã tồn tại.");
    }
    const now = new Date().toISOString();
    let result: MembershipPackage;
    if (packageId) {
      const index = state.packages.findIndex((item) => item.id === packageId);
      if (index === -1) throw new Error("Không tìm thấy gói tập.");
      result = { ...state.packages[index], ...values, updatedAt: now };
      state.packages[index] = result;
    } else {
      result = {
        ...values,
        id: crypto.randomUUID(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      state.packages.push(result);
    }
    saveState(state);
    return result;
  },

  setPackageVisibility(
    actor: MembershipActor,
    packageId: string,
    isActive: boolean,
  ): MembershipPackage {
    authorize(actor, ["CENTER_MANAGER"]);
    const state = readState();
    const item = state.packages.find((entry) => entry.id === packageId);
    if (!item) throw new Error("Không tìm thấy gói tập.");
    item.isActive = isActive;
    item.updatedAt = new Date().toISOString();
    saveState(state);
    return item;
  },

  deletePackage(actor: MembershipActor, packageId: string): void {
    authorize(actor, ["CENTER_MANAGER"]);
    const state = readState();
    if (!state.packages.some((item) => item.id === packageId))
      throw new Error("Không tìm thấy gói tập.");
    if (
      state.subscriptions.some((item) => item.packageId === packageId) ||
      state.invoices.some((item) => item.packageId === packageId)
    ) {
      throw new Error(
        "Gói đã có thành viên đăng ký. Chỉ có thể ẩn gói để giữ lịch sử và hóa đơn.",
      );
    }
    state.packages = state.packages.filter((item) => item.id !== packageId);
    saveState(state);
  },

  listMembers(actor: MembershipActor): MembershipActor[] {
    const currentActor = authorize(actor, MEMBER_ROLES);
    return mockDb
      .getUsers()
      .filter(
        (user) =>
          user.role === "MEMBER" &&
          (currentActor.role !== "MEMBER" || user.id === currentActor.id),
      )
      .map(({ passwordHash: _passwordHash, ...member }) => member);
  },

  getMemberSubscriptions(
    actor: MembershipActor,
    memberId?: string,
  ): MemberSubscription[] {
    const currentActor = authorize(actor, MEMBER_ROLES);
    const targetId =
      memberId ??
      (currentActor.role === "MEMBER" ? currentActor.id : undefined);
    if (targetId) assertMemberAccess(actor, targetId);
    return readState()
      .subscriptions.filter((item) => !targetId || item.memberId === targetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listInvoices(actor: MembershipActor, memberId?: string): MembershipInvoice[] {
    const currentActor = authorize(actor, MEMBER_ROLES);
    const targetId =
      memberId ??
      (currentActor.role === "MEMBER" ? currentActor.id : undefined);
    if (targetId) assertMemberAccess(actor, targetId);
    return readState()
      .invoices.filter((item) => !targetId || item.memberId === targetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  quoteMembershipOrder(
    actor: MembershipActor,
    input: MembershipOrderInput,
  ): MembershipQuote {
    authorize(actor, MEMBER_ROLES);
    return buildQuote(actor, input, readState());
  },

  createMembershipOrder(
    actor: MembershipActor,
    input: MembershipOrderInput,
  ): MembershipOrder {
    authorize(actor, MEMBER_ROLES);
    const state = readState();
    // Revalidate at commit time; the catalog may have changed since the preview.
    const quote = buildQuote(actor, input, state);
    const createdAt = new Date().toISOString();
    const subscriptionId = crypto.randomUUID();
    const invoiceId = crypto.randomUUID();
    const invoice: MembershipInvoice = {
      ...quote,
      id: invoiceId,
      number: `HD-${todayDate().replaceAll("-", "")}-${invoiceId.slice(0, 8).toUpperCase()}`,
      subscriptionId,
      status: "PENDING",
      createdAt,
      createdBy: actor.id,
    };
    const subscription: MemberSubscription = {
      id: subscriptionId,
      memberId: quote.memberId,
      packageId: quote.packageId,
      packageName: quote.packageName,
      durationMonths: quote.durationMonths,
      benefits: [...quote.benefits],
      amount: quote.amount,
      startDate: quote.startDate,
      endDate: quote.endDate,
      kind: quote.kind,
      status: "PENDING",
      invoiceId,
      createdAt,
    };
    state.subscriptions.push(subscription);
    state.invoices.push(invoice);
    // One write makes creating the reservation and invoice atomic in this mock adapter.
    saveState(state);
    return { subscription, invoice };
  },
};
