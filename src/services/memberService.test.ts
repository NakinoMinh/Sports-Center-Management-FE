import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { memberService, validateBirthDate } from "./memberService";
import { authorizeRoles, accessRules } from "./accessControl";
import { mockDb } from "./mockDb";
import { authService } from "./authService";
import { membershipService } from "./membershipService";
import { receptionService } from "./receptionService";
import type { MembershipActor } from "../types/membership";

let manager: MembershipActor;
let member: MembershipActor;
let receptionist: MembershipActor;
const input = {
  fullName: "Nguyễn An",
  email: "an@example.com",
  phone: "0901234567",
  dateOfBirth: "2000-02-29",
  isActive: true,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 28, 10));
  const storage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  };
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
  const users = mockDb.getUsers();
  manager = users.find((user) => user.role === "CENTER_MANAGER")!;
  member = users.find((user) => user.role === "MEMBER")!;
  receptionist = users.find((user) => user.role === "RECEPTIONIST")!;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("UC5 and UC6 member management", () => {
  it("enforces roles and rejects spoofed, locked and inactive actors", () => {
    expect(() => memberService.list(member)).toThrow("quyền");
    expect(() => memberService.list(receptionist)).toThrow("quyền");
    expect(() =>
      memberService.list({ ...member, role: "CENTER_MANAGER" }),
    ).toThrow("quyền");
    mockDb.updateUser({
      ...mockDb.getUsers().find((user) => user.id === manager.id)!,
      isActive: false,
    });
    expect(() => authorizeRoles(manager, accessRules.members)).toThrow("quyền");
  });
  it("creates with generated credentials, updates, deactivates and retains history on deletion", async () => {
    const created = await memberService.create(manager, input);
    expect(created.member).not.toHaveProperty("passwordHash");
    expect(
      await bcrypt.compare(
        created.initialPassword,
        mockDb.findByEmail(input.email)!.passwordHash,
      ),
    ).toBe(true);
    memberService.update(manager, created.member.id, {
      ...input,
      fullName: "Nguyễn An mới",
      isActive: false,
    });
    expect(memberService.list(manager, "nguyen an moi", "INACTIVE").total).toBe(
      1,
    );
    expect(
      (
        await authService.login({
          email: input.email,
          password: created.initialPassword,
        })
      ).success,
    ).toBe(false);
    memberService.remove(manager, created.member.id);
    expect(memberService.list(manager, "an@example.com").total).toBe(0);
    expect(mockDb.findByEmail(input.email)?.deletedAt).toBeTruthy();
    await expect(memberService.create(manager, input)).rejects.toThrow("Email");
  });
  it("pages twenty members at a time and searches names, email and phone", () => {
    const users = mockDb.getUsers();
    const seed = users.find((user) => user.id === member.id)!;
    mockDb.saveUsers([
      ...users,
      ...Array.from({ length: 40 }, (_, i) => ({
        ...seed,
        id: `extra_${i}`,
        email: `extra${i}@example.com`,
        username: `extra${i}`,
        fullName: `Khách ${i}`,
        phone: `09000000${String(i).padStart(2, "0")}`,
        isActive: i % 2 === 0,
      })),
    ]);
    expect(memberService.list(manager).items).toHaveLength(20);
    expect(memberService.list(manager, "", "ALL", 2).items).toHaveLength(20);
    expect(memberService.list(manager, "", "ALL", 3).items).toHaveLength(1);
    expect(memberService.list(manager, "", "ALL", 99).page).toBe(3);
    expect(memberService.list(manager, "0900000039").items[0].id).toBe(
      "extra_39",
    );
    expect(memberService.list(manager, "KHACH", "INACTIVE").total).toBe(20);
  });
  it("revokes an existing session and blocks downstream operations after deactivation", async () => {
    const verification = await authService.requestEmailVerification({
      email: member.email,
      password: "Pass@1234",
      purpose: "LOGIN",
    });
    const result = await authService.login({
      email: member.email,
      password: "Pass@1234",
      emailVerificationCode: verification.demoCode,
    });
    expect(result.success).toBe(true);
    memberService.update(manager, member.id, {
      ...input,
      email: member.email,
      isActive: false,
    });
    expect(authService.verifyJWT(result.token!).valid).toBe(false);
    expect(() =>
      membershipService.createMembershipOrder(receptionist, {
        memberId: member.id,
        packageId: "pkg_monthly",
        paymentMethod: "CASH",
        kind: "RENEW",
      }),
    ).toThrow("ngừng hoạt động");
    expect(() => receptionService.checkIn(receptionist, member.id)).toThrow(
      "ngừng hoạt động",
    );
  });
  it("validates date boundaries and profile fields", async () => {
    expect(() => validateBirthDate("2026-02-30")).toThrow();
    expect(() => validateBirthDate("2027-01-01")).toThrow();
    expect(() => validateBirthDate("2000-02-29")).not.toThrow();
    await expect(
      memberService.create(manager, { ...input, phone: "123" }),
    ).rejects.toThrow("10 chữ số");
    await expect(
      memberService.create(manager, { ...input, email: member.email }),
    ).rejects.toThrow("Email");
  });
});
describe("UC13 generated counter registration", () => {
  it("stores birth date, generates a hashed password and creates only a pending membership", async () => {
    const result =
      await membershipService.registerMemberWithGeneratedCredentials(
        receptionist,
        {
          ...input,
          packageId: "pkg_monthly",
          expectedPrice: 450000,
          paymentMethod: "CASH",
        },
      );
    expect(result.member.dateOfBirth).toBe("2000-02-29");
    expect(result.order.invoice.status).toBe("PENDING_PAYMENT");
    expect(result.emailDelivery).toBe("NOT_CONNECTED");
    expect(
      await bcrypt.compare(
        result.initialPassword,
        mockDb.findByEmail(input.email)!.passwordHash,
      ),
    ).toBe(true);
    expect(localStorage.getItem("scms_users_database")).not.toContain(
      result.initialPassword,
    );
    expect(localStorage.getItem("scms_memberships_v1")).not.toContain(
      result.initialPassword,
    );
  });
  it("does not create a member on invalid birth date or missing package", async () => {
    await expect(
      membershipService.registerMemberWithGeneratedCredentials(receptionist, {
        ...input,
        dateOfBirth: "",
        packageId: "pkg_monthly",
        expectedPrice: 450000,
        paymentMethod: "CASH",
      }),
    ).rejects.toThrow("ngày sinh");
    expect(mockDb.findByEmail(input.email)).toBeUndefined();
    await expect(
      membershipService.registerMemberWithGeneratedCredentials(receptionist, {
        ...input,
        packageId: "",
        expectedPrice: 450000,
        paymentMethod: "CASH",
      }),
    ).rejects.toThrow("chọn gói");
    expect(mockDb.findByEmail(input.email)).toBeUndefined();
  });
});
