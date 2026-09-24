import bcrypt from "bcryptjs";
import type {
  AuthResponse,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  User,
} from "../types/auth";
import { mockDb } from "./mockDb";

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const publicUser = (user: User): Omit<User, "passwordHash"> => {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
};

const startSession = (user: User, rememberMe: boolean): AuthResponse => {
  const safeUser = publicUser(user);
  const now = Date.now();
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    iat: now,
    exp: now + SESSION_DURATION_MS,
  };
  // Opaque demo session, NOT a signed JWT or a security boundary.
  // Replace this adapter with the server-issued JWT when the API is connected.
  const token = `scms-demo.${crypto.randomUUID()}`;
  mockDb.saveSession({ token, payload }, rememberMe);
  return {
    success: true,
    token,
    user: safeUser,
    message: "Đăng nhập thành công.",
  };
};

export const authService = {
  isValidEmail: (email: string): boolean =>
    /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim()),

  // Compatibility adapter for the future JWT API. The mock checks a saved
  // session and its demo account; it never decodes and trusts an arbitrary token.
  verifyJWT: (
    token: string,
  ): { valid: boolean; payload?: JWTPayload; reason?: string } => {
    const session = mockDb.getSession();
    if (!session || session.token !== token) {
      return {
        valid: false,
        reason: "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
      };
    }
    const payload = session.payload;
    if (
      !Number.isFinite(payload.exp) ||
      !Number.isFinite(payload.iat) ||
      payload.exp <= Date.now() ||
      payload.iat > Date.now() ||
      payload.exp - payload.iat !== SESSION_DURATION_MS
    ) {
      return {
        valid: false,
        reason: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }
    const user = mockDb.findByEmail(payload.email);
    if (
      !user ||
      user.id !== payload.userId ||
      user.role !== payload.role ||
      user.isLocked
    ) {
      return {
        valid: false,
        reason:
          "Tài khoản hoặc quyền truy cập đã thay đổi. Vui lòng đăng nhập lại.",
      };
    }
    return { valid: true, payload };
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    if (!data.username || data.username.trim().length < 3) {
      return {
        success: false,
        message: "Tên đăng nhập phải có ít nhất 3 ký tự.",
      };
    }
    if (!data.email || !authService.isValidEmail(data.email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (
      !data.password ||
      data.password.length < 8 ||
      new TextEncoder().encode(data.password).length > 72
    ) {
      return {
        success: false,
        message: "Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte.",
      };
    }
    if (data.password !== data.confirmPassword) {
      return { success: false, message: "Mật khẩu xác nhận không khớp." };
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    // Re-read after hashing so overlapping submissions cannot use stale checks.
    if (mockDb.findByEmail(data.email)) {
      return {
        success: false,
        message:
          "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
      };
    }
    if (mockDb.findByUsername(data.username)) {
      return { success: false, message: "Tên đăng nhập này đã tồn tại." };
    }
    const user: User = {
      id: `usr_${crypto.randomUUID()}`,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: "MEMBER",
      fullName: data.fullName?.trim() || data.username.trim(),
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      isLocked: false,
    };
    mockDb.addUser(user);
    return {
      ...startSession(user, false),
      message: "Đăng ký thành công. Chào mừng bạn đến với Titan Arena!",
    };
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (!credentials.email || !authService.isValidEmail(credentials.email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (!credentials.password)
      return { success: false, message: "Vui lòng nhập mật khẩu." };
    const user = mockDb.findByEmail(credentials.email);
    if (!user)
      return {
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
      };
    const lockedResult: AuthResponse = {
      success: false,
      isLocked: true,
      failedAttemptsRemaining: 0,
      message:
        "Tài khoản đã bị khóa sau 5 lần nhập sai liên tiếp. Vui lòng liên hệ quản lý trung tâm.",
    };
    if (user.isLocked) return lockedResult;
    const matches = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    const latestUser = mockDb.findByEmail(credentials.email);
    if (!latestUser || latestUser.isLocked) return lockedResult;
    if (!matches) {
      const result = mockDb.recordFailedLogin(user.email);
      if (result.isLocked) return lockedResult;
      return {
        success: false,
        failedAttemptsRemaining: 5 - result.attempts,
        message: `Mật khẩu không chính xác. Bạn còn ${5 - result.attempts} lần thử trước khi tài khoản bị khóa.`,
      };
    }
    mockDb.resetFailedAttempts(user.email);
    return startSession(
      { ...latestUser, failedAttempts: 0 },
      credentials.rememberMe ?? true,
    );
  },

  logout: (): void => mockDb.removeToken(),
  getCurrentUser: (): Omit<User, "passwordHash"> | null => {
    const token = mockDb.getStoredToken();
    if (!token) return null;
    const result = authService.verifyJWT(token);
    if (!result.valid || !result.payload) return null;
    const user = mockDb.findByEmail(result.payload.email);
    return user ? publicUser(user) : null;
  },
};
