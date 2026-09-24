import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb } from "./mockDb";
import {
  addMonthsClamped,
  getSubscriptionStatus,
  MEMBERSHIP_STORAGE_KEY,
  membershipService,
  todayDate,
} from "./membershipService";
import type {
  MembershipActor,
  MembershipOrderInput,
} from "../types/membership";

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
  };
}

let manager: MembershipActor;
let member: MembershipActor;
let receptionist: MembershipActor;
let coach: MembershipActor;
let newMember: MembershipActor;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 12, 0, 0));
  vi.stubGlobal("localStorage", memoryStorage());
  const users = mockDb.getUsers();
  const publicUser = (id: string): MembershipActor => {
    const { passwordHash: _passwordHash, ...user } = users.find(
      (item) => item.id === id,
    )!;
    return user;
  };
  manager = publicUser("usr_manager_01");
  member = publicUser("usr_member_01");
  receptionist = publicUser("usr_recept_01");
  coach = publicUser("usr_coach_01");
  const another = {
    ...users.find((item) => item.id === member.id)!,
    id: "member_new",
    username: "new_member",
    email: "new@sportscenter.com",
    fullName: "Thành viên mới",
  };
  mockDb.addUser(another);
  const { passwordHash: _passwordHash, ...safeNewMember } = another;
  newMember = safeNewMember;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function registration(memberId = newMember.id): MembershipOrderInput {
  return {
    memberId,
    packageId: "pkg_quarterly",
    paymentMethod: "BANK_TRANSFER",
    kind: "REGISTER",
  };
}

