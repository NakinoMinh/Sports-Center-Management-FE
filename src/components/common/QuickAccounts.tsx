import React from "react";
import { Crown, Dumbbell, User as UserIcon, Headphones } from "lucide-react";
import type { UserRole } from "../../types/auth";

interface QuickAccountItem {
  role: UserRole;
  roleTitle: string;
  name: string;
  email: string;
  badgeClass: string;
  icon: React.ReactNode;
}

interface QuickAccountsProps {
  onSelectAccount: (email: string, password: string) => void;
  disabled?: boolean;
}

export const QuickAccounts: React.FC<QuickAccountsProps> = ({
  onSelectAccount,
  disabled = false,
}) => {
  const accounts: QuickAccountItem[] = [
    {
      role: "CENTER_MANAGER",
      roleTitle: "Quản Lý Trung Tâm",
      name: "Nguyễn Văn Quản Lý",
      email: "manager@sportscenter.com",
      badgeClass: "badge-manager",
      icon: <Crown size={14} />,
    },
    {
      role: "COACH",
      roleTitle: "Huấn Luyện Viên",
      name: "Trần HLV",
      email: "coach@sportscenter.com",
      badgeClass: "badge-coach",
      icon: <Dumbbell size={14} />,
    },
    {
      role: "MEMBER",
      roleTitle: "Học Viên / Thành Viên",
      name: "Lê Thành Viên",
      email: "member@sportscenter.com",
      badgeClass: "badge-member",
      icon: <UserIcon size={14} />,
    },
    {
      role: "RECEPTIONIST",
      roleTitle: "Lễ Tân",
      name: "Phạm Lễ Tân",
      email: "receptionist@sportscenter.com",
      badgeClass: "badge-receptionist",
      icon: <Headphones size={14} />,
    },
  ];

  return (
    <div className="scms-quick-accounts">
      <div className="scms-quick-header">
        <span className="scms-quick-title">
          Tài khoản dùng thử theo vai trò
        </span>
        <span className="scms-quick-sub">
          Mật khẩu mặc định: <code>Pass@1234</code>
        </span>
      </div>

      <div className="scms-quick-grid">
        {accounts.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="scms-quick-btn"
            onClick={() => onSelectAccount(acc.email, "Pass@1234")}
            disabled={disabled}
            title={`Điền thông tin ${acc.roleTitle}`}
          >
            <div className="scms-quick-btn-top">
              <span className={`scms-role-tag ${acc.badgeClass}`}>
                {acc.icon}
                {acc.roleTitle}
              </span>
            </div>
            <span className="scms-quick-name">{acc.name}</span>
            <span className="scms-quick-email">{acc.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
