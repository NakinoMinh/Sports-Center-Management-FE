import React, { useState, useCallback, useEffect } from "react";
import type {
  AuthResponse,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  User,
} from "../types/auth";
import { authService } from "../services/authService";
import { mockDb } from "../services/mockDb";

import { AuthContext } from "./authContextValue";

interface AuthState {
  token: string | null;
  jwtPayload: JWTPayload | null;
  currentUser: Omit<User, "passwordHash"> | null;
  sessionMessage: string;
}
const emptyAuth: AuthState = {
  token: null,
  jwtPayload: null,
  currentUser: null,
  sessionMessage: "",
};

const readAuth = (): AuthState => {
  try {
    const token = mockDb.getStoredToken();
    if (!token) return emptyAuth;
    const verification = authService.verifyJWT(token);
    const currentUser = verification.valid
      ? authService.getCurrentUser()
      : null;
    if (currentUser && verification.payload) {
      return {
        token,
        jwtPayload: verification.payload,
        currentUser,
        sessionMessage: "",
      };
    }
    mockDb.removeToken();
    return {
      ...emptyAuth,
      sessionMessage: verification.reason || "Vui lòng đăng nhập lại.",
    };
  } catch {
    return {
      ...emptyAuth,
      sessionMessage: "Không đọc được phiên đăng nhập trên trình duyệt.",
    };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [auth, setAuth] = useState(readAuth);
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await authService.login(credentials);
      if (response.success) setAuth(readAuth());
      return response;
    },
    [],
  );
  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      const response = await authService.register(data);
      if (response.success) setAuth(readAuth());
      return response;
    },
    [],
  );
  const logout = useCallback(() => {
    authService.logout();
    setAuth(emptyAuth);
  }, []);

  useEffect(() => {
    const sync = () => setAuth(readAuth());
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", onVisibility);
    const remaining = auth.jwtPayload ? auth.jwtPayload.exp - Date.now() : 0;
    const timeout = auth.token
      ? window.setTimeout(sync, Math.max(0, remaining))
      : undefined;
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [auth.token, auth.jwtPayload]);

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        isAuthenticated: !!auth.token && !!auth.currentUser,
        isInitializing: false,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
