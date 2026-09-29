import bcrypt from "bcryptjs";
import type {
  AuthResponse,
  JWTPayload,
  LoginCredentials,
  RegisterData,
  User,
} from "../types/auth";
import { mockDb } from "./mockDb";
import { accountEnabled } from "./accessControl";
import { auditService } from "./auditService";

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
    if (user.isActive === false || user.deletedAt) return { success: false, message: "Tài khoản đã ngừng hoạt động. Vui lòng liên hệ quản lý trung tâm." };
    if (user.isLocked) return lockedResult;
    const matches = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    const latestUser = mockDb.findByEmail(credentials.email);
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
    mockDb.resetFailedAttempts(user.email);
    return startSession(
      { ...latestUser, failedAttempts: 0 },
      credentials.rememberMe ?? true,
    );
  },

  logout: (): void => mockDb.removeToken(),
  updateProfile: (
    actor: Omit<User, "passwordHash">,
    input: Pick<User, "fullName" | "phone" | "dateOfBirth" | "avatar"> & {
      specialization?: string;
      workSchedule?: string;
    },
  ) => {
    const user = mockDb.getUsers().find((item) => item.id === actor.id);
    if (!user || !accountEnabled(user)) throw new Error("Không tìm thấy tài khoản đang hoạt động.");
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

  requestPasswordChangeOtp: (actor: Omit<User, "passwordHash">) => {
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
    const token = mockDb.getStoredToken();
    if (!token) return null;
    const result = authService.verifyJWT(token);
    if (!result.valid || !result.payload) return null;
    const user = mockDb.findByEmail(result.payload.email);
    return user ? publicUser(user) : null;
  },
};
