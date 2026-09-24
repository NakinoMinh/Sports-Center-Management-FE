import React, { useState } from "react";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { InputField } from "../components/common/InputField";
import { AlertBadge } from "../components/common/AlertBadge";
import { QuickAccounts } from "../components/common/QuickAccounts";
import { authService } from "../services/authService";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, sessionMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttemptsRemaining, setFailedAttemptsRemaining] =
    useState<number>();
  const [isLocked, setIsLocked] = useState(false);

  const clearError = () => {
    setGeneralError("");
    setIsLocked(false);
    setFailedAttemptsRemaining(undefined);
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;
    const invalidEmail = !authService.isValidEmail(email);
    setEmailError(invalidEmail ? "Vui lòng nhập địa chỉ email hợp lệ." : "");
    setPasswordError(!password ? "Vui lòng nhập mật khẩu." : "");
    if (invalidEmail || !password) return;
    setIsLoading(true);
    clearError();
    try {
      const result = await login({ email: email.trim(), password, rememberMe });
      if (!result.success) {
        setGeneralError(result.message);
        setFailedAttemptsRemaining(result.failedAttemptsRemaining);
        setIsLocked(!!result.isLocked);
      }
    } catch {
      setGeneralError(
        "Chưa thể đăng nhập. Vui lòng kiểm tra quyền lưu trữ của trình duyệt và thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="scms-login-wrapper">
      <div className="scms-form-title-group">
        <h2 className="scms-form-title">Chào mừng trở lại</h2>
        <p className="scms-form-desc">
          Đăng nhập để quản lý thông tin và hoạt động tại trung tâm.
        </p>
      </div>
      {generalError ? (
        <AlertBadge
          type={isLocked ? "locked" : "error"}
          message={generalError}
          failedAttemptsRemaining={failedAttemptsRemaining}
        />
      ) : sessionMessage ? (
        <AlertBadge type="info" message={sessionMessage} />
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="scms-form"
        noValidate
        aria-busy={isLoading}
      >
        <InputField
          label="Địa chỉ email"
          name="email"
          type="email"
          placeholder="ban@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError("");
            clearError();
          }}
          icon={<Mail size={18} />}
          error={emailError}
          required
          autoComplete="email"
          disabled={isLoading}
        />
        <InputField
          label="Mật khẩu"
          name="password"
          type="password"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError("");
            clearError();
          }}
          icon={<Lock size={18} />}
          error={passwordError}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
        <div className="scms-form-row-between">
          <label className="scms-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={isLoading}
            />
            <span>Ghi nhớ đăng nhập trong 24 giờ</span>
          </label>
        </div>
        <button type="submit" className="scms-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <span className="scms-spinner-row">
              <span className="scms-spinner" /> Đang đăng nhập...
            </span>
          ) : (
            <>
              <LogIn size={18} /> Đăng nhập
            </>
          )}
        </button>
      </form>
      <div className="scms-switch-prompt">
        <span>Bạn chưa có tài khoản học viên?</span>
        <button
          type="button"
          className="scms-switch-link"
          onClick={onSwitchToRegister}
          disabled={isLoading}
        >
          Tạo tài khoản <ArrowRight size={14} />
        </button>
      </div>
      <div className="scms-divider">
        <span>Khám phá bằng tài khoản mẫu</span>
      </div>
      <QuickAccounts
        onSelectAccount={(selectedEmail, selectedPassword) => {
          setEmail(selectedEmail);
          setPassword(selectedPassword);
          setEmailError("");
          setPasswordError("");
          clearError();
        }}
        disabled={isLoading}
      />
    </div>
  );
};
