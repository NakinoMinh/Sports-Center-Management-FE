import React from "react";
import { Crown, Dumbbell, User as UserIcon, Headphones } from "lucide-react";
import type { UserRole } from "../../types/auth";
import { isApiConfigured } from "../../services/apiClient";

interface QuickAccountItem {
  role: UserRole;
  roleTitle: string;
  name: string;
  email: string;
  password?: string;
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
  const isApi = isApiConfigured();
  const accounts: QuickAccountItem[] = isApi
    ? [
        {
          role: "CENTER_MANAGER",
          roleTitle: "Quản Lý Trung Tâm",
          name: "Nguyễn Quản Lý",
          email: "uchihaminh6969@gmail.com",
          password: "Test@12345",
          badgeClass: "badge-manager",
          icon: <Crown size={14} />,
        },
        {
          role: "RECEPTIONIST",
          roleTitle: "Nhân Viên Lễ Tân",
          name: "Nguyễn Thị Lễ Tân",
          email: "receptionist.test@sportscenter.local",
          password: "Test@12345",
          badgeClass: "badge-receptionist",
          icon: <Headphones size={14} />,
        },
        {
          role: "MEMBER",
          roleTitle: "Hội Viên Trung Tâm",
          name: "Lê Thành Viên",
          email: "member01@sportscenter.local",
          password: "Test@12345",
          badgeClass: "badge-member",
          icon: <UserIcon size={14} />,
        },
      ]
    : [
        {
          role: "CENTER_MANAGER",
          roleTitle: "Quản Lý Trung Tâm",
          name: "Nguyễn Văn Quản Lý",
          email: "manager@sportscenter.com",
          password: "Pass@1234",
          badgeClass: "badge-manager",
          icon: <Crown size={14} />,
        },
        {
          role: "COACH",
          roleTitle: "Huấn Luyện Viên",
          name: "Trần HLV",
          email: "coach@sportscenter.com",
          password: "Pass@1234",
          badgeClass: "badge-coach",
          icon: <Dumbbell size={14} />,
        },
        {
          role: "MEMBER",
          roleTitle: "Học Viên / Thành Viên",
          name: "Lê Thành Viên",
          email: "member@sportscenter.com",
          password: "Pass@1234",
          badgeClass: "badge-member",
          icon: <UserIcon size={14} />,
        },
        {
          role: "RECEPTIONIST",
          roleTitle: "Lễ Tân",
          name: "Phạm Lễ Tân",
          email: "receptionist@sportscenter.com",
          password: "Pass@1234",
          badgeClass: "badge-receptionist",
          icon: <Headphones size={14} />,
        },
      ];

  return (
    <div className="scms-quick-accounts">
      <div className="scms-quick-header">
        <span className="scms-quick-title">
          Tài khoản kiểm thử theo vai trò
        </span>
        <span className="scms-quick-sub">
          {isApi ? "Tài khoản mẫu từ cơ sở dữ liệu BE" : <span>Mật khẩu mặc định: <code>Pass@1234</code></span>}
        </span>
      </div>

      <div className="scms-quick-grid">
        {accounts.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="scms-quick-btn"
            onClick={() => onSelectAccount(acc.email, acc.password || "Test@12345")}
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
