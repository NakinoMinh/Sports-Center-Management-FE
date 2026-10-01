import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  Mail,
  Lock,
  CheckCheck,
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  Send,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { InputField } from "../components/common/InputField";
import { AlertBadge } from "../components/common/AlertBadge";
import { authService } from "../services/authService";
import { isApiConfigured } from "../services/apiClient";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}
type Fields =
  "username" | "email" | "fullName" | "password" | "confirmPassword";

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSwitchToLogin,
}) => {
  const { register } = useAuth();
  const apiMode = isApiConfigured();
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
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const resetVerification = () => {
    setVerificationCode("");
    setVerificationError("");
    setDemoCode("");
    setCountdown(0);
  };
  const update = (field: Fields, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setGeneralError("");
    if (field === "email") resetVerification();
  };
  const sendVerificationCode = async () => {
    if (!authService.isValidEmail(form.email)) {
      setErrors((previous) => ({ ...previous, email: "Vui lòng nhập email hợp lệ." }));
      return;
    }
    setIsLoading(true);
    setGeneralError("");
    const response = await authService.requestEmailVerification({ email: form.email, purpose: "REGISTER" });
    setIsLoading(false);
    if (!response.success) {
      setGeneralError(response.message);
      return;
    }
    setDemoCode(response.demoCode ?? "");
    setCountdown(response.expiresInSeconds ?? 300);
    setVerificationCode("");
    setVerificationError("");
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    const next: Partial<Record<Fields, string>> = {};
    if (!apiMode && form.username.trim().length < 3)
      next.username = "Tên đăng nhập phải có ít nhất 3 ký tự.";
    if (!authService.isValidEmail(form.email))
      next.email = "Vui lòng nhập email hợp lệ.";
    if (form.password.length < 8)
      next.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    if (new TextEncoder().encode(form.password).length > 72)
      next.password = "Mật khẩu quá dài (tối đa 72 byte).";
    if (!form.confirmPassword || form.password !== form.confirmPassword)
      next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    if (!verificationCode.trim())
      setVerificationError("Vui lòng nhập mã xác nhận email.");
    setErrors(next);
    if (Object.keys(next).length || !verificationCode.trim()) return;
    setGeneralError("");
    setIsLoading(true);
    try {
      const response = await register({
        ...form,
        username: form.username.trim() || form.email.split("@")[0],
        emailVerificationCode: verificationCode,
      });
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
        {!apiMode && (
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
        )}
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
        <div className="scms-email-verification">
            <div className="scms-verification-heading">
              <span><ShieldCheck size={17} /> Xác nhận email</span>
              <button type="button" className="scms-send-code-btn" onClick={sendVerificationCode} disabled={isLoading || countdown > 0}>
                <Send size={14} /> {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi mã"}
              </button>
            </div>
            {demoCode && <p className="scms-demo-code" role="status">Mã xác nhận demo: <strong>{demoCode}</strong></p>}
            <InputField
              label="Mã xác nhận gồm 6 chữ số"
              name="emailVerificationCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Nhập mã đã gửi đến email"
              value={verificationCode}
              onChange={(event) => {
                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setVerificationError("");
                setGeneralError("");
              }}
              icon={<ShieldCheck size={18} />}
              error={verificationError}
              required
              disabled={isLoading || countdown <= 0}
            />
          </div>
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
