import { accessRules } from "../services/accessControl";
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
    COACH: "/coach/my-schedule",
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
  | "bell"
  | "support";

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
  /** Roles that may see the link. Omitted means every signed-in role. */
  roles?: readonly UserRole[];
  /** Optional feature key bound to dynamic accessRules. */
  featureKey?: keyof typeof accessRules;
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
const MEMBER: readonly UserRole[] = ["MEMBER"];
const MEMBER_COACH: readonly UserRole[] = ["MEMBER", "COACH"];
const INVOICE_ROLES: readonly UserRole[] = [
  "MEMBER",
  "RECEPTIONIST",
  "CENTER_MANAGER",
];

/**
 * Single source of truth for the sidebar and the breadcrumb.
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
      {
        to: "/notifications",
        label: "Thông báo",
        icon: "bell",
        roles: MEMBER_COACH,
        featureKey: "notifications",
        trail: ["Thông báo", "Cập nhật lớp học"],
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
        to: "/member/training",
        label: "Kế hoạch & Điểm danh",
        icon: "check",
        roles: ["MEMBER"],
        featureKey: "memberClasses",
        trail: ["Thành viên", "Kế hoạch & Điểm danh"],
      },
      {
        to: "/manager/members",
        label: "Danh sách thành viên",
        icon: "users",
        roles: MANAGER,
        featureKey: "members",
        trail: ["Thành viên", "Danh sách"],
      },
    ],
  },

  {
    title: "Lớp học",
    items: [
      {
        to: "/coach/my-schedule",
        label: "Lịch dạy của tôi",
        icon: "calendar",
        roles: ["COACH"],
        trail: ["Lớp học", "Lịch dạy của tôi"],
      },
      {
        to: "/training/coach",
        label: "Giáo án & Kết quả tập",
        icon: "whistle",
        roles: ["COACH"],
        trail: ["Lớp học", "Giáo án & Kết quả tập"],
      },
      {
        to: "/manager/sports",
        label: "Bộ môn",
        icon: "layers",
        roles: MANAGER,
        featureKey: "sports",
        trail: ["Lớp học", "Bộ môn"],
      },
      {
        to: "/manager/classes",
        label: "Danh mục lớp",
        icon: "badge",
        roles: MANAGER,
        featureKey: "classes",
        trail: ["Lớp học", "Danh mục lớp"],
      },
      {
        to: "/manager/class-schedule",
        label: "Lịch học",
        icon: "calendar",
        roles: MANAGER,
        featureKey: "classes",
        trail: ["Lớp học", "Lịch học"],
      },
      {
        to: "/manager/center-schedule",
        label: "Lịch trung tâm",
        icon: "calendar",
        roles: MANAGER,
        trail: ["Lớp học", "Lịch trung tâm"],
      },
      {
        to: "/member/classes",
        label: "Khám phá lớp",
        icon: "compass",
        roles: MEMBER,
        featureKey: "memberClasses",
        trail: ["Lớp học", "Khám phá lớp"],
      },
      {
        to: "/member/class-schedule",
        label: "Lịch của tôi",
        icon: "calendar",
        roles: MEMBER,
        featureKey: "memberClasses",
        trail: ["Lớp học", "Lịch của tôi"],
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
        featureKey: "classes",
        trail: ["Nhân sự", "Huấn luyện viên"],
      },
      {
        to: "/manager/assign-coach",
        label: "Phân công HLV",
        icon: "calendar",
        roles: MANAGER,
        featureKey: "classes",
        trail: ["Nhân sự", "Phân công HLV"],
      },
      {
        to: "/manager/staff",
        label: "Nhân viên lễ tân",
        icon: "badge",
        roles: MANAGER,
        featureKey: "classes",
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
        featureKey: "counter",
        trail: ["Quầy lễ tân", "Đăng ký & gia hạn"],
      },
      {
        to: "/receptionist/membership-status",
        label: "Kiểm tra gói tập",
        icon: "check",
        roles: COUNTER,
        featureKey: "counter",
        trail: ["Quầy lễ tân", "Kiểm tra gói tập"],
      },
      {
        to: "/receptionist/attendance",
        label: "Điểm danh",
        icon: "check",
        roles: COUNTER,
        featureKey: "counter",
        trail: ["Quầy lễ tân", "Điểm danh"],
      },
      {
        to: "/receptionist/classes",
        label: "Đăng ký lớp học",
        icon: "calendar",
        roles: ["RECEPTIONIST"],
        trail: ["Quầy lễ tân", "Đăng ký lớp học"],
      },
      {
        to: "/receptionist/class-schedule",
        label: "Lịch trung tâm",
        icon: "calendar",
        roles: ["RECEPTIONIST"],
        trail: ["Quầy lễ tân", "Lịch trung tâm"],
      },
      {
        to: "/receptionist/support",
        label: "Yêu cầu hỗ trợ",
        icon: "support",
        roles: COUNTER,
        featureKey: "counter",
        trail: ["Quầy lễ tân", "Yêu cầu hỗ trợ"],
      },
    ],
  },
  {
    title: "Cơ sở vật chất",
    items: [
      {
        to: "/manager/rooms",
        label: "Quản lý phòng tập",
        icon: "layers",
        roles: MANAGER,
        featureKey: "classes",
        trail: ["Cơ sở vật chất", "Quản lý phòng tập"],
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
        featureKey: "packages",
        trail: ["Tài chính", "Gói & học phí"],
      },
      {
        to: "/manager/package-sports",
        label: "Quyền bộ môn của gói",
        icon: "shield",
        roles: MANAGER,
        featureKey: "packages",
        trail: ["Tài chính", "Quyền bộ môn của gói"],
      },
      {
        to: "/payments/cash",
        label: "Xác nhận tiền mặt",
        icon: "cash",
        roles: COUNTER,
        featureKey: "payments",
        trail: ["Tài chính", "Xác nhận tiền mặt"],
      },
      {
        to: "/invoices",
        label: "Hóa đơn & Biên nhận",
        icon: "history",
        roles: INVOICE_ROLES,
        featureKey: "invoices",
        trail: ["Tài chính", "Hóa đơn & Biên nhận"],
      },
      {
        to: "/manager/reports",
        label: "Báo cáo tổng hợp",
        icon: "layers",
        roles: MANAGER,
        featureKey: "reports",
        trail: ["Tài chính", "Báo cáo tổng hợp"],
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
        featureKey: "permissions",
        trail: ["Hệ thống", "Phân quyền"],
      },
      {
        to: "/manager/audit-log",
        label: "Lịch sử thao tác",
        icon: "history",
        roles: MANAGER,
        featureKey: "permissions",
        trail: ["Hệ thống", "Lịch sử thao tác"],
      },
    ],
  },
];

const visibleTo = (item: NavItem, role: UserRole): boolean => {
  if (item.featureKey && item.featureKey in accessRules) {
    return (accessRules[item.featureKey] as readonly UserRole[]).includes(role);
  }
  return item.roles === undefined || item.roles.includes(role);
};

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
