import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb } from "./mockDb";
import {
  addMonthsClamped,
  getSubscriptionStatus,
  getMembershipStatusSummary,
  MEMBERSHIP_STORAGE_KEY,
  membershipService,
  resolveOrderKind,
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

describe("receptionist membership status", () => {
  it("counts inclusive days and warns strictly below seven days", () => {
    const sub = membershipService.getMemberSubscriptions(receptionist, member.id)[0];
    expect(getMembershipStatusSummary([{ ...sub, endDate: "2026-09-30" }]).remainingDays).toBe(7);
    expect(getMembershipStatusSummary([{ ...sub, endDate: "2026-09-30" }]).expiringSoon).toBe(false);
    expect(getMembershipStatusSummary([{ ...sub, endDate: "2026-09-29" }]).expiringSoon).toBe(true);
    expect(getMembershipStatusSummary([{ ...sub, endDate: "2026-09-24" }])).toMatchObject({ status: "ACTIVE", remainingDays: 1, expiringSoon: true });
    expect(getMembershipStatusSummary([{ ...sub, endDate: "2026-09-23" }])).toMatchObject({ status: "EXPIRED", remainingDays: 0, expiringSoon: false });
  });
  it("shows suspension independently from payment or account lock and expires normally", () => {
    const sub = membershipService.getMemberSubscriptions(receptionist, member.id)[0];
    expect(getMembershipStatusSummary([{ ...sub, isSuspended: true }]).status).toBe("SUSPENDED");
    expect(getSubscriptionStatus({ ...sub, isSuspended: true, endDate: "2026-09-23" })).toBe("EXPIRED");
    expect(getSubscriptionStatus({ ...sub, isSuspended: true, status: "PENDING_PAYMENT" })).toBe("PENDING_PAYMENT");
  });
  it("does not mistake pending, replaced, canceled or future periods for active access", () => {
    const sub = membershipService.getMemberSubscriptions(receptionist, member.id)[0];
    expect(getMembershipStatusSummary([]).status).toBe("NONE");
    expect(getMembershipStatusSummary([{ ...sub, replacedOn: todayDate() }, { ...sub, status: "CANCELED" }]).status).toBe("NONE");
    expect(getMembershipStatusSummary([{ ...sub, status: "PENDING_PAYMENT" }])).toMatchObject({ status: "PENDING_PAYMENT", remainingDays: 0 });
    const future = { ...sub, id: "future", startDate: "2026-10-24", endDate: "2026-11-23" };
    expect(getMembershipStatusSummary([future])).toMatchObject({ status: "UPCOMING", remainingDays: 0, expiringSoon: false });
    expect(getMembershipStatusSummary([future, sub])).toMatchObject({ status: "ACTIVE", subscription: { id: sub.id }, upcoming: { id: "future" } });
  });
});

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
      packageId: "pkg_monthly",
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-10-24");
    expect(quote.endDate).toBe("2026-11-23");
  });

  it("renews expired history from today rather than backdating access", () => {
    membershipService.getMemberSubscriptions(member);
    vi.setSystemTime(new Date(2026, 10, 10, 12));
    const quote = membershipService.quoteMembershipOrder(member, {
      ...registration(member.id),
      packageId: "pkg_monthly",
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-11-10");
    expect(quote.endDate).toBe("2026-12-09");
  });

  it("keeps the final valid day active and begins renewal on the following day", () => {
    const current = membershipService.getMemberSubscriptions(member)[0];
    expect(getSubscriptionStatus(current, "2026-09-23")).toBe("UPCOMING");
    expect(getSubscriptionStatus(current, current.endDate)).toBe("ACTIVE");
    expect(getSubscriptionStatus(current, "2026-10-24")).toBe("EXPIRED");
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const quote = membershipService.quoteMembershipOrder(member, {
      ...registration(member.id),
      packageId: "pkg_monthly",
      kind: "RENEW",
    });
    expect(quote.startDate).toBe("2026-10-24");
  });
});

