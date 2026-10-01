import type {
  AuthResponse,
  EmailVerificationPurpose,
  EmailVerificationResponse,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  User,
} from "../types/auth";
import { ApiError, apiRequest } from "./apiClient";

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const TOKEN_KEY = "scms_auth_token";
const SESSION_KEY = "scms_api_session";
const USER_KEY = "scms_api_user";

interface AuthSessionDto {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  accountId: string;
  email: string;
  role: "CenterManager" | "Coach" | "Member" | "Receptionist";
}

interface EmailVerificationOtpDto {
  message: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  demoCode?: string | null;
}

interface AccountProfileDto {
  accountId: string;
  email: string;
  role: AuthSessionDto["role"];
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  specialization?: string | null;
  workSchedule?: string | null;
  memberCode?: string | null;
  createdAt: string;
}

const roleFromApi = (role: AuthSessionDto["role"]): User["role"] => ({
  CenterManager: "CENTER_MANAGER",
  Coach: "COACH",
  Member: "MEMBER",
  Receptionist: "RECEPTIONIST",
})[role] as User["role"];

const allStores = (): Storage[] => [sessionStorage, localStorage];

const clearSession = (): void => {
  for (const storage of allStores()) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(SESSION_KEY);
    storage.removeItem(USER_KEY);
  }
};

const selectedStore = (rememberMe: boolean): Storage =>
  rememberMe ? localStorage : sessionStorage;

const readJson = <T,>(key: string): T | null => {
  for (const storage of allStores()) {
    const raw: string | null = storage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      clearSession();
      return null;
    }
  }
  return null;
};

const getStoredToken = (): string | null =>
  sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);

const saveUser = (user: Omit<User, "passwordHash">): void => {
  const storage: Storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  for (const item of allStores()) item.removeItem(USER_KEY);
  storage.setItem(USER_KEY, JSON.stringify(user));
};

const mergeProfile = (
  user: Omit<User, "passwordHash">,
  profile: AccountProfileDto,
): Omit<User, "passwordHash"> => ({
  ...user,
  username: profile.memberCode || user.username,
  email: profile.email,
  fullName: profile.fullName,
  phone: profile.phone || undefined,
  dateOfBirth: profile.dateOfBirth || undefined,
  avatar: profile.avatarUrl || undefined,
  specialization: profile.specialization || undefined,
  workSchedule: profile.workSchedule || undefined,
  createdAt: profile.createdAt,
});

const saveSession = (session: AuthSessionDto, rememberMe: boolean): AuthResponse => {
  const now: number = Date.now();
  const role: User["role"] = roleFromApi(session.role);
  const username: string = session.email.split("@")[0];
  const user: Omit<User, "passwordHash"> = {
    id: session.accountId,
    username,
    email: session.email,
    role,
    fullName: username,
    createdAt: new Date(now).toISOString(),
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  };
  const payload: JWTPayload = {
    userId: user.id,
    username,
    email: user.email,
    role,
    fullName: user.fullName,
    iat: now,
    exp: Date.parse(session.expiresAtUtc),
  };
  clearSession();
  const storage: Storage = selectedStore(rememberMe);
  storage.setItem(TOKEN_KEY, session.accessToken);
  storage.setItem(SESSION_KEY, JSON.stringify(payload));
  storage.setItem(USER_KEY, JSON.stringify(user));
  return { success: true, token: session.accessToken, user, message: "Đăng nhập thành công." };
};

const apiFailure = (error: unknown, fallback: string): AuthResponse => {
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      isLocked: error.code === "ACCOUNT_LOCKED",
      failedAttemptsRemaining: error.code === "ACCOUNT_LOCKED" ? 0 : undefined,
    };
  }
  return { success: false, message: fallback };
};

const loginWithApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const session: AuthSessionDto = await apiRequest<AuthSessionDto>("/Auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
        emailVerificationCode: credentials.emailVerificationCode,
      }),
    });
    const response: AuthResponse = saveSession(session, credentials.rememberMe ?? true);
    if (response.user) {
      try {
        const profile: AccountProfileDto = await apiRequest<AccountProfileDto>("/Account/profile");
        response.user = mergeProfile(response.user, profile);
        saveUser(response.user);
      } catch {
        // Phiên BE vẫn hợp lệ nếu endpoint hồ sơ tạm thời không phản hồi.
      }
    }
    return response;
  } catch (error) {
    return apiFailure(error, "Không thể kết nối đến máy chủ đăng nhập.");
  }
};

