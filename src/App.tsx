import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { AuthLayout } from "./components/layout/AuthLayout";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { homeForRole } from "./utils/navigation";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPreview } from "./pages/DashboardPreview";
import { MembershipPackagesPage } from "./pages/manager/MembershipPackagesPage";
import { MembershipPage } from "./pages/membership/MembershipPage";
import type { UserRole } from "./types/auth";
import "./App.css";
import "./styles/workspace.css";

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
  role: UserRole;
  children: ReactNode;
}) {
  const { currentUser } = useAuth();
  if (currentUser?.role !== role)
    return (
      <div className="panel access-message">
        <span className="eyebrow">Quyền truy cập</span>
        <h1>Trang này dành cho vai trò khác</h1>
        <p>Hãy chọn chức năng phù hợp với tài khoản của bạn trong menu.</p>
      </div>
    );
  return children;
}

function Home() {
  const { currentUser } = useAuth();
  return (
    <Navigate
      to={currentUser ? homeForRole(currentUser.role) : "/login"}
      replace
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage tab="login" />} />
          <Route path="/register" element={<AuthPage tab="register" />} />
          <Route element={<WorkspaceLayout />}>
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
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
