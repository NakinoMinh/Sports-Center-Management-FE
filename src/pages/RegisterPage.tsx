import React, { useState } from "react";
import {
  User as UserIcon,
  Mail,
  Lock,
  CheckCheck,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { InputField } from "../components/common/InputField";
import { AlertBadge } from "../components/common/AlertBadge";
import { authService } from "../services/authService";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}
type Fields =
  "username" | "email" | "fullName" | "password" | "confirmPassword";

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSwitchToLogin,
}) => {
  const { register } = useAuth();
  const [form, setForm] = useState<Record<Fields, string>>({
    username: "",
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const update = (field: Fields, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setGeneralError("");
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    const next: Partial<Record<Fields, string>> = {};
    if (form.username.trim().length < 3)
      next.username = "Tên đăng nhập phải có ít nhất 3 ký tự.";
    if (!authService.isValidEmail(form.email))
      next.email = "Vui lòng nhập email hợp lệ.";
    if (form.password.length < 8)
      next.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    if (new TextEncoder().encode(form.password).length > 72)
      next.password = "Mật khẩu quá dài (tối đa 72 byte).";
    if (!form.confirmPassword || form.password !== form.confirmPassword)
      next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setGeneralError("");
    setIsLoading(true);
    try {
      const response = await register(form);
      if (!response.success) setGeneralError(response.message);
    } catch {
      setGeneralError(
        "Chưa thể tạo tài khoản. Vui lòng kiểm tra quyền lưu trữ của trình duyệt và thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="scms-register-wrapper">
      <div className="scms-form-title-group">
        <h2 className="scms-form-title">Bắt đầu hành trình của bạn</h2>
        <p className="scms-form-desc">
          Tạo tài khoản học viên tại Titan Arena. Tài khoản nhân sự do trung tâm
          quản lý.
        </p>
      </div>
      {generalError && <AlertBadge type="error" message={generalError} />}
      <form
        onSubmit={handleSubmit}
        className="scms-form"
        noValidate
        aria-busy={isLoading}
      >
        <InputField
          label="Tên đăng nhập"
          name="username"
          placeholder="vd: tuan_fitness"
          value={form.username}
          onChange={(event) => update("username", event.target.value)}
          icon={<UserIcon size={18} />}
          error={errors.username}
          required
          autoComplete="username"
          disabled={isLoading}
          helperText="Ít nhất 3 ký tự."
        />
        <InputField
          label="Địa chỉ email"
          name="email"
          type="email"
          placeholder="ban@example.com"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          icon={<Mail size={18} />}
          error={errors.email}
          required
          autoComplete="email"
          disabled={isLoading}
          helperText="Dùng email này để đăng nhập."
        />
        <InputField
          label="Họ và tên (tùy chọn)"
          name="fullName"
          placeholder="vd: Nguyễn Anh Tuấn"
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          icon={<UserIcon size={18} />}
          autoComplete="name"
          disabled={isLoading}
        />
        <InputField
          label="Mật khẩu"
          name="password"
          type="password"
          placeholder="Ít nhất 8 ký tự"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          icon={<Lock size={18} />}
          error={errors.password}
          required
          autoComplete="new-password"
          disabled={isLoading}
        />
        <InputField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          icon={<CheckCheck size={18} />}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
          disabled={isLoading}
        />
        <button type="submit" className="scms-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <span className="scms-spinner-row">
              <span className="scms-spinner" /> Đang tạo tài khoản...
            </span>
          ) : (
            <>
              <UserPlus size={18} /> Tạo tài khoản học viên
            </>
          )}
        </button>
      </form>
      <div className="scms-switch-prompt">
        <span>Bạn đã có tài khoản?</span>
        <button
          type="button"
          className="scms-switch-link"
          onClick={onSwitchToLogin}
          disabled={isLoading}
        >
          <ArrowLeft size={14} /> Đăng nhập
        </button>
      </div>
    </div>
  );
};
