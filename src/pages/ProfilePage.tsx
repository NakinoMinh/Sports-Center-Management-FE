import { useState, useEffect } from "react";
import {
  UserRound,
  Camera,
  KeyRound,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Clock,
  Briefcase,
  Phone,
  Calendar,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { roleLabels } from "../utils/navigation";

// Preset modern avatars for quick selection
const AVATAR_PRESETS = [
  {
    name: "Nam thể thao 1",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Huấn luyện viên",
    url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Nữ thể thao",
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Năng động",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Chuyên nghiệp",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Nụ cười",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  },
];

export function ProfilePage() {
  const { currentUser, refreshCurrentUser } = useAuth();

  // Profile form state
  const [form, setForm] = useState(() => ({
    fullName: currentUser?.fullName ?? "",
    phone: currentUser?.phone ?? "",
    dateOfBirth: currentUser?.dateOfBirth ?? "",
    avatar: currentUser?.avatar ?? "",
    specialization: currentUser?.specialization ?? "",
    workSchedule: currentUser?.workSchedule ?? "",
  }));
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Password change state
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);

  // Update local form state when currentUser updates
  useEffect(() => {
    if (currentUser) {
      setForm({
        fullName: currentUser.fullName ?? "",
        phone: currentUser.phone ?? "",
        dateOfBirth: currentUser.dateOfBirth ?? "",
        avatar: currentUser.avatar ?? "",
        specialization: currentUser.specialization ?? "",
        workSchedule: currentUser.workSchedule ?? "",
      });
    }
  }, [currentUser]);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  if (!currentUser) return null;

  const isCoach = currentUser.role === "COACH";
  const isReceptionist = currentUser.role === "RECEPTIONIST";

  // Initials fallback
  const initials = currentUser.fullName
    ? currentUser.fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "SC";

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setIsSavingProfile(true);

    try {
      await authService.updateProfile(currentUser, form);
      refreshCurrentUser();
      setProfileMessage("Cập nhật thông tin hồ sơ thành công!");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestOtp = async () => {
    setPwdError("");
    setPwdMessage("");
    if (!pwdCurrent) {
      setPwdError("Vui lòng nhập mật khẩu hiện tại trước khi yêu cầu mã OTP.");
      return;
    }
    if (!pwdNew || pwdNew.length < 8) {
      setPwdError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (pwdNew === pwdCurrent) {
      setPwdError("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }

    try {
      const res = await authService.requestPasswordChangeOtp(currentUser);
      setOtpSent(true);
      setSimulatedOtp(res.code ?? null);
      setOtpCountdown(res.expiresInSeconds);
      setPwdMessage("Mã xác thực OTP đã được gửi đến email của bạn.");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Không thể tạo mã OTP.");
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwdError("");
    setPwdMessage("");

    if (!otpSent) {
      setPwdError("Vui lòng bấm 'Gửi mã OTP qua Email' trước khi xác nhận đổi mật khẩu.");
      return;
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setPwdError("Vui lòng nhập mã OTP gồm 6 chữ số.");
      return;
    }

    setIsSubmittingPwd(true);
    try {
      const result = await authService.changePasswordWithOtp(currentUser, {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        confirmPassword: pwdConfirm,
        otpCode: otpCode.trim(),
      });
      refreshCurrentUser();
      setPwdMessage(result.message);
      // Reset password form
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setOtpCode("");
      setOtpSent(false);
      setSimulatedOtp(null);
      setOtpCountdown(0);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
    } finally {
      setIsSubmittingPwd(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">TÀI KHOẢN & BẢO MẬT</span>
          <h1>Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin định danh, hình ảnh đại diện và bảo mật tài khoản.</p>
        </div>
        <span className="page-icon">
          <UserRound size={26} />
        </span>
      </div>

      <div className="profile-layout-grid">
        {/* Left Column: Avatar & Summary Card */}
        <div className="profile-summary-card">
          <div className="avatar-showcase">
            <div className="avatar-circle-wrapper">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt={form.fullName}
                  className="avatar-image-lg"
                  onError={() => {
                    // Fallback to initials if image URL fails
                    setForm((prev) => ({ ...prev, avatar: "" }));
                  }}
                />
              ) : (
                <div className="avatar-placeholder-lg">
                  <span>{initials}</span>
                </div>
              )}
              <button
                type="button"
                className="avatar-change-btn"
                onClick={() => setShowAvatarPicker((prev) => !prev)}
                title="Thay đổi ảnh đại diện"
                aria-label="Thay đổi ảnh đại diện"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="avatar-caption">
              <h2>{currentUser.fullName}</h2>
              <span className={`role-badge role-${currentUser.role.toLowerCase()}`}>
                {roleLabels[currentUser.role]}
              </span>
              <p className="avatar-email">{currentUser.email}</p>
            </div>
          </div>

          {/* Quick Avatar Picker Drawer / Box */}
          {showAvatarPicker && (
            <div className="avatar-picker-box">
              <div className="avatar-picker-header">
                <span>Chọn ảnh mẫu hoặc nhập URL</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowAvatarPicker(false)}
                >
                  Đóng
                </button>
              </div>

              <div className="avatar-preset-grid">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={`avatar-preset-item ${form.avatar === preset.url ? "selected" : ""}`}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, avatar: preset.url }));
                    }}
                    title={preset.name}
                  >
                    <img src={preset.url} alt={preset.name} />
                  </button>
                ))}
              </div>

              <div className="avatar-url-input">
                <label className="field">
                  <span>Hoặc dán đường dẫn ảnh HTTPS</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.avatar}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="profile-security-badge">
            <ShieldCheck size={20} className="security-icon" />
            <div>
              <strong>Xác thực an toàn</strong>
              <p>Mật khẩu được mã hóa BCrypt đa lớp kết hợp bảo vệ phiên làm việc.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Edit Form & Password Change */}
        <div className="profile-details-column">
          {/* Section 1: Thông tin cá nhân */}
          <section className="panel profile-section-panel">
            <div className="panel-heading">
              <div>
                <h2>Thông tin cá nhân</h2>
                <p>Cập nhật họ tên, số điện thoại liên hệ và thông tin chuyên môn</p>
              </div>
            </div>

            {profileMessage && (
              <div className="success-notice" role="status">
                <CheckCircle2 size={18} />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="error-notice" role="alert">
                <AlertCircle size={18} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="field-grid">
                <label className="field">
                  <span>Họ và tên *</span>
                  <input
                    required
                    maxLength={80}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </label>

                <label className="field field-disabled">
                  <span className="field-label-with-icon">
                    <span>Email đăng nhập</span>
                    <Lock size={12} className="lock-icon" />
                  </span>
                  <input value={currentUser.email} disabled className="input-locked" />
                  <small>Email là định danh tài khoản, không thể thay đổi</small>
                </label>

                <label className="field">
                  <span className="field-label-with-icon">
                    <Phone size={13} />
                    <span>Số điện thoại</span>
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0xxxxxxxxx"
                  />
                  <small>Gồm 10 chữ số, bắt đầu bằng 0</small>
                </label>

                <label className="field">
                  <span className="field-label-with-icon">
                    <Calendar size={13} />
                    <span>Ngày sinh</span>
                  </span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </label>

                {/* Role specific: Coach Specialization */}
                {isCoach && (
                  <label className="field field-full">
                    <span className="field-label-with-icon">
                      <Sparkles size={13} />
                      <span>Chuyên môn & Bộ môn huấn luyện</span>
                    </span>
                    <input
                      maxLength={200}
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      placeholder="Ví dụ: Gym, Fitness cá nhân, Yoga nâng cao, Bơi lội..."
                    />
                    <small>Mô tả chuyên môn chính để trung tâm và học viên theo dõi</small>
                  </label>
                )}

                {/* Role specific: Coach or Receptionist Work Schedule */}
                {(isCoach || isReceptionist) && (
                  <label className="field field-full">
                    <span className="field-label-with-icon">
                      <Briefcase size={13} />
                      <span>Lịch làm việc / Ca làm việc</span>
                    </span>
                    <textarea
                      maxLength={300}
                      rows={3}
                      value={form.workSchedule}
                      onChange={(e) => setForm({ ...form, workSchedule: e.target.value })}
                      placeholder="Ví dụ: Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)..."
                    />
                    <small>Ca làm việc cố định hoặc các khung giờ hỗ trợ tại trung tâm</small>
                  </label>
                )}
              </div>

              <div className="form-action-row">
                <button
                  type="submit"
                  className="button primary"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}
                </button>
              </div>
            </form>
          </section>

          {/* Section 2: Đổi mật khẩu qua xác thực OTP */}
          <section className="panel profile-section-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">BẢO MẬT TÀI KHOẢN</span>
                <h2>Đổi mật khẩu xác thực OTP</h2>
                <p>Mật khẩu mới yêu cầu xác thực bằng mã OTP gửi về hòm thư của bạn</p>
              </div>
              <span className="panel-badge-icon">
                <KeyRound size={20} />
              </span>
            </div>

            {pwdMessage && (
              <div className="success-notice" role="status">
                <CheckCircle2 size={18} />
                <span>{pwdMessage}</span>
              </div>
            )}
            {pwdError && (
              <div className="error-notice" role="alert">
                <AlertCircle size={18} />
                <span>{pwdError}</span>
              </div>
            )}

            {/* Simulated Email Notification Banner */}
            {simulatedOtp && (
              <div className="otp-simulation-notice" role="alert">
                <div className="otp-sim-header">
                  <Mail size={18} />
                  <strong>[Hộp thư điện tử mô phỏng]</strong>
                  {otpCountdown > 0 && (
                    <span className="otp-timer">
                      <Clock size={13} /> Còn {otpCountdown}s
                    </span>
                  )}
                </div>
                <p>
                  Mã xác thực OTP gửi tới email <u>{currentUser.email}</u>:
                </p>
                <div className="otp-display-code">
                  <span>{simulatedOtp}</span>
                </div>
                <small>Nhập mã gồm 6 số trên vào ô xác nhận bên dưới để hoàn tất đổi mật khẩu.</small>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="field-grid">
                <label className="field field-full">
                  <span>Mật khẩu hiện tại *</span>
                  <input
                    type="password"
                    required
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng"
                    autoComplete="current-password"
                  />
                </label>

                <label className="field">
                  <span>Mật khẩu mới * (tối thiểu 8 ký tự)</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                  />
                </label>

                <label className="field">
                  <span>Xác nhận mật khẩu mới *</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                </label>
              </div>

              {/* OTP Action Row */}
              <div className="otp-flow-wrapper">
                <div className="otp-request-row">
                  <button
                    type="button"
                    className="button secondary otp-send-btn"
                    onClick={handleRequestOtp}
                    disabled={otpCountdown > 0}
                  >
                    <Mail size={16} />
                    {otpCountdown > 0
                      ? `Gửi lại sau (${otpCountdown}s)`
                      : "Gửi mã OTP về email"}
                  </button>
                  <span className="otp-target-hint">
                    Mã 6 chữ số sẽ được gửi tới <strong>{currentUser.email}</strong>
                  </span>
                </div>

                {otpSent && (
                  <div className="otp-input-row">
                    <label className="field otp-input-field">
                      <span>Nhập mã OTP (6 số) *</span>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        className="otp-code-input"
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      />
                    </label>

                    <button
                      type="submit"
                      className="button primary otp-submit-btn"
                      disabled={isSubmittingPwd || otpCode.length !== 6}
                    >
                      {isSubmittingPwd ? "Đang xác nhận..." : "Xác nhận đổi mật khẩu"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
