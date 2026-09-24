export type UserRole = "CENTER_MANAGER" | "COACH" | "MEMBER" | "RECEPTIONIST";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // Demo only; production password handling belongs to the API.
  role: UserRole;
  fullName: string;
  avatar?: string;
  createdAt: string;
  failedAttempts: number; // For 5-time failed login lock
  isLocked: boolean;
  lockedAt?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  iat: number; // Issued at (timestamp in ms)
  exp: number; // Expiration (24h from iat in ms)
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, "passwordHash">;
  message: string;
  failedAttemptsRemaining?: number;
  isLocked?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface DemoSession {
  token: string;
  payload: JWTPayload;
}

export interface AuthContextType {
  currentUser: Omit<User, "passwordHash"> | null;
  token: string | null;
  jwtPayload: JWTPayload | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionMessage: string;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
}
