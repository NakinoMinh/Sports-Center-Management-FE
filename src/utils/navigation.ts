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

/** Icon name resolved against the lucide set in WorkspaceLayout. */
export type NavIcon =
  | "home"
  | "user"
  | "layers"
  | "compass"
  | "users"
  | "shield"
  | "whistle"
  | "badge"
  | "history"
  | "card"
  | "cash"
  | "check"
  | "calendar"
  | "support";

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
  /** Roles that may see the link. Omitted means every signed-in role. */
  roles?: readonly UserRole[];
  /** Breadcrumb trail shown in the topbar, excluding the workspace root. */
  trail: readonly string[];
}

export interface NavSection {
  /** Section heading, or null for the ungrouped items at the top of the rail. */
  title: string | null;
  items: readonly NavItem[];
}

const MANAGER: readonly UserRole[] = ["CENTER_MANAGER"];
const COUNTER: readonly UserRole[] = ["RECEPTIONIST", "CENTER_MANAGER"];

/**
 * Single source of truth for the sidebar and the breadcrumb.
 *
 * The rail previously rendered fifteen ungrouped links, which overflowed the
 * viewport and pushed the account controls out of reach, while the breadcrumb
 * was hard-coded and disagreed with the page it sat above. Both now read from
 * this table, so a route can only ever be described one way.
 */
export const navSections: readonly NavSection[] = [
  {
    title: null,
    items: [
      { to: "/", label: "Trang chủ", icon: "home", trail: ["Trang chủ"] },
      {
        to: "/profile",
        label: "Hồ sơ cá nhân",
        icon: "user",
        trail: ["Hồ sơ cá nhân"],
      },
      {
        to: "/packages",
        label: "Khám phá gói tập",
        icon: "compass",
        trail: ["Gói tập", "Khám phá & so sánh"],
      },
    ],
  },
  {
    title: "Thành viên",
    items: [
      {
        to: "/member/membership",
        label: "Gói tập của tôi",
        icon: "card",
        roles: ["MEMBER"],
        trail: ["Thành viên", "Gói tập của tôi"],
      },
      {
        to: "/manager/members",
        label: "Danh sách thành viên",
        icon: "users",
        roles: MANAGER,
        trail: ["Thành viên", "Danh sách"],
      },
    ],
  },
  {
    title: "Nhân sự",
    items: [
      {
        to: "/manager/coaches",
        label: "Huấn luyện viên",
        icon: "whistle",
        roles: MANAGER,
        trail: ["Nhân sự", "Huấn luyện viên"],
      },
      {
        to: "/manager/staff",
        label: "Nhân viên lễ tân",
        icon: "badge",
        roles: MANAGER,
        trail: ["Nhân sự", "Nhân viên lễ tân"],
      },
    ],
  },
  {
    title: "Quầy lễ tân",
    items: [
      {
        to: "/receptionist/memberships",
        label: "Đăng ký & gia hạn",
        icon: "card",
        roles: COUNTER,
        trail: ["Quầy lễ tân", "Đăng ký & gia hạn"],
      },
      {
        to: "/receptionist/membership-status",
        label: "Kiểm tra gói tập",
        icon: "check",
        roles: COUNTER,
        trail: ["Quầy lễ tân", "Kiểm tra gói tập"],
      },
      {
        to: "/receptionist/attendance",
        label: "Điểm danh",
        icon: "check",
        roles: COUNTER,
        trail: ["Quầy lễ tân", "Điểm danh"],
      },
      {
        to: "/receptionist/classes",
        label: "Đăng ký lớp học",
        icon: "calendar",
        roles: COUNTER,
        trail: ["Quầy lễ tân", "Đăng ký lớp học"],
      },
      {
        to: "/receptionist/support",
        label: "Yêu cầu hỗ trợ",
        icon: "support",
        roles: COUNTER,
        trail: ["Quầy lễ tân", "Yêu cầu hỗ trợ"],
      },
    ],
  },
  {
    title: "Tài chính",
    items: [
      {
        to: "/manager/packages",
        label: "Gói & học phí",
        icon: "layers",
        roles: MANAGER,
        trail: ["Tài chính", "Gói & học phí"],
      },
      {
        to: "/payments/cash",
        label: "Xác nhận tiền mặt",
        icon: "cash",
        roles: COUNTER,
        trail: ["Tài chính", "Xác nhận tiền mặt"],
      },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      {
        to: "/manager/access",
        label: "Phân quyền",
        icon: "shield",
        roles: MANAGER,
        trail: ["Hệ thống", "Phân quyền"],
      },
      {
        to: "/manager/audit-log",
        label: "Lịch sử thao tác",
        icon: "history",
        roles: MANAGER,
        trail: ["Hệ thống", "Lịch sử thao tác"],
      },
    ],
  },
];

const visibleTo = (item: NavItem, role: UserRole): boolean =>
  item.roles === undefined || item.roles.includes(role);

/** Sections a role can actually see, with empty sections dropped. */
export function navigationFor(role: UserRole): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => visibleTo(item, role)),
    }))
    .filter((section) => section.items.length > 0);
}

const allItems: readonly NavItem[] = navSections.flatMap(
  (section) => section.items,
);

/**
 * Breadcrumb trail for a pathname. Falls back to the longest matching prefix so
 * detail routes stay anchored under their parent section.
 */
export function trailFor(pathname: string): readonly string[] {
  const exact = allItems.find((item) => item.to === pathname);
  if (exact) return exact.trail;

  const prefixed = allItems
    .filter((item) => item.to !== "/" && pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return prefixed ? prefixed.trail : [];
}
