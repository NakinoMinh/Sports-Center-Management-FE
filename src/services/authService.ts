import bcrypt from "bcryptjs";
import type {
  AuthResponse,
  EmailVerificationPurpose,
  EmailVerificationResponse,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  User,
} from "../types/auth";
import { mockDb } from "./mockDb";
import { accountEnabled } from "./accessControl";
import { auditService } from "./auditService";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient";

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const EMAIL_OTP_DURATION_MS = 5 * 60 * 1000;
const EMAIL_OTP_STORAGE_KEY = "scms_email_verification_otp";
const API_USER_STORAGE_KEY = "scms_api_user";

interface AuthSessionDto {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  accountId: string;
  email: string;
  role: "CenterManager" | "Coach" | "Member" | "Receptionist";
}

interface RegisterMemberDto {
  accountId: string;
  email: string;
  memberCode: string;
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

const roleFromApi = (role: AuthSessionDto["role"]): User["role"] => {
  const roles: Record<AuthSessionDto["role"], User["role"]> = {
    CenterManager: "CENTER_MANAGER",
    Coach: "COACH",
    Member: "MEMBER",
    Receptionist: "RECEPTIONIST",
  };
  return roles[role];
};

const removeApiUser = (): void => {
  localStorage.removeItem(API_USER_STORAGE_KEY);
  sessionStorage.removeItem(API_USER_STORAGE_KEY);
};

const saveApiUser = (
  user: Omit<User, "passwordHash">,
  rememberMe?: boolean,
): void => {
  removeApiUser();
  const persistent = rememberMe ?? localStorage.getItem("scms_auth_token") !== null;
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(API_USER_STORAGE_KEY, JSON.stringify(user));
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

const saveApiSession = (session: AuthSessionDto, rememberMe: boolean): AuthResponse => {
  const now = Date.now();
  const expiresAt = Date.parse(session.expiresAtUtc);
  const role = roleFromApi(session.role);
  const username = session.email.split("@")[0];
  const user: User = {
    id: session.accountId,
    username,
    email: session.email,
    passwordHash: "",
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
    exp: expiresAt,
  };
  mockDb.saveSession({ token: session.accessToken, payload }, rememberMe);
  removeApiUser();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(API_USER_STORAGE_KEY, JSON.stringify(publicUser(user)));
  return { success: true, token: session.accessToken, user: publicUser(user), message: "Đăng nhập thành công." };
};

const readApiUser = (): Omit<User, "passwordHash"> | null => {
  try {
    const raw = sessionStorage.getItem(API_USER_STORAGE_KEY) || localStorage.getItem(API_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) as Omit<User, "passwordHash"> : null;
  } catch {
    return null;
  }
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
    const session = await apiRequest<AuthSessionDto>("/Auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
        emailVerificationCode: credentials.emailVerificationCode,
      }),
    });
    const response = saveApiSession(session, credentials.rememberMe ?? true);
    if (response.user) {
      try {
        const profile = await apiRequest<AccountProfileDto>("/Account/profile");
        response.user = mergeProfile(response.user, profile);
        saveApiUser(response.user, credentials.rememberMe ?? true);
      } catch {
        // The authenticated session remains usable if optional profile data fails.
      }
    }
    return response;
  } catch (error) {
    return apiFailure(error, "Không thể kết nối đến máy chủ đăng nhập.");
  }
};

interface StoredEmailOtp {
  email: string;
  purpose: EmailVerificationPurpose;
  code: string;
  expiresAt: number;
}