describe("public membership catalog", () => {
  it("lists purchasable packages without a signed-in actor or session", () => {
    expect(localStorage.getItem("scms_auth_token")).toBeNull();
    expect(membershipService.listPublicPackages().map((pkg) => pkg.id)).toEqual([
      "pkg_monthly",
      "pkg_quarterly",
      "pkg_yearly",
    ]);
    expect(localStorage.getItem("scms_auth_token")).toBeNull();
  });

  it("reflects manager edits and visibility changes without publishing hidden packages", () => {
    const monthly = membershipService.listPackages(manager)[0];
    membershipService.savePackage(
      manager,
      { ...monthly, name: "Gói tháng mới", price: 500000, benefits: ["Tủ đồ"] },
      monthly.id,
    );
    membershipService.setPackageVisibility(manager, "pkg_quarterly", false);
    expect(membershipService.listPublicPackages()).toEqual([
      {
        id: monthly.id,
        name: "Gói tháng mới",
        price: 500000,
        durationMonths: 1,
        benefits: ["Tủ đồ"],
      },
      expect.objectContaining({ id: "pkg_yearly" }),
    ]);
    membershipService.setPackageVisibility(manager, "pkg_quarterly", true);
    expect(membershipService.listPublicPackages()).toHaveLength(3);
  });

  it("exposes only catalog fields even when personal records and extra fields exist", () => {
    membershipService.createMembershipOrder(newMember, registration());
    const stored = JSON.parse(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)!);
    expect(stored.invoices.length).toBeGreaterThan(0);
    expect(stored.subscriptions.length).toBeGreaterThan(0);
    stored.packages[0].memberEmail = member.email;
    stored.packages[0].internalNote = "Private catalog metadata";
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(stored));

    const catalog = membershipService.listPublicPackages();
    for (const pkg of catalog) {
      expect(Object.keys(pkg).sort()).toEqual([
        "benefits", "durationMonths", "id", "name", "price",
      ]);
    }
    expect(JSON.stringify(catalog)).not.toContain(member.email);
    expect(JSON.stringify(catalog)).not.toContain(newMember.email);
    expect(JSON.stringify(catalog)).not.toContain("Private catalog metadata");
    catalog[0].benefits.push("Changed outside the catalog");
    expect(membershipService.listPublicPackages()[0].benefits).not.toContain(
      "Changed outside the catalog",
    );
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
    expect(order.invoice.status).toBe("PENDING_PAYMENT");
    expect(order.subscription.status).toBe("PENDING_PAYMENT");
    expect(getSubscriptionStatus(order.subscription, todayDate())).toBe(
      "PENDING_PAYMENT",
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

  it("automatically resolves renewal for active members and registration for new members", () => {
    expect(
      membershipService.quoteMembershipOrder(member, { ...registration(member.id), packageId: "pkg_monthly" })
        .kind,
    ).toBe("RENEW");
    expect(
      membershipService.quoteMembershipOrder(newMember, {
        ...registration(),
        kind: "RENEW",
      }).kind,
    ).toBe("REGISTER");
  });
});

function cashOrder(actor = member, packageId = "pkg_monthly") {
  return membershipService.createMembershipOrder(receptionist, {
    memberId: actor.id,
    packageId,
    paymentMethod: "CASH",
    kind: "REGISTER",
  });
}
function pay(order: ReturnType<typeof cashOrder>, actor = receptionist) {
  return membershipService.confirmCashPayment(
    actor,
    order.invoice.id,
    order.invoice.amount,
  );
}

describe("cash confirmation and membership transitions", () => {
  it("compares package prices without ranks and preserves purchased price snapshots", () => {
    const old = membershipService.getMemberSubscriptions(member)[0];
    const pkg = membershipService.listPackages(manager).find(p => p.id === "pkg_quarterly")!;
    expect(resolveOrderKind([old], pkg)).toBe("UPGRADE");
    expect(resolveOrderKind([old], { ...pkg, price: old.packagePrice })).toBe("RENEW");
    expect(resolveOrderKind([old], { ...pkg, price: 400000 })).toBe("DOWNGRADE");
    membershipService.savePackage(manager, { ...pkg, name: "Gói Tháng mới", price: 500000 }, "pkg_monthly");
    expect(membershipService.getMemberSubscriptions(member)[0].packagePrice).toBe(450000);
    expect(membershipService.listPackages(manager)).toHaveLength(3);
    expect(membershipService.listPackages(manager).every(p => !("tier" in p))).toBe(true);
  });

  it("rechecks locked member and cashier accounts at collection time", () => {
    const order = cashOrder(newMember);
    const user = mockDb.findByEmail(newMember.email)!;
    mockDb.updateUser({ ...user, isLocked: true });
    expect(() => pay(order)).toThrow(/bị khóa/);
    mockDb.updateUser(user);
    const cashier = mockDb.findByEmail(receptionist.email)!;
    mockDb.updateUser({ ...cashier, isLocked: true });
    expect(() => pay(order)).toThrow(/không có quyền/);
    expect(
      membershipService.listInvoices(manager, newMember.id)[0].status,
    ).toBe("PENDING_PAYMENT");
  });
  it("routes duplicate active package registration into renewal: Sep 1–30, then Oct 1–31", () => {
    vi.setSystemTime(new Date(2026, 8, 1, 12));
    const current = membershipService.getMemberSubscriptions(member)[0];
    expect(current.startDate).toBe("2026-09-01");
    expect(current.endDate).toBe("2026-09-30");
    vi.setSystemTime(new Date(2026, 8, 15, 12));
    const order = cashOrder();
    expect(order.invoice.kind).toBe("RENEW");
    expect(order.subscription.startDate).toBe("2026-10-01");
    expect(order.subscription.endDate).toBe("2026-10-31");
    expect(getSubscriptionStatus(pay(order).subscription)).toBe("UPCOMING");
    expect(
      membershipService
        .getMemberSubscriptions(member)
        .filter((s) => getSubscriptionStatus(s) === "ACTIVE"),
    ).toHaveLength(1);
    expect(
      membershipService
        .getMemberSubscriptions(member)
        .find((s) => s.id === current.id),
    ).toEqual(current);
  });

  it("cash stays pending until staff confirmation, records cashier and prevents confirming twice", () => {
    const order = cashOrder(newMember);
    expect(getSubscriptionStatus(order.subscription)).toBe("PENDING_PAYMENT");
    const confirmed = pay(order);
    expect(confirmed.invoice.status).toBe("PAID");
    expect(confirmed.invoice.paidBy).toBe(receptionist.id);
    expect(confirmed.invoice.paidByName).toBe(receptionist.fullName);
    expect(confirmed.invoice.paidAt).toBeTruthy();
    expect(getSubscriptionStatus(confirmed.subscription)).toBe("ACTIVE");
    expect(() => pay(order)).toThrow(/không còn chờ/);
  });

  it("allows manager but denies member, coach and role spoofing", () => {
    const order = cashOrder(newMember);
    for (const actor of [
      newMember,
      coach,
      { ...member, role: "RECEPTIONIST" as const },
    ]) {
      expect(() => pay(order, actor)).toThrow(/không có quyền/);
    }
    expect(pay(order, manager).invoice.paidBy).toBe(manager.id);
  });

  it("rejects wrong amounts and non-cash payment methods without granting access", () => {
    const cash = cashOrder(newMember);
    for (const amount of [
      -1,
      0,
      cash.invoice.amount - 1,
      cash.invoice.amount + 1,
      NaN,
    ]) {
      expect(() =>
        membershipService.confirmCashPayment(
          receptionist,
          cash.invoice.id,
          amount,
        ),
      ).toThrow(/Số tiền/);
    }
    membershipService.cancelPendingOrder(newMember, cash.invoice.id);
    for (const paymentMethod of ["BANK_TRANSFER", "CARD"] as const) {
      const order = membershipService.createMembershipOrder(newMember, {
        ...registration(),
        paymentMethod,
      });
      expect(() => pay(order)).toThrow(/tiền mặt/);
      membershipService.cancelPendingOrder(newMember, order.invoice.id);
    }
    expect(
      membershipService
        .getMemberSubscriptions(newMember)
        .filter((s) => getSubscriptionStatus(s) === "ACTIVE"),
    ).toHaveLength(0);
  });

  it("prorates unused days, grants a full year, and replaces old access only after payment", () => {
    const old = membershipService.getMemberSubscriptions(member)[0];
    vi.setSystemTime(new Date(2026, 9, 10, 12));
    const order = cashOrder(member, "pkg_yearly");
    expect(order.invoice.kind).toBe("UPGRADE");
    expect(order.invoice.remainingDays).toBe(14);
    expect(order.invoice.previousPeriodDays).toBe(30);
    expect(order.invoice.creditAmount).toBe(210000);
    expect(order.invoice.amount).toBe(3990000);
    expect(order.invoice.endDate).toBe("2027-10-09");
    expect(
      getSubscriptionStatus(
        membershipService
          .getMemberSubscriptions(member)
          .find((s) => s.id === old.id)!,
      ),
    ).toBe("ACTIVE");
    const result = pay(order);
    expect(result.subscription.startDate).toBe("2026-10-10");
    expect(result.subscription.endDate).toBe("2027-10-09");
    expect(result.invoice.amount).toBe(3990000);
    const subs = membershipService.getMemberSubscriptions(member);
    expect(
      subs.filter((s) => getSubscriptionStatus(s) === "ACTIVE"),
    ).toHaveLength(1);
    expect(getSubscriptionStatus(subs.find((s) => s.id === old.id)!)).toBe(
      "REPLACED",
    );
    expect(
      membershipService.listInvoices(member).find((i) => i.id === old.invoiceId)
        ?.endDate,
    ).toBe(old.endDate);
  });

  it("can upgrade on the first day without creating an invalid historical date range", () => {
    const upgraded = pay(cashOrder(member, "pkg_yearly"));
    expect(getSubscriptionStatus(upgraded.subscription)).toBe("ACTIVE");
    expect(
      membershipService
        .getMemberSubscriptions(member)
        .every((s) => s.startDate <= s.endDate),
    ).toBe(true);
  });

  it("rejects yesterday's quote without collecting money and recalculates after cancellation", () => {
    const order = cashOrder(member, "pkg_yearly");
    const before = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    vi.setSystemTime(new Date(2026, 8, 25, 12));
    expect(() => pay(order)).toThrow(/Báo giá nâng gói đã cũ/);
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe(before);
    membershipService.cancelPendingOrder(member, order.invoice.id);
    const next = cashOrder(member, "pkg_yearly");
    expect(next.invoice.creditAmount).toBe(435000);
    expect(next.invoice.amount).toBe(3765000);
    expect(pay(next).subscription.endDate).toBe("2027-09-24");
  });

  it("credits the last usable day and uses the purchased price after catalog edits", () => {
    const pkg = membershipService.listPackages(manager).find(p => p.id === "pkg_monthly")!;
    membershipService.savePackage(manager, { ...pkg, price: 600000 }, pkg.id);
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    const order = cashOrder(member, "pkg_yearly");
    expect(order.invoice.remainingDays).toBe(1);
    expect(order.invoice.creditAmount).toBe(15000);
    expect(order.invoice.amount).toBe(4185000);
    expect(pay(order).subscription.endDate).toBe("2027-10-22");
  });

  it("uses actual leap-year days and rounds the quarterly credit only once", () => {
    vi.setSystemTime(new Date(2024, 0, 31, 12));
    const quarter = pay(cashOrder(newMember, "pkg_quarterly"));
    expect(quarter.subscription.endDate).toBe("2024-04-29");
    vi.setSystemTime(new Date(2024, 1, 29, 12));
    const order = cashOrder(newMember, "pkg_yearly");
    expect(order.invoice.previousPeriodDays).toBe(90);
    expect(order.invoice.remainingDays).toBe(61);
    expect(order.invoice.creditAmount).toBe(813333);
    expect(order.invoice.amount).toBe(3386667);
    expect(pay(order).subscription.endDate).toBe("2025-02-27");
  });

  it("carries credited value into a subsequent upgrade without double granting access", () => {
    pay(cashOrder(member, "pkg_quarterly"));
    const yearly = cashOrder(member, "pkg_yearly");
    expect(yearly.invoice.creditAmount).toBe(1200000);
    expect(yearly.invoice.amount).toBe(3000000);
    pay(yearly);
    expect(membershipService.getMemberSubscriptions(member).filter(s => getSubscriptionStatus(s) === "ACTIVE")).toHaveLength(1);
  });

  it("preserves legacy paid history, removes ranks and refuses old pending upgrade prices", () => {
    const order = cashOrder(member, "pkg_yearly");
    const state = JSON.parse(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)!);
    state.version = 2;
    state.packages[2].tier = "PREMIUM";
    state.packages[2].name = "Gói Năm Premium";
    const oldInvoice = state.invoices.find((i: { id: string }) => i.id === order.invoice.id);
    delete oldInvoice.creditAmount;
    oldInvoice.amount = 3750000;
    const history = state.invoices.find((i: { id: string }) => i.id === "inv_demo_01");
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(state));
    const migrated = membershipService.listPackages(manager);
    expect(migrated.find(p => p.id === "pkg_yearly")?.name).toBe("Gói Năm Mở rộng");
    expect(migrated.every(p => !("tier" in p))).toBe(true);
    expect(membershipService.listInvoices(member).find(i => i.id === history.id)).toEqual(history);
    expect(() => pay(order)).toThrow(/Báo giá nâng gói đã cũ/);
    membershipService.cancelPendingOrder(member, order.invoice.id);
    expect(cashOrder(member, "pkg_yearly").invoice.creditAmount).toBe(450000);
  });

  it("schedules downgrade for after the active period and activates automatically by date", () => {
    const upgraded = pay(cashOrder(member, "pkg_yearly"));
    const downgrade = cashOrder();
    expect(downgrade.invoice.kind).toBe("DOWNGRADE");
    expect(downgrade.invoice.startDate).toBe("2027-09-24");
    const paid = pay(downgrade);
    expect(getSubscriptionStatus(paid.subscription)).toBe(
      "SCHEDULED_DOWNGRADE",
    );
    expect(getSubscriptionStatus(upgraded.subscription)).toBe("ACTIVE");
    vi.setSystemTime(new Date(2027, 8, 24, 12));
    expect(getSubscriptionStatus(paid.subscription)).toBe("ACTIVE");
    expect(getSubscriptionStatus(upgraded.subscription)).toBe("EXPIRED");
  });

  it("queues a higher priced package after prepaid future periods and keeps dates intact", () => {
    const renewal = pay(cashOrder());
    const yearly = pay(cashOrder(member, "pkg_yearly"));
    expect(yearly.invoice.kind).toBe("RENEW");
    expect(yearly.invoice.amount).toBe(4200000);
    expect(
      membershipService
        .getMemberSubscriptions(member)
        .find((s) => s.id === renewal.subscription.id),
    ).toEqual(renewal.subscription);
    const downgrade = cashOrder();
    expect(downgrade.subscription.startDate).toBe("2027-11-24");
    pay(downgrade);
    vi.setSystemTime(new Date(2026, 9, 24, 12));
    expect(
      membershipService
        .getMemberSubscriptions(member)
        .filter((s) => getSubscriptionStatus(s) === "ACTIVE"),
    ).toHaveLength(1);
  });

  it("does not grant access to an unpaid scheduled downgrade when the start day arrives", () => {
    pay(cashOrder(member, "pkg_yearly"));
    const order = cashOrder();
    vi.setSystemTime(new Date(2026, 9, 24, 12));
    expect(
      getSubscriptionStatus(
        membershipService
          .getMemberSubscriptions(member)
          .find((s) => s.id === order.subscription.id)!,
      ),
    ).toBe("PENDING_PAYMENT");
  });

  it("rejects expired upgrade quotes and permits canceling/recreating instead", () => {
    const order = cashOrder(member, "pkg_yearly");
    vi.setSystemTime(new Date(2026, 10, 1, 12));
    expect(() => pay(order)).toThrow(/không còn hiệu lực/);
    membershipService.cancelPendingOrder(member, order.invoice.id);
    const replacement = cashOrder(member, "pkg_yearly");
    expect(replacement.invoice.amount).toBe(4200000);
    expect(replacement.invoice.kind).toBe("RENEW");
  });

  it("starts late paid registration on collection day without consuming pending days", () => {
    const order = cashOrder(newMember);
    vi.setSystemTime(new Date(2026, 10, 1, 12));
    const result = pay(order);
    expect(result.subscription.startDate).toBe("2026-11-01");
    expect(result.subscription.endDate).toBe("2026-11-30");
    expect(result.invoice.startDate).toBe(result.subscription.startDate);
  });

  it("uses the quoted full price even if the package changes before collection", () => {
    const order = cashOrder(member, "pkg_yearly");
    const pkg = membershipService
      .listPackages(manager)
      .find((p) => p.id === "pkg_yearly")!;
    membershipService.savePackage(manager, { ...pkg, price: 1200000 }, pkg.id);
    expect(pay(order).invoice.amount).toBe(3750000);
  });

  it("rolls back all payment/access changes if storage fails", () => {
    const order = cashOrder(member, "pkg_yearly");
    const before = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(() => pay(order)).toThrow(/Không thể lưu/);
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe(before);
  });

  it("restricts cancellation to own pending requests or staff and never cancels a paid receipt", () => {
    const order = cashOrder(newMember);
    expect(() =>
      membershipService.cancelPendingOrder(member, order.invoice.id),
    ).toThrow(/của mình/);
    expect(() =>
      membershipService.cancelPendingOrder(coach, order.invoice.id),
    ).toThrow(/không có quyền/);
    membershipService.cancelPendingOrder(newMember, order.invoice.id);
    expect(() => pay(order)).toThrow(/không còn chờ/);
    const next = pay(cashOrder(newMember));
    expect(() =>
      membershipService.cancelPendingOrder(receptionist, next.invoice.id),
    ).toThrow(/chưa thanh toán/);
  });

  it("migrates legacy pending data without discarding snapshots or adding seeded packages", () => {
    cashOrder(newMember);
    const state = JSON.parse(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)!);
    state.version = 1;
    for (const p of state.packages) delete p.tier;
    for (const item of [...state.subscriptions, ...state.invoices]) {
      delete item.tier;
      delete item.packagePrice;
      if (item.status === "PENDING_PAYMENT") item.status = "PENDING";
    }
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(state));
    const invoices = membershipService.listInvoices(newMember);
    expect(invoices[0].status).toBe("PENDING_PAYMENT");
    expect("tier" in invoices[0]).toBe(false);
    expect(invoices[0].packagePrice).toBe(invoices[0].amount);
    expect(membershipService.listPackages(manager)).toHaveLength(
      state.packages.length,
    );
    pay({
      invoice: invoices[0],
      subscription: membershipService.getMemberSubscriptions(newMember)[0],
    });
    expect(
      JSON.parse(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)!).version,
    ).toBe(3);
  });
});

