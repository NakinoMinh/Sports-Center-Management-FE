import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CreditCard,
  Dumbbell,
  House,
  ClipboardCheck,
  CalendarDays,
  LifeBuoy,
  Users,
  Layers3,
  LogOut,
  Menu,
  ShieldCheck,
  History,
  UserRound,
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
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            <House size={19} />
            <span>Trang chủ</span>
            <ArrowUpRight size={15} />
          </NavLink>
          <NavLink to="/profile" onClick={() => setMenuOpen(false)}>
            <UserRound size={19} />
            <span>Hồ sơ cá nhân</span>
            <ArrowUpRight size={15} />
          </NavLink>
          <NavLink
            to={homeForRole(currentUser.role)}
            onClick={() => setMenuOpen(false)}
          >
            {manager ? <Layers3 size={19} /> : <CreditCard size={19} />}
            <span>{label}</span>
            <ArrowUpRight size={15} />
          </NavLink>
          <NavLink to="/packages" onClick={() => setMenuOpen(false)}>
            <Layers3 size={19} />
            <span>Khám phá & so sánh gói</span>
            <ArrowUpRight size={15} />
          </NavLink>
          {manager && <>
            <NavLink to="/manager/members" onClick={() => setMenuOpen(false)}><Users size={19} /><span>Quản lý thành viên</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/manager/access" onClick={() => setMenuOpen(false)}><ShieldCheck size={19} /><span>Phân quyền hệ thống</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/manager/coaches" onClick={() => setMenuOpen(false)}><Users size={19} /><span>Quản lý huấn luyện viên</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/manager/staff" onClick={() => setMenuOpen(false)}><Users size={19} /><span>Quản lý nhân viên</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/manager/audit-log" onClick={() => setMenuOpen(false)}><History size={19} /><span>Lịch sử thao tác</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/receptionist/memberships" onClick={() => setMenuOpen(false)}><CreditCard size={19} /><span>Đăng ký tại quầy</span><ArrowUpRight size={15} /></NavLink>
          </>}
          {(manager || reception) && (
            <NavLink to="/payments/cash" onClick={() => setMenuOpen(false)}>
              <ShieldCheck size={19} />
              <span>Xác nhận tiền mặt</span>
              <ArrowUpRight size={15} />
            </NavLink>
          )}
          {(reception || manager) && <>
            <NavLink to="/receptionist/attendance" onClick={() => setMenuOpen(false)}><ClipboardCheck size={19} /><span>Điểm danh trung tâm</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/receptionist/classes" onClick={() => setMenuOpen(false)}><CalendarDays size={19} /><span>Đăng ký lớp học</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/receptionist/support" onClick={() => setMenuOpen(false)}><LifeBuoy size={19} /><span>Yêu cầu hỗ trợ</span><ArrowUpRight size={15} /></NavLink>
            <NavLink to="/receptionist/membership-status" onClick={() => setMenuOpen(false)}>
              <ShieldCheck size={19} />
              <span>Kiểm tra gói tập</span>
              <ArrowUpRight size={15} />
            </NavLink>
          </>}
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
          onClick={async () => {
            await logout();
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
