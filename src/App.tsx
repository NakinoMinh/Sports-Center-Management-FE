import { useLayoutEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/common/ToastProvider";
import { useAuth } from "./hooks/useAuth";
import { AuthLayout } from "./components/layout/AuthLayout";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { homeForRole } from "./utils/navigation";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPreview } from "./pages/DashboardPreview";
import { MembershipPackagesPage } from "./pages/manager/MembershipPackagesPage";
import { MembershipPage } from "./pages/membership/MembershipPage";
import { CashPaymentsPage } from "./pages/membership/CashPaymentsPage";
import { MembershipStatusPage } from "./pages/membership/MembershipStatusPage";
import { ReceptionOperationsPage } from "./pages/membership/ReceptionOperationsPage";
import { MembersPage } from "./pages/manager/MembersPage";
import { AccessControlPage } from "./pages/manager/AccessControlPage";
import { PackageCatalogPage } from "./pages/PackageCatalogPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PersonnelPage } from "./pages/manager/PersonnelPage";
import { AuditLogPage } from "./pages/manager/AuditLogPage";
import { accountEnabled, accessRules } from "./services/accessControl";
import type { UserRole } from "./types/auth";
import "./App.css";
import "./styles/workspace.css";
import "./styles/theme.css";

function RouteScrollReset() {
  const { pathname, hash, key } = useLocation();
  useLayoutEffect(() => {
    // Section anchors keep their native position; new screens start at the top.
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, key]);
  return null;
}

function CatalogLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  return isAuthenticated && currentUser ? <WorkspaceLayout /> : <Outlet />;
}

function AuthPage({ tab }: { tab: "login" | "register" }) {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (isAuthenticated && currentUser)
    return <Navigate to={homeForRole(currentUser.role)} replace />;
  return (
    <AuthLayout activeTab={tab} onTabChange={(next) => navigate(`/${next}`)}>
      {tab === "login" ? (
        <LoginPage onSwitchToRegister={() => navigate("/register")} />
      ) : (
        <RegisterPage onSwitchToLogin={() => navigate("/login")} />
      )}
    </AuthLayout>
  );
}

// UI guard complements checks in each local service; API authorization belongs on the server.
function OwnedScreen({
  role,
  children,
}: {
  role: UserRole | UserRole[];
  children: ReactNode;
}) {
  const { currentUser } = useAuth();
  if (
    !currentUser ||
    !accountEnabled(currentUser) ||
    !(Array.isArray(role) ? role : [role]).includes(currentUser.role)
  )
    return (
      <div className="panel access-message">
        <span className="eyebrow">Quyền truy cập</span>
        <h1>Trang này dành cho vai trò khác</h1>
        <p>Hãy chọn chức năng phù hợp với tài khoản của bạn trong menu.</p>
      </div>
    );
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <RouteScrollReset />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<CatalogLayout />}>
            <Route path="/packages" element={<PackageCatalogPage />} />
          </Route>
          <Route path="/login" element={<AuthPage tab="login" />} />
          <Route path="/register" element={<AuthPage tab="register" />} />
          <Route element={<WorkspaceLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/manager/members" element={<OwnedScreen role={accessRules.members}><MembersPage /></OwnedScreen>} />
            <Route path="/manager/coaches" element={<OwnedScreen role={accessRules.members}><PersonnelPage role="COACH" /></OwnedScreen>} />
            <Route path="/manager/staff" element={<OwnedScreen role={accessRules.members}><PersonnelPage role="RECEPTIONIST" /></OwnedScreen>} />
            <Route path="/manager/audit-log" element={<OwnedScreen role={accessRules.members}><AuditLogPage /></OwnedScreen>} />
            <Route path="/manager/access" element={<OwnedScreen role={accessRules.permissions}><AccessControlPage /></OwnedScreen>} />
            {(["attendance", "classes", "support"] as const).map((mode) => (
              <Route key={mode} path={`/receptionist/${mode}`} element={<OwnedScreen role={accessRules.counter}><ReceptionOperationsPage key={mode} mode={mode} /></OwnedScreen>} />
            ))}
            <Route path="/receptionist/membership-status" element={
              <OwnedScreen role={accessRules.counter}><MembershipStatusPage /></OwnedScreen>
            } />
            <Route
              path="/payments/cash"
              element={
                <OwnedScreen role={accessRules.payments}>
                  <CashPaymentsPage />
                </OwnedScreen>
              }
            />
            <Route
              path="/manager/packages"
              element={
                <OwnedScreen role={accessRules.packages}>
                  <MembershipPackagesPage />
                </OwnedScreen>
              }
            />
            <Route
              path="/member/membership"
              element={
                <OwnedScreen role={accessRules.membership}>
                  <MembershipPage mode="member" />
                </OwnedScreen>
              }
            />
            <Route
              path="/receptionist/memberships"
              element={
                <OwnedScreen role={accessRules.counter}>
                  <MembershipPage mode="receptionist" />
                </OwnedScreen>
              }
            />
            <Route
              path="/coach"
              element={
                <OwnedScreen role={accessRules.coach}>
                  <DashboardPreview />
                </OwnedScreen>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