export const authService = {
  isValidEmail: (email: string): boolean =>
    /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim()),

  getStoredToken,
  clearSession,

  requestEmailVerification: async (input: {
    email: string;
    purpose: EmailVerificationPurpose;
    password?: string;
  }): Promise<EmailVerificationResponse> => {
    const email: string = input.email.trim().toLowerCase();
    if (!authService.isValidEmail(email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (input.purpose === "LOGIN" && !input.password) {
      return { success: false, message: "Vui lòng nhập mật khẩu." };
    }
    try {
      const endpoint: string = input.purpose === "LOGIN"
        ? "/Auth/request-login-email-verification"
        : "/Account/request-register-email-verification";
      const response: EmailVerificationOtpDto = await apiRequest<EmailVerificationOtpDto>(endpoint, {
        method: "POST",
        body: JSON.stringify(input.purpose === "LOGIN" ? { email, password: input.password } : { email }),
      });
      return {
        success: true,
        message: `Mã xác nhận đã được gửi đến ${email}.`,
        demoCode: response.demoCode ?? undefined,
        expiresInSeconds: response.expiresInSeconds,
      };
    } catch (error) {
      return apiFailure(error, "Không thể gửi mã xác nhận email.");
    }
  },

  verifyJWT: (token: string): { valid: boolean; payload?: JWTPayload; reason?: string } => {
    const payload: JWTPayload | null = readJson<JWTPayload>(SESSION_KEY);
    if (!payload || getStoredToken() !== token || !readJson<Omit<User, "passwordHash">>(USER_KEY)) {
      return { valid: false, reason: "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại." };
    }
    if (!Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) || payload.exp <= Date.now() || payload.iat > Date.now()) {
      return { valid: false, reason: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." };
    }
    return { valid: true, payload };
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    if (!authService.isValidEmail(data.email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (!data.password || data.password.length < 8 || new TextEncoder().encode(data.password).length > 72) {
      return { success: false, message: "Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte." };
    }
    if (data.password !== data.confirmPassword) {
      return { success: false, message: "Mật khẩu xác nhận không khớp." };
    }
    try {
      await apiRequest("/Account/Register_member", {
        method: "POST",
        body: JSON.stringify({
          email: data.email.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          emailVerificationCode: data.emailVerificationCode,
        }),
      });
      const result: AuthResponse = await loginWithApi({
        email: data.email,
        password: data.password,
        rememberMe: false,
        emailVerificationCode: data.emailVerificationCode,
      });
      if (result.success && result.user && data.fullName?.trim()) {
        try {
          const profile: AccountProfileDto = await apiRequest<AccountProfileDto>("/Account/profile", {
            method: "PATCH",
            body: JSON.stringify({ fullName: data.fullName.trim() }),
          });
          result.user = mergeProfile(result.user, profile);
          saveUser(result.user);
        } catch {
          // Cập nhật tên là bước bổ sung, không hủy phiên vừa tạo.
        }
      }
      return result.success ? { ...result, message: "Đăng ký và đăng nhập thành công." } : result;
    } catch (error) {
      return apiFailure(error, "Không thể kết nối đến máy chủ đăng ký.");
    }
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (!authService.isValidEmail(credentials.email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (!credentials.password) {
      return { success: false, message: "Vui lòng nhập mật khẩu." };
    }
    return loginWithApi(credentials);
  },

  logout: async (): Promise<void> => {
    try {
      await apiRequest<void>("/Auth/Logout", { method: "POST" });
    } catch {
      // Đăng xuất cục bộ vẫn phải hoàn tất nếu BE/token không còn phản hồi.
    } finally {
      clearSession();
    }
  },

  updateProfile: async (
    actor: Omit<User, "passwordHash">,
    input: Pick<User, "fullName" | "phone" | "dateOfBirth" | "avatar"> & {
      specialization?: string;
      workSchedule?: string;
    },
  ) => {
    const fullName: string = input.fullName.trim();
    const phone: string = (input.phone ?? "").trim();
    const dateOfBirth: string = (input.dateOfBirth ?? "").trim();
    const avatar: string = (input.avatar ?? "").trim();
    const specialization: string = (input.specialization ?? "").trim();
    const workSchedule: string = (input.workSchedule ?? "").trim();
    if (fullName.length < 2 || fullName.length > 80) {
      throw new Error("Họ tên cần từ 2 đến 80 ký tự.");
    }
    if (phone && !/^0\d{9}$/.test(phone)) {
      throw new Error("Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.");
    }
    if (avatar && (!/^https:\/\//.test(avatar) || avatar.length > 500)) {
      throw new Error("Ảnh đại diện phải là đường dẫn HTTPS hợp lệ.");
    }
    const profile: AccountProfileDto = await apiRequest<AccountProfileDto>("/Account/profile", {
      method: "PATCH",
      body: JSON.stringify({
        fullName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        avatarUrl: avatar || null,
        specialization: specialization || null,
        workSchedule: workSchedule || null,
      }),
    });
    const updated: Omit<User, "passwordHash"> = mergeProfile(actor, profile);
    saveUser(updated);
    return updated;
  },

  requestPasswordChangeOtp: async (actor: Omit<User, "passwordHash">) => {
    const response: { message: string; expiresInSeconds: number } = await apiRequest<{ message: string; expiresInSeconds: number }>(
      "/Auth/request-change-password-otp",
      { method: "POST" },
    );
    return { email: actor.email, code: undefined, expiresInSeconds: response.expiresInSeconds };
  },

  changePasswordWithOtp: async (
    _actor: Omit<User, "passwordHash">,
    input: { currentPassword: string; newPassword: string; confirmPassword: string; otpCode: string },
  ) => {
    await apiRequest<string>("/Auth/change-password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        confirmPassword: input.confirmPassword,
        otp: input.otpCode.trim(),
      }),
    });
    clearSession();
    return { success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới." };
  },

  getCurrentUser: (): Omit<User, "passwordHash"> | null =>
    getStoredToken() ? readJson<Omit<User, "passwordHash">>(USER_KEY) : null,
};