const readEmailOtp = (): StoredEmailOtp | null => {
  try {
    const raw = sessionStorage.getItem(EMAIL_OTP_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredEmailOtp;
    if (
      typeof value.email !== "string" ||
      typeof value.code !== "string" ||
      typeof value.expiresAt !== "number" ||
      !["LOGIN", "REGISTER"].includes(value.purpose)
    ) return null;
    return value;
  } catch {
    return null;
  }
};

const checkEmailOtp = (
  email: string,
  purpose: EmailVerificationPurpose,
  code?: string,
): AuthResponse | null => {
  const otp = readEmailOtp();
  if (!otp || otp.email !== email.trim().toLowerCase() || otp.purpose !== purpose) {
    return { success: false, message: "Vui lòng gửi mã xác nhận đến email trước." };
  }
  if (Date.now() >= otp.expiresAt) {
    sessionStorage.removeItem(EMAIL_OTP_STORAGE_KEY);
    return { success: false, message: "Mã xác nhận đã hết hạn. Vui lòng gửi mã mới." };
  }
  if (!code || otp.code !== code.trim()) {
    return { success: false, message: "Mã xác nhận email không chính xác." };
  }
  sessionStorage.removeItem(EMAIL_OTP_STORAGE_KEY);
  return null;
};

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

const validateLoginCredentials = async (
  email: string,
  password: string,
): Promise<AuthResponse | null> => {
  if (!email || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim())) {
    return { success: false, message: "Vui lòng nhập email hợp lệ." };
  }
  if (!password) return { success: false, message: "Vui lòng nhập mật khẩu." };
  const user = mockDb.findByEmail(email);
  if (!user) return { success: false, message: "Email hoặc mật khẩu không chính xác." };
  const lockedResult: AuthResponse = {
    success: false,
    isLocked: true,
    failedAttemptsRemaining: 0,
    message: "Tài khoản đã bị khóa sau 5 lần nhập sai liên tiếp. Vui lòng liên hệ quản lý trung tâm.",
  };
  if (user.isActive === false || user.deletedAt) {
    return { success: false, message: "Tài khoản đã ngừng hoạt động. Vui lòng liên hệ quản lý trung tâm." };
  }
  if (user.isLocked) return lockedResult;
  const matches = await bcrypt.compare(password, user.passwordHash);
  const latestUser = mockDb.findByEmail(email);
  if (!latestUser || !accountEnabled(latestUser)) return lockedResult;
  if (!matches) {
    const result = mockDb.recordFailedLogin(user.email);
    if (result.isLocked) return lockedResult;
    return {
      success: false,
      failedAttemptsRemaining: 5 - result.attempts,
      message: `Mật khẩu không chính xác. Bạn còn ${5 - result.attempts} lần thử trước khi tài khoản bị khóa.`,
    };
  }
  return null;
};

