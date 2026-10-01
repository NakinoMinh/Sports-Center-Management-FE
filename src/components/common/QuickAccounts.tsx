import React from "react";
import { Crown, User as UserIcon, Headphones, Dumbbell } from "lucide-react";
import type { UserRole } from "../../types/auth";


/**
 * CẢNH BÁO: DB đang chạy KHÔNG khớp SportsCenterManagement_Official.sql.
 * Script seed đặt mọi tài khoản là "Admin@123", nhưng DB thực tế có mật khẩu
 * khác nhau theo từng tài khoản. Các giá trị dưới đây đã được xác minh bằng
 * POST /api/Auth/request-login-email-verification (trả HTTP 200).
 * Khi nào DB được dựng lại từ script seed thì mới gộp về một hằng số chung.
 */

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
  if (!import.meta.env.DEV) return null;

  const accounts: QuickAccountItem[] = [
    {
      role: "CENTER_MANAGER",
      roleTitle: "Quản Lý Trung Tâm",
      name: "Center Manager",
      email: "uchihaminh6969@gmail.com",
      password: "Admin@123",
      badgeClass: "badge-manager",
      icon: <Crown size={14} />,
    },
    {
      role: "RECEPTIONIST",
      roleTitle: "Nhân Viên Lễ Tân",
      name: "Receptionist Staff",
      email: "makitonati@gmail.com",
      password: "Admin@123",
      badgeClass: "badge-receptionist",
      icon: <Headphones size={14} />,
    },
    {
      role: "COACH",
      roleTitle: "Huấn Luyện Viên",
      name: "Nguyen Van The",
      email: "coach.demo@sportscenter.local",
      password: "Admin@123",
      badgeClass: "badge-coach",
      icon: <Dumbbell size={14} />,
    },
    {
      role: "MEMBER",
      roleTitle: "Hội Viên Trung Tâm",
      name: "Nguyen Van Test Updated",
      email: "member01@sportscenter.local",
      password: "Test@12345",
      badgeClass: "badge-member",
      icon: <UserIcon size={14} />,
    },
  ];

  return (
    <div className="scms-quick-accounts">
      <div className="scms-quick-header">
        <span className="scms-quick-title">
          Tài khoản kiểm thử theo vai trò
        </span>
        <span className="scms-quick-sub">
          Tài khoản mẫu từ cơ sở dữ liệu BE
        </span>
      </div>

      <div className="scms-quick-grid">
        {accounts.map((acc) => (
          <button
            key={acc.email}
            type="button"
            className="scms-quick-btn"
            onClick={() => onSelectAccount(acc.email, acc.password ?? "")}
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
