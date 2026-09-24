import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Dumbbell,
  Layers3,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { homeForRole, roleLabels } from "../../utils/navigation";

export function WorkspaceLayout() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;
  const manager = currentUser.role === "CENTER_MANAGER";
  const reception = currentUser.role === "RECEPTIONIST";
  const label = manager
    ? "Quản lý gói thành viên"
    : reception
      ? "Đăng ký & gia hạn tại quầy"
      : currentUser.role === "MEMBER"
        ? "Gói tập của tôi"
        : "Trang cá nhân";
  const today = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <div className="workspace">
      <a href="#workspace-main" className="skip-link">
        Đến nội dung chính
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="workspace-brand">
          <span className="brand-symbol">
            <Dumbbell size={24} />
          </span>
          <div>
            TITAN ARENA<small>SPORTS CENTER</small>
          </div>
          <button
            className="mobile-close icon-button"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-caption">KHÔNG GIAN LÀM VIỆC</div>
        <nav aria-label="Điều hướng chính">
          <NavLink
            to={homeForRole(currentUser.role)}
            onClick={() => setMenuOpen(false)}
          >
            {manager ? <Layers3 size={19} /> : <CreditCard size={19} />}
            <span>{label}</span>
            <ArrowUpRight size={15} />
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="sidebar-note-icon">
            <ShieldCheck size={23} />
          </span>
          <strong>Mỗi ngày một bước tiến</strong>
          <p>
            Quản lý hành trình tập luyện, bắt đầu từ gói thành viên phù hợp.
          </p>
        </div>
        <div className="sidebar-user">
          <span className="avatar-initials">
            {currentUser.fullName
              .split(" ")
              .filter(Boolean)
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </span>
          <div>
            <strong>{currentUser.fullName}</strong>
            <small>{roleLabels[currentUser.role]}</small>
          </div>
        </div>
        <button
          className="sidebar-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu"
              aria-expanded={menuOpen}
            >
              <Menu size={21} />
            </button>
            <span>Trung tâm thể thao</span>
            <span>/</span>
            <strong>
              {manager
                ? "Gói thành viên"
                : reception
                  ? "Quầy lễ tân"
                  : "Thành viên"}
            </strong>
          </div>
          <span className="topbar-date">{today}</span>
        </header>
        <main id="workspace-main" className="workspace-main">
          <div className="demo-notice">
            <span>
              <Check size={14} /> Bản trải nghiệm Sprint 1
            </span>
            <p>
              Dữ liệu lưu trên trình duyệt này. Chưa kết nối dịch vụ thanh toán.
            </p>
          </div>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Titan Arena · Sports Center Management System</span>
          <span>Chăm sóc từng hành trình tập luyện</span>
        </footer>
      </div>
    </div>
  );
}
