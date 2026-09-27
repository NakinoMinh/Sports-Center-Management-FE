import type { UserRole } from "../types/auth";

export const roleLabels: Record<UserRole, string> = {
  CENTER_MANAGER: "Quản lý trung tâm",
  MEMBER: "Thành viên",
  RECEPTIONIST: "Nhân viên lễ tân",
  COACH: "Huấn luyện viên",
};

export function homeForRole(role: UserRole) {
  return {
    CENTER_MANAGER: "/manager/packages",
    MEMBER: "/member/membership",
    RECEPTIONIST: "/receptionist/memberships",
    COACH: "/coach",
  }[role];
}
