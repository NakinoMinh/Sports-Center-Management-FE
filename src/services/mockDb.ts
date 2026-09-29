import bcrypt from "bcryptjs";
import type { DemoSession, User } from "../types/auth";

const STORAGE_KEY = "scms_users_database";
const TOKEN_STORAGE_KEY = "scms_auth_token";
const SESSION_STORAGE_KEY = "scms_demo_session_v1";

// Pre-seed 4 actors corresponding to project requirements
const defaultPassword = "Pass@1234";
const salt = bcrypt.genSaltSync(10);
const precomputedHash = bcrypt.hashSync(defaultPassword, salt);

const initialUsers: User[] = [
  {
    id: "usr_manager_01",
    username: "manager_admin",
    email: "manager@sportscenter.com",
    passwordHash: precomputedHash,
    role: "CENTER_MANAGER",
    fullName: "Nguyễn Văn Quản Lý",
    phone: "0901234567",
    dateOfBirth: "1988-05-15",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  },
  {
    id: "usr_coach_01",
    username: "coach_pro",
    email: "coach@sportscenter.com",
    passwordHash: precomputedHash,
    role: "COACH",
    fullName: "Trần Huấn Luyện Viên",
    phone: "0912345678",
    dateOfBirth: "1992-08-20",
    specialization: "Fitness, Gym, Thể hình cá nhân, Cardio",
    workSchedule: "Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)",
    avatar:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  },
  {
    id: "usr_member_01",
    username: "member_vip",
    email: "member@sportscenter.com",
    passwordHash: precomputedHash,
    role: "MEMBER",
    fullName: "Lê Thành Viên",
    phone: "0987654321",
    dateOfBirth: "1998-12-10",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  },
  {
    id: "usr_recept_01",
    username: "reception_staff",
    email: "receptionist@sportscenter.com",
    passwordHash: precomputedHash,
    role: "RECEPTIONIST",
    fullName: "Phạm Lễ Tân",
    phone: "0934567890",
    dateOfBirth: "1996-03-25",
    workSchedule: "Ca chiều: Thứ 2 - Chủ Nhật (14:00 - 22:00)",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    isLocked: false,
    isActive: true,
  },
];

export const mockDb = {
  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers));
        return structuredClone(initialUsers);
      }
      const users: unknown = JSON.parse(data);
      if (
        !Array.isArray(users) ||
        !users.every(
          (user) =>
            user &&
            typeof user.id === "string" &&
            typeof user.email === "string" &&
            typeof user.username === "string" &&
            typeof user.passwordHash === "string" &&
            typeof user.fullName === "string" &&
            typeof user.createdAt === "string" &&
            typeof user.isLocked === "boolean" &&
            Number.isInteger(user.failedAttempts) &&
            user.failedAttempts >= 0 &&
            ["CENTER_MANAGER", "COACH", "MEMBER", "RECEPTIONIST"].includes(
              user.role,
            ),
        )
      ) {
        throw new Error("Dữ liệu tài khoản trên trình duyệt không hợp lệ.");
      }
      let needsSave = false;
      for (const u of users as User[]) {
        const seed = initialUsers.find((s) => s.id === u.id);
        if (seed) {
          if (!u.phone && seed.phone) { u.phone = seed.phone; needsSave = true; }
          if (!u.dateOfBirth && seed.dateOfBirth) { u.dateOfBirth = seed.dateOfBirth; needsSave = true; }
          if (!u.specialization && seed.specialization) { u.specialization = seed.specialization; needsSave = true; }
          if (!u.workSchedule && seed.workSchedule) { u.workSchedule = seed.workSchedule; needsSave = true; }
          if (u.isActive === undefined) { u.isActive = true; needsSave = true; }
        }
      }
      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      }
      return users as User[];
    } catch {
      throw new Error(
        "Không đọc được dữ liệu demo. Kiểm tra quyền lưu trữ của trình duyệt.",
      );
    }
  },

  saveUsers: (users: User[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  },

  findByEmail: (email: string): User | undefined => {
    const users = mockDb.getUsers();
    return users.find(
      (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim(),
    );
  },

  findByUsername: (username: string): User | undefined => {
    const users = mockDb.getUsers();
    return users.find(
      (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim(),
    );
  },

  addUser: (user: User): void => {
    const users = mockDb.getUsers();
    users.push(user);
    mockDb.saveUsers(users);
  },

  updateUser: (updatedUser: User): void => {
    const users = mockDb.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      mockDb.saveUsers(users);
    }
  },

  recordFailedLogin: (
    email: string,
  ): { attempts: number; isLocked: boolean } => {
    const user = mockDb.findByEmail(email);
    if (!user) return { attempts: 0, isLocked: false };

    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.isLocked = true;
      user.lockedAt = new Date().toISOString();
    }
    mockDb.updateUser(user);
    return { attempts: user.failedAttempts, isLocked: user.isLocked };
  },

  resetFailedAttempts: (email: string): void => {
    const user = mockDb.findByEmail(email);
    if (user) {
      user.failedAttempts = 0;
      mockDb.updateUser(user);
    }
  },

  unlockUserAccount: (email: string): boolean => {
    const user = mockDb.findByEmail(email);
    if (user) {
      user.isLocked = false;
      user.failedAttempts = 0;
      user.lockedAt = undefined;
      mockDb.updateUser(user);
      return true;
    }
    return false;
  },

  getSession: (): DemoSession | null => {
    try {
      const storage = sessionStorage.getItem(TOKEN_STORAGE_KEY)
        ? sessionStorage
        : localStorage;
      const raw = storage.getItem(SESSION_STORAGE_KEY);
      const token = storage.getItem(TOKEN_STORAGE_KEY);
      if (!raw || !token) return null;
      const value = JSON.parse(raw) as DemoSession;
      if (
        value.token !== token ||
        !value.payload ||
        typeof value.payload.email !== "string"
      )
        return null;
      return value;
    } catch {
      return null;
    }
  },

  getStoredToken: (): string | null => {
    try {
      return (
        sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem(TOKEN_STORAGE_KEY)
      );
    } catch {
      return null;
    }
  },

  saveSession: (session: DemoSession, rememberMe: boolean): void => {
    mockDb.removeToken();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    storage.setItem(TOKEN_STORAGE_KEY, session.token);
  },

  removeToken: (): void => {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  },

  resetToDefault: (): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers));
  },
};
