import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  Compass,
  CreditCard,
  Dumbbell,
  History,
  House,
  Layers3,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  Whistle,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  navigationFor,
  roleLabels,
  trailFor,
  type NavIcon,
} from "../../utils/navigation";

const icons: Record<NavIcon, typeof House> = {
  home: House,
  user: UserRound,
  layers: Layers3,
  compass: Compass,
  users: Users,
  shield: ShieldCheck,
  whistle: Whistle,
  badge: BadgeCheck,
  history: History,
  card: CreditCard,
  cash: Banknote,
  check: ClipboardCheck,
  calendar: CalendarDays,
  support: LifeBuoy,
};

const initialsOf = (fullName: string): string =>
  fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export function WorkspaceLayout() {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The drawer is a modal surface on small screens: Escape dismisses it and the
  // page behind it must not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />;

  const sections = navigationFor(currentUser.role);
  const trail = trailFor(pathname);
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
        <div
          className="sidebar-scrim"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Điều hướng không gian làm việc"
      >
        <div className="workspace-brand">
          <span className="brand-symbol">
            <Dumbbell size={22} aria-hidden="true" />
          </span>
          <div>
            TITAN ARENA<small>SPORTS CENTER</small>
          </div>
          <button
            ref={closeButtonRef}
            className="mobile-close icon-button"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {sections.map((section) => (
            <div className="nav-group" key={section.title ?? "primary"}>
              {section.title && (
                <h2 className="nav-group-title">{section.title}</h2>
              )}
              {section.items.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    title={item.label}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="sidebar-user">
            <span className="avatar-initials" aria-hidden="true">
              {initialsOf(currentUser.fullName)}
            </span>
            <div>
              <strong title={currentUser.fullName}>
                {currentUser.fullName}
              </strong>
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
            <LogOut size={16} aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="workspace-body">
        <header className="workspace-topbar">
          <button
            className="mobile-toggle icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <nav className="breadcrumb" aria-label="Đường dẫn">
            <ol>
              <li>Trung tâm thể thao</li>
              {trail.map((crumb, index) => (
                <li
                  key={crumb}
                  aria-current={index === trail.length - 1 ? "page" : undefined}
                >
                  {crumb}
                </li>
              ))}
            </ol>
          </nav>
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