export const authService = {
  isValidEmail: (email: string): boolean =>
    /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim()),

  requestEmailVerification: async (input: {
    email: string;
    purpose: EmailVerificationPurpose;
    password?: string;
  }): Promise<EmailVerificationResponse> => {
    const email = input.email.trim().toLowerCase();
    if (!authService.isValidEmail(email)) {
      return { success: false, message: "Vui lòng nhập email hợp lệ." };
    }
    if (input.purpose === "LOGIN" && isApiConfigured() && !input.password) {
      return { success: false, message: "Vui lòng nhập mật khẩu." };
    }
    if (isApiConfigured()) {
      try {
        const endpoint = input.purpose === "LOGIN"
          ? "/Auth/request-login-email-verification"
          : "/Account/request-register-email-verification";
        const response = await apiRequest<EmailVerificationOtpDto>(endpoint, {
          method: "POST",
          body: JSON.stringify(
            input.purpose === "LOGIN"
              ? { email, password: input.password }
              : { email },
          ),
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
    }
    if (input.purpose === "LOGIN" && !isApiConfigured()) {
      const credentialsResult = await validateLoginCredentials(email, input.password ?? "");
      if (credentialsResult) return credentialsResult;
    } else if (input.purpose === "REGISTER" && mockDb.findByEmail(email)) {
      return { success: false, message: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem(EMAIL_OTP_STORAGE_KEY, JSON.stringify({
      email,
      purpose: input.purpose,
      code,
      expiresAt: Date.now() + EMAIL_OTP_DURATION_MS,
    } satisfies StoredEmailOtp));
    return {
      success: true,
      message: `Mã xác nhận đã được gửi đến ${email}.`,
      demoCode: code,
      expiresInSeconds: EMAIL_OTP_DURATION_MS / 1000,
    };
  },

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
    if (isApiConfigured()) {
      if (
        !Number.isFinite(payload.exp) ||
        !Number.isFinite(payload.iat) ||
        payload.exp <= Date.now() ||
        payload.iat > Date.now() ||
        !readApiUser()
      ) {
        return { valid: false, reason: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." };
      }
      return { valid: true, payload };
    }
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
      !accountEnabled(user)
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

    if (isApiConfigured()) {
      try {
        await apiRequest<RegisterMemberDto>("/Account/Register_member", {
          method: "POST",
          body: JSON.stringify({
            email: data.email.trim(),
            password: data.password,
            confirmPassword: data.confirmPassword,
            emailVerificationCode: data.emailVerificationCode,
          }),
        });
        const loginResult = await loginWithApi({
          email: data.email,
          password: data.password,
          rememberMe: false,
          emailVerificationCode: data.emailVerificationCode,
        });
        if (loginResult.success && data.fullName?.trim()) {
          try {
            const profile = await apiRequest<AccountProfileDto>("/Account/profile", {
              method: "PATCH",
              body: JSON.stringify({ fullName: data.fullName.trim() }),
            });
            if (loginResult.user) {
              loginResult.user = mergeProfile(loginResult.user, profile);
              saveApiUser(loginResult.user, false);
            }
          } catch {
            // Profile name update is best-effort upon registration
          }
        }
        return loginResult.success
          ? { ...loginResult, message: "Đăng ký và đăng nhập thành công." }
          : loginResult;
      } catch (error) {
        return apiFailure(error, "Không thể kết nối đến máy chủ đăng ký.");
      }
    }

    const username = (data.username?.trim() || data.email.split("@")[0]).trim();
    if (username.length < 3) {
      return {
        success: false,
        message: "Tên đăng nhập phải có ít nhất 3 ký tự.",
      };
    }
    const emailOtpError = checkEmailOtp(data.email, "REGISTER", data.emailVerificationCode);
    if (emailOtpError) return emailOtpError;
    const passwordHash = await bcrypt.hash(data.password, 10);
    // Re-read after hashing so overlapping submissions cannot use stale checks.
    if (mockDb.findByEmail(data.email)) {
      return {
        success: false,
        message:
          "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
      };
    }
    if (mockDb.findByUsername(username)) {
      return { success: false, message: "Tên đăng nhập này đã tồn tại." };
    }
    const user: User = {
      id: `usr_${crypto.randomUUID()}`,
      username,
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: "MEMBER",
      fullName: data.fullName?.trim() || username,
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
    if (isApiConfigured()) {
      if (!credentials.email || !authService.isValidEmail(credentials.email)) {
        return { success: false, message: "Vui lòng nhập email hợp lệ." };
      }
      if (!credentials.password) return { success: false, message: "Vui lòng nhập mật khẩu." };
      return loginWithApi(credentials);
    }
    const credentialsError = await validateLoginCredentials(credentials.email, credentials.password);
    if (credentialsError) return credentialsError;
    const emailOtpError = checkEmailOtp(credentials.email, "LOGIN", credentials.emailVerificationCode);
    if (emailOtpError) return emailOtpError;
    const latestUser = mockDb.findByEmail(credentials.email)!;
    mockDb.resetFailedAttempts(latestUser.email);
    return startSession(
      { ...latestUser, failedAttempts: 0 },
      credentials.rememberMe ?? true,
    );
  },

  logout: async (): Promise<void> => {
    if (isApiConfigured()) {
      try {
        await apiRequest<void>("/Auth/Logout", { method: "POST" });
      } catch {
        // A local logout must still succeed when the token is already expired
        // or the API is temporarily unavailable.
      } finally {
        mockDb.removeToken();
        removeApiUser();
      }
      return;
    }
    mockDb.removeToken();
  },
  updateProfile: async (
    actor: Omit<User, "passwordHash">,
    input: Pick<User, "fullName" | "phone" | "dateOfBirth" | "avatar"> & {
      specialization?: string;
      workSchedule?: string;
    },
  ) => {
    const fullName = input.fullName.trim();
    const phone = (input.phone ?? "").trim();
    const dateOfBirth = (input.dateOfBirth ?? "").trim();
    const avatar = (input.avatar ?? "").trim();
    const specialization = (input.specialization ?? "").trim();
    const workSchedule = (input.workSchedule ?? "").trim();
    if (fullName.length < 2 || fullName.length > 80) throw new Error("Họ tên cần từ 2 đến 80 ký tự.");
    if (phone && !/^0\d{9}$/.test(phone)) throw new Error("Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.");
    const birth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : null;
    if (dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !birth || Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth || birth > new Date() || birth.getFullYear() < 1900)) throw new Error("Ngày sinh không hợp lệ.");
    if (avatar && (!/^https:\/\//.test(avatar) || avatar.length > 500)) throw new Error("Ảnh đại diện phải là đường dẫn HTTPS hợp lệ.");
    if (specialization.length > 200) throw new Error("Chuyên môn không được vượt quá 200 ký tự.");
    if (workSchedule.length > 300) throw new Error("Lịch làm việc không được vượt quá 300 ký tự.");

    if (isApiConfigured()) {
      const profile = await apiRequest<AccountProfileDto>("/Account/profile", {
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
      const updated = mergeProfile(actor, profile);
      saveApiUser(updated);
      return updated;
    }

    const user = mockDb.getUsers().find((item) => item.id === actor.id);
    if (!user || !accountEnabled(user)) throw new Error("Không tìm thấy tài khoản đang hoạt động.");

    Object.assign(user, {
      fullName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      avatar: avatar || undefined,
      specialization: specialization || undefined,
      workSchedule: workSchedule || undefined,
    });
    mockDb.updateUser(user);
    const safeUser = publicUser(user);
    auditService.record(safeUser, { action: "UPDATE_PROFILE", entity: "USER", entityId: user.id, description: `Cập nhật hồ sơ cá nhân của ${user.fullName}.` });
    return safeUser;
  },

  requestPasswordChangeOtp: async (actor: Omit<User, "passwordHash">) => {
    if (isApiConfigured()) {
      const response = await apiRequest<{
        message: string;
        expiresInSeconds: number;
        cooldownSeconds: number;
      }>("/Auth/request-change-password-otp", { method: "POST" });
      return {
        email: actor.email,
        code: undefined,
        expiresInSeconds: response.expiresInSeconds,
      };
    }
    const user = mockDb.getUsers().find((item) => item.id === actor.id);
    if (!user || !accountEnabled(user)) throw new Error("Không tìm thấy tài khoản hợp lệ.");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpData = {
      userId: user.id,
      email: user.email,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };
    sessionStorage.setItem("scms_pwd_change_otp", JSON.stringify(otpData));
    return {
      email: user.email,
      code,
      expiresInSeconds: 300,
    };
  },

  changePasswordWithOtp: async (
    actor: Omit<User, "passwordHash">,
    input: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      otpCode: string;
    },
  ) => {
    if (isApiConfigured()) {
      await apiRequest<string>("/Auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          confirmPassword: input.confirmPassword,
          otp: input.otpCode.trim(),
        }),
      });
      mockDb.removeToken();
      removeApiUser();
      return {
        success: true,
        message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.",
      };
    }
    const user = mockDb.getUsers().find((item) => item.id === actor.id);
    if (!user || !accountEnabled(user)) throw new Error("Tài khoản không tìm thấy hoặc đã bị khóa.");

    if (!input.currentPassword) throw new Error("Vui lòng nhập mật khẩu hiện tại.");
    const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) throw new Error("Mật khẩu hiện tại không chính xác.");

    if (!input.newPassword || input.newPassword.length < 8) {
      throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
    }
    if (new TextEncoder().encode(input.newPassword).length > 72) {
      throw new Error("Mật khẩu tối đa 72 byte.");
    }
    if (input.newPassword !== input.confirmPassword) {
      throw new Error("Mật khẩu xác nhận không khớp.");
    }
    if (input.newPassword === input.currentPassword) {
      throw new Error("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
    }

    // Verify OTP
    const rawOtp = sessionStorage.getItem("scms_pwd_change_otp");
    if (!rawOtp) {
      throw new Error("Mã OTP chưa được yêu cầu hoặc đã hết hiệu lực. Vui lòng bấm 'Gửi mã OTP'.");
    }
    let otpData: { userId: string; email: string; code: string; expiresAt: number };
    try {
      otpData = JSON.parse(rawOtp);
    } catch {
      throw new Error("Dữ liệu OTP không hợp lệ. Vui lòng yêu cầu mã mới.");
    }

    if (otpData.userId !== user.id) {
      throw new Error("Mã OTP không khớp với tài khoản hiện tại.");
    }
    if (Date.now() > otpData.expiresAt) {
      sessionStorage.removeItem("scms_pwd_change_otp");
      throw new Error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
    }
    if (otpData.code !== input.otpCode.trim()) {
      throw new Error("Mã OTP không chính xác. Vui lòng kiểm tra lại.");
    }

    // Update password
    const newHash = await bcrypt.hash(input.newPassword, 10);
    user.passwordHash = newHash;
    mockDb.updateUser(user);
    sessionStorage.removeItem("scms_pwd_change_otp");

    const safeUser = publicUser(user);
    auditService.record(safeUser, {
      action: "CHANGE_PASSWORD",
      entity: "USER",
      entityId: user.id,
      description: `Đổi mật khẩu thành công qua xác thực OTP cho tài khoản ${user.email}.`,
    });

    return {
      success: true,
      message: "Đổi mật khẩu thành công. Hãy sử dụng mật khẩu mới trong các lần đăng nhập tiếp theo.",
    };
  },
  getCurrentUser: (): Omit<User, "passwordHash"> | null => {
    if (isApiConfigured()) return readApiUser();
    const token = mockDb.getStoredToken();
    if (!token) return null;
    const result = authService.verifyJWT(token);
    if (!result.valid || !result.payload) return null;
    const user = mockDb.findByEmail(result.payload.email);
    return user ? publicUser(user) : null;
  },
};
