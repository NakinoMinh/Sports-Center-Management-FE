import type { User, UserRole } from "../types/auth";
import { mockDb } from "./mockDb";

export const accessRules = {
  members: ["CENTER_MANAGER"],
  packages: ["CENTER_MANAGER"],
  permissions: ["CENTER_MANAGER"],
  membership: ["MEMBER", "CENTER_MANAGER"],
  counter: ["RECEPTIONIST", "CENTER_MANAGER"],
  payments: ["RECEPTIONIST", "CENTER_MANAGER"],
  coach: ["COACH", "CENTER_MANAGER"],
} satisfies Record<string, UserRole[]>;
export function accountEnabled(
  user: Pick<User, "isActive" | "deletedAt" | "isLocked">,
) {
  return user.isActive !== false && !user.deletedAt && !user.isLocked;
}
/** Local adapter guard; the official API must enforce equivalent policies server-side. */
export function authorizeRoles(
  actor: Pick<User, "id" | "role"> & Partial<Pick<User, "isActive" | "deletedAt" | "isLocked">>,
  roles: readonly UserRole[],
) {
  if (!actor || !roles.includes(actor.role)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  const user = mockDb.getUsers().find((item) => item.id === actor?.id);
  if (user) {
    if (
      !accountEnabled(user) ||
      user.role !== actor.role ||
      !roles.includes(user.role)
    )
      throw new Error("Bạn không có quyền thực hiện thao tác này.");
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
  if (!accountEnabled(actor as Pick<User, "isActive" | "deletedAt" | "isLocked">)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return actor as Omit<User, "passwordHash">;
}