describe("calendar-based membership dates", () => {
  it("clamps month-end and leap-year dates without rolling into the following month", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsClamped("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonthsClamped("2026-11-30", 3)).toBe("2027-02-28");
    expect(() => addMonthsClamped("2026-02-30", 1)).toThrow();
  });

  it("starts a new registration today and uses an inclusive end date", () => {
    const quote = membershipService.quoteMembershipOrder(
      newMember,
      registration(),
    );
    expect(quote.startDate).toBe("2026-09-24");
    expect(quote.endDate).toBe("2026-12-23");
    expect(quote.amount).toBe(1200000);
  });

  it("renews an unexpired membership from the day after its last confirmed end", () => {
    const current = membershipService.getMemberSubscriptions(member)[0];
    expect(current.endDate).toBe("2026-10-23");
    const quote = membershipService.quoteMembershipOrder(member, {
      ...registration(member.id),
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-10-24");
    expect(quote.endDate).toBe("2027-01-23");
  });

  it("renews expired history from today rather than backdating access", () => {
    membershipService.getMemberSubscriptions(member);
    vi.setSystemTime(new Date(2026, 10, 10, 12));
    const quote = membershipService.quoteMembershipOrder(member, {
      ...registration(member.id),
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-11-10");
    expect(quote.endDate).toBe("2027-02-09");
  });

  it("keeps the final valid day active and begins renewal on the following day", () => {
    const current = membershipService.getMemberSubscriptions(member)[0];
    expect(getSubscriptionStatus(current, "2026-09-23")).toBe("UPCOMING");
    expect(getSubscriptionStatus(current, current.endDate)).toBe("ACTIVE");
    expect(getSubscriptionStatus(current, "2026-10-24")).toBe("EXPIRED");
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const quote = membershipService.quoteMembershipOrder(member, {
      ...registration(member.id),
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-10-24");
  });
});

describe("package management rules", () => {
  it("allows a manager to create, edit and delete an unused package", () => {
    const created = membershipService.savePackage(manager, {
      name: " Gói thử mới ",
      durationMonths: 1,
      price: 500000,
      benefits: [" Tủ đồ ", "Tư vấn"],
    });
    expect(created.name).toBe("Gói thử mới");
    expect(created.benefits).toEqual(["Tủ đồ", "Tư vấn"]);
    const updated = membershipService.savePackage(
      manager,
      { ...created, price: 550000 },
      created.id,
    );
    expect(updated.price).toBe(550000);
    membershipService.deletePackage(manager, created.id);
    expect(
      membershipService
        .listPackages(manager)
        .some((item) => item.id === created.id),
    ).toBe(false);
  });

  it("blocks deletion of a subscribed package but allows hiding it", () => {
    expect(() =>
      membershipService.deletePackage(manager, "pkg_monthly"),
    ).toThrow(/Chỉ có thể ẩn/);
    membershipService.setPackageVisibility(manager, "pkg_monthly", false);
    expect(
      membershipService
        .listPackages(member)
        .some((item) => item.id === "pkg_monthly"),
    ).toBe(false);
    expect(
      membershipService
        .listPackages(manager, { includeHidden: true })
        .find((item) => item.id === "pkg_monthly")?.isActive,
    ).toBe(false);
    expect(
      membershipService.getMemberSubscriptions(member)[0].packageName,
    ).toBe("Gói Tháng");
    expect(() =>
      membershipService.createMembershipOrder(member, {
        memberId: member.id,
        packageId: "pkg_monthly",
        kind: "RENEW",
        paymentMethod: "CASH",
      }),
    ).toThrow(/không mở đăng ký/);
    membershipService.setPackageVisibility(manager, "pkg_monthly", true);
    expect(
      membershipService
        .listPackages(member)
        .some((item) => item.id === "pkg_monthly"),
    ).toBe(true);
  });

  it("rejects invalid prices, durations and duplicate names", () => {
    const input = {
      name: "Test",
      durationMonths: 1 as const,
      price: 200000,
      benefits: ["Tập gym"],
    };
    expect(() =>
      membershipService.savePackage(manager, { ...input, price: -1 }),
    ).toThrow(/Giá/);
    expect(() =>
      membershipService.savePackage(manager, { ...input, price: 1.5 }),
    ).toThrow(/Giá/);
    expect(() =>
      membershipService.savePackage(manager, { ...input, price: Number.NaN }),
    ).toThrow(/Giá/);
    expect(() =>
      membershipService.savePackage(manager, { ...input, benefits: [" "] }),
    ).toThrow(/quyền lợi/);
    expect(() =>
      membershipService.savePackage(manager, { ...input, name: "gói tháng" }),
    ).toThrow(/tồn tại/);
  });
});

describe("pending registration and immutable invoices", () => {
  it("previews without creating an order and commits one pending invoice/reservation", () => {
    membershipService.listPackages(newMember);
    const before = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    const quote = membershipService.quoteMembershipOrder(
      newMember,
      registration(),
    );
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe(before);
    const order = membershipService.createMembershipOrder(
      newMember,
      registration(),
    );
    expect(order.invoice.status).toBe("PENDING");
    expect(order.subscription.status).toBe("PENDING");
    expect(getSubscriptionStatus(order.subscription, todayDate())).toBe(
      "PENDING",
    );
    expect(order.invoice.startDate).toBe(quote.startDate);
    expect(order.invoice.subscriptionId).toBe(order.subscription.id);
    expect(order.subscription.invoiceId).toBe(order.invoice.id);
    expect(membershipService.listInvoices(newMember)).toHaveLength(1);
    expect(
      membershipService
        .getMemberSubscriptions(newMember)
        .filter((item) => getSubscriptionStatus(item) === "ACTIVE"),
    ).toHaveLength(0);
  });

  it("prevents repeated clicks and another package from creating duplicate pending charges", () => {
    membershipService.createMembershipOrder(receptionist, registration());
    expect(() =>
      membershipService.createMembershipOrder(receptionist, registration()),
    ).toThrow(/đang chờ thanh toán/);
    expect(() =>
      membershipService.createMembershipOrder(newMember, {
        ...registration(),
        packageId: "pkg_yearly",
      }),
    ).toThrow(/đang chờ thanh toán/);
    expect(membershipService.listInvoices(newMember)).toHaveLength(1);
  });

  it("preserves invoice and subscription snapshots after package name/price/benefits change", () => {
    const order = membershipService.createMembershipOrder(
      receptionist,
      registration(),
    );
    membershipService.savePackage(
      manager,
      {
        name: "Gói Quý mới",
        price: 2000000,
        durationMonths: 3,
        benefits: ["Quyền lợi mới"],
      },
      "pkg_quarterly",
    );
    const invoice = membershipService.listInvoices(newMember)[0];
    const subscription = membershipService.getMemberSubscriptions(newMember)[0];
    expect(invoice).toEqual(order.invoice);
    expect(subscription).toEqual(order.subscription);
    expect(invoice.packageName).toBe("Gói Quý");
    expect(invoice.amount).toBe(1200000);
    expect(() =>
      membershipService.deletePackage(manager, "pkg_quarterly"),
    ).toThrow(/Chỉ có thể ẩn/);
  });

  it("rejects an obsolete quote when the package is hidden before commit", () => {
    membershipService.quoteMembershipOrder(receptionist, registration());
    membershipService.setPackageVisibility(manager, "pkg_quarterly", false);
    expect(() =>
      membershipService.createMembershipOrder(receptionist, registration()),
    ).toThrow(/không mở đăng ký/);
    expect(membershipService.listInvoices(newMember)).toHaveLength(0);
  });

  it("leaves both invoices and subscriptions unchanged if persisting the order fails", () => {
    membershipService.listPackages(manager);
    const before = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    const failingWrite = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("Quota exceeded");
      });
    expect(() =>
      membershipService.createMembershipOrder(receptionist, registration()),
    ).toThrow(/Không thể lưu/);
    failingWrite.mockRestore();
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe(before);
    expect(membershipService.listInvoices(newMember)).toHaveLength(0);
    expect(membershipService.getMemberSubscriptions(newMember)).toHaveLength(0);
  });

  it("requires renewal for active members and registration for members without history", () => {
    expect(() =>
      membershipService.quoteMembershipOrder(member, registration(member.id)),
    ).toThrow(/Gia hạn/);
    expect(() =>
      membershipService.quoteMembershipOrder(newMember, {
        ...registration(),
        kind: "RENEW",
      }),
    ).toThrow(/Đăng ký mới/);
  });
});

describe("mock role and ownership checks", () => {
  it("allows receptionist registration for a member without exposing password hashes", () => {
    const members = membershipService.listMembers(receptionist);
    expect(members).toHaveLength(2);
    expect(members.every((user) => !("passwordHash" in user))).toBe(true);
    expect(
      membershipService.createMembershipOrder(receptionist, registration())
        .invoice.memberId,
    ).toBe(newMember.id);
    expect(
      membershipService.listMembers(newMember).map((user) => user.id),
    ).toEqual([newMember.id]);
  });

  it("blocks member access to another member and blocks coach membership actions", () => {
    expect(() => membershipService.listInvoices(member, newMember.id)).toThrow(
      /của mình/,
    );
    expect(() =>
      membershipService.getMemberSubscriptions(member, newMember.id),
    ).toThrow(/của mình/);
    expect(() =>
      membershipService.createMembershipOrder(member, registration()),
    ).toThrow(/của mình/);
    expect(() => membershipService.listPackages(coach)).toThrow(
      /không có quyền/,
    );
    expect(() =>
      membershipService.createMembershipOrder(coach, registration()),
    ).toThrow(/không có quyền/);
  });

  it("rejects non-manager catalog writes and mismatched actor roles", () => {
    expect(() =>
      membershipService.deletePackage(receptionist, "pkg_yearly"),
    ).toThrow(/không có quyền/);
    expect(() =>
      membershipService.setPackageVisibility(member, "pkg_yearly", false),
    ).toThrow(/không có quyền/);
    expect(() =>
      membershipService.listPackages(member, { includeHidden: true }),
    ).toThrow(/Chỉ quản lý/);
    expect(() =>
      membershipService.deletePackage(
        { ...member, role: "CENTER_MANAGER" },
        "pkg_yearly",
      ),
    ).toThrow(/không có quyền/);
  });

  it("preserves corrupted storage instead of silently replacing invoice history", () => {
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, "{broken");
    expect(() => membershipService.listInvoices(manager)).toThrow(
      /không hợp lệ/,
    );
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe("{broken");
  });
});