describe("new counter member with mandatory package", () => {
  const input = () => ({
    fullName: "Nguyễn Tại Quầy",
    username: "counter_new",
    email: "counter@example.com",
    phone: "0901234567",
    password: "Counter@123",
    packageId: "pkg_monthly",
    paymentMethod: "CASH" as const,
    expectedPrice: 450000,
  });

  it("creates member + pending order without replacing the staff session or exposing password hash", async () => {
    vi.useRealTimers();
    localStorage.setItem("scms_auth_token", "keep-staff-session");
    const result = await membershipService.registerMemberAtCounter(
      receptionist,
      input(),
    );
    expect(result.member.role).toBe("MEMBER");
    expect("passwordHash" in result.member).toBe(false);
    expect(mockDb.findByEmail(input().email)?.passwordHash).not.toBe(
      input().password,
    );
    expect(result.order.invoice.memberId).toBe(result.member.id);
    expect(result.order.invoice.status).toBe("PENDING_PAYMENT");
    expect(localStorage.getItem("scms_auth_token")).toBe("keep-staff-session");
    expect(getSubscriptionStatus(pay(result.order).subscription)).toBe(
      "ACTIVE",
    );
  });

  it("requires an active selected package and rejects duplicate email/username", async () => {
    vi.useRealTimers();
    await expect(
      membershipService.registerMemberAtCounter(receptionist, {
        ...input(),
        packageId: "",
      }),
    ).rejects.toThrow(/Bắt buộc/);
    await expect(
      membershipService.registerMemberAtCounter(receptionist, {
        ...input(),
        email: member.email,
      }),
    ).rejects.toThrow(/Email/);
    await expect(
      membershipService.registerMemberAtCounter(receptionist, {
        ...input(),
        username: member.username,
      }),
    ).rejects.toThrow(/Tên đăng nhập/);
    membershipService.setPackageVisibility(manager, "pkg_monthly", false);
    await expect(
      membershipService.registerMemberAtCounter(receptionist, input()),
    ).rejects.toThrow(/không mở/);
    expect(mockDb.findByEmail(input().email)).toBeUndefined();
  });

  it("rejects non-staff, invalid personal fields and changed quoted prices without creating a member", async () => {
    vi.useRealTimers();
    await expect(
      membershipService.registerMemberAtCounter(member, input()),
    ).rejects.toThrow(/không có quyền/);
    for (const overrides of [
      { phone: "123" },
      { email: "invalid" },
      { fullName: "a" },
      { username: "a" },
      { password: "short" },
      { expectedPrice: 1 },
    ]) {
      await expect(
        membershipService.registerMemberAtCounter(receptionist, {
          ...input(),
          ...overrides,
        }),
      ).rejects.toThrow();
    }
    expect(mockDb.findByEmail(input().email)).toBeUndefined();
  });

  it("removes the new account if the order write fails", async () => {
    vi.useRealTimers();
    membershipService.listPackages(manager);
    const usersBefore = localStorage.getItem("scms_users_database");
    const membershipsBefore = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    const original = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === MEMBERSHIP_STORAGE_KEY) throw new Error("Quota");
      original(key, value);
    });
    await expect(
      membershipService.registerMemberAtCounter(receptionist, input()),
    ).rejects.toThrow(/Không thể lưu/);
    expect(localStorage.getItem("scms_users_database")).toBe(usersBefore);
    expect(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)).toBe(
      membershipsBefore,
    );
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
