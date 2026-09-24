import React from "react";
import {
  Flame,
  Activity,
  ShieldCheck,
  Calendar,
  Users,
  Dumbbell,
  Sparkles,
} from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  activeTab: "login" | "register";
  onTabChange: (tab: "login" | "register") => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="scms-auth-page">
      {/* Background dynamic ambient sports glow effects */}
      <div className="scms-glow-orb orb-1" />
      <div className="scms-glow-orb orb-2" />
      <div className="scms-glow-orb orb-3" />

      <div className="scms-auth-container">
        {/* Left Side: Vibrant Sports Center Visual & Branding Hero */}
        <div className="scms-hero-panel">
          <div className="scms-hero-overlay" />

          <div className="scms-hero-content">
            <div className="scms-brand">
              <div className="scms-brand-logo">
                <Flame className="scms-flame-icon" size={28} />
              </div>
              <div>
                <span className="scms-brand-title">TITAN ARENA</span>
                <span className="scms-brand-subtitle">
                  SPORTS & FITNESS CENTER
                </span>
              </div>
            </div>

            <div className="scms-hero-tagline">
              <h1>
                Nâng Tầm Trải Nghiệm <br />
                <span className="gradient-text">Thể Thao & Quản Trị</span>
              </h1>
              <p>
                Một không gian kết nối học viên, huấn luyện viên và đội ngũ
                trung tâm. Cùng xây dựng thói quen vận động mỗi ngày.
              </p>
            </div>

            {/* Feature highlights badge grid */}
            <div className="scms-features-grid">
              <div className="scms-feature-card">
                <div className="scms-feat-icon icon-cyan">
                  <Activity size={20} />
                </div>
                <div className="scms-feat-text">
                  <strong>Kết nối đội ngũ</strong>
                  <span>Quản lý, HLV, Hội viên, Lễ tân</span>
                </div>
              </div>

              <div className="scms-feature-card">
                <div className="scms-feat-icon icon-emerald">
                  <Dumbbell size={20} />
                </div>
                <div className="scms-feat-text">
                  <strong>Khám phá lớp học</strong>
                  <span>Lựa chọn bộ môn phù hợp với bạn</span>
                </div>
              </div>

              <div className="scms-feature-card">
                <div className="scms-feat-icon icon-amber">
                  <Calendar size={20} />
                </div>
                <div className="scms-feat-text">
                  <strong>Theo dõi đăng ký</strong>
                  <span>Thông tin lớp học tại một nơi</span>
                </div>
              </div>

              <div className="scms-feature-card">
                <div className="scms-feat-icon icon-purple">
                  <ShieldCheck size={20} />
                </div>
                <div className="scms-feat-text">
                  <strong>Hồ sơ cá nhân</strong>
                  <span>Dễ dàng xem thông tin thành viên</span>
                </div>
              </div>
            </div>

            {/* Live stats ticker */}
            <div className="scms-stats-row">
              <div className="scms-stat-item">
                <span className="scms-stat-num">01</span>
                <span className="scms-stat-lbl">Kết nối</span>
              </div>
              <div className="scms-stat-divider" />
              <div className="scms-stat-item">
                <span className="scms-stat-num">02</span>
                <span className="scms-stat-lbl">Tập luyện</span>
              </div>
              <div className="scms-stat-divider" />
              <div className="scms-stat-item">
                <span className="scms-stat-num">03</span>
                <span className="scms-stat-lbl">Phát triển</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container with Switchable Tabs */}
        <div className="scms-form-panel">
          <div className="scms-form-card">
            {/* Header Tabs */}
            <div className="scms-tabs-header">
              <button
                type="button"
                className={`scms-tab-btn ${activeTab === "login" ? "active" : ""}`}
                aria-pressed={activeTab === "login"}
                onClick={() => onTabChange("login")}
              >
                <Users size={18} />
                Đăng Nhập
              </button>
              <button
                type="button"
                className={`scms-tab-btn ${activeTab === "register" ? "active" : ""}`}
                aria-pressed={activeTab === "register"}
                onClick={() => onTabChange("register")}
              >
                <Sparkles size={18} />
                Đăng Ký
              </button>
            </div>

            {/* Form Body */}
            <div className="scms-form-body">{children}</div>

            {/* Footer Notice */}
            <div className="scms-form-footer">
              <p>
                <ShieldCheck size={14} className="inline-icon" /> Bản demo
                Sprint 1 · Dữ liệu được lưu trên trình duyệt, chưa kết nối máy
                chủ.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
