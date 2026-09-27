import { useLayoutEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import type { UserRole } from "./types/auth";
import "./App.css";
import "./styles/workspace.css";

function RouteScrollReset() {
  const { pathname, hash, key } = useLocation();
  useLayoutEffect(() => {
    // Section anchors keep their native position; new screens start at the top.
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, key]);
  return null;
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

// These guards protect Minh's screens; full SCMS-5 permission management belongs to another task.
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
        <RouteScrollReset />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage tab="login" />} />
          <Route path="/register" element={<AuthPage tab="register" />} />
          <Route element={<WorkspaceLayout />}>
            <Route
              path="/payments/cash"
              element={
                <OwnedScreen role={["RECEPTIONIST", "CENTER_MANAGER"]}>
                  <CashPaymentsPage />
                </OwnedScreen>
              }
            />
            <Route
              path="/manager/packages"
              element={
                <OwnedScreen role="CENTER_MANAGER">
                  <MembershipPackagesPage />
                </OwnedScreen>
              }
            />
            <Route
              path="/member/membership"
              element={
                <OwnedScreen role="MEMBER">
                  <MembershipPage mode="member" />
                </OwnedScreen>
              }
            />
            <Route
              path="/receptionist/memberships"
              element={
                <OwnedScreen role="RECEPTIONIST">
                  <MembershipPage mode="receptionist" />
                </OwnedScreen>
              }
            />
            <Route
              path="/coach"
              element={
                <OwnedScreen role="COACH">
                  <DashboardPreview />
                </OwnedScreen>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
