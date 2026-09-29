import bcrypt from "bcryptjs";
import { authorizeRoles } from "./accessControl";
import { auditService } from "./auditService";
import { mockDb } from "./mockDb";
import type { MembershipActor } from "../types/membership";
import type { User } from "../types/auth";

export interface PersonnelInput {
  fullName: string;
  phone: string;
  specialization: string;
  workSchedule: string;
  isActive: boolean;
}

const roles = ["COACH", "RECEPTIONIST"] as const;
export type PersonnelRole = (typeof roles)[number];
const labels: Record<PersonnelRole, string> = { COACH: "huấn luyện viên", RECEPTIONIST: "nhân viên lễ tân" };

function validate(input: PersonnelInput) {
  const result = { ...input, fullName: input.fullName.trim(), phone: input.phone.trim(), specialization: input.specialization.trim(), workSchedule: input.workSchedule.trim() };
  if (result.fullName.length < 2 || result.fullName.length > 80) throw new Error("Họ tên cần từ 2 đến 80 ký tự.");
  if (!/^0\d{9}$/.test(result.phone)) throw new Error("Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.");
  if (result.specialization.length > 200 || result.workSchedule.length > 300) throw new Error("Thông tin chuyên môn hoặc lịch làm việc quá dài.");
  return result;
}
function safe({ passwordHash: _passwordHash, ...user }: User) { return user; }

export const personnelService = {
  list(actor: MembershipActor, role: PersonnelRole) {
    authorizeRoles(actor, ["CENTER_MANAGER"]);
    return mockDb.getUsers().filter((user) => user.role === role && !user.deletedAt).sort((a, b) => a.fullName.localeCompare(b.fullName, "vi")).map(safe);
  },
  async create(actor: MembershipActor, role: PersonnelRole, email: string, username: string, input: PersonnelInput) {
    authorizeRoles(actor, ["CENTER_MANAGER"]);
    const values = validate(input);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(normalizedEmail)) throw new Error("Email không hợp lệ.");
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalizedUsername)) throw new Error("Tên đăng nhập gồm 3–30 chữ, số hoặc dấu gạch dưới.");
    const users = mockDb.getUsers();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) throw new Error("Email đã được sử dụng.");
    if (users.some((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase())) throw new Error("Tên đăng nhập đã tồn tại.");
    const initialPassword = `Tt9!${crypto.randomUUID().replaceAll("-", "")}`;
    const user: User = { id: crypto.randomUUID(), ...values, email: normalizedEmail, username: normalizedUsername, passwordHash: await bcrypt.hash(initialPassword, 10), role, createdAt: new Date().toISOString(), failedAttempts: 0, isLocked: false };
    mockDb.saveUsers([...users, user]);
    auditService.record(actor, { action: "CREATE", entity: role, entityId: user.id, description: `Tạo ${labels[role]} ${user.fullName}.` });
    return { user: safe(user), initialPassword };
  },
  update(actor: MembershipActor, role: PersonnelRole, id: string, input: PersonnelInput) {
    authorizeRoles(actor, ["CENTER_MANAGER"]);
    const user = mockDb.getUsers().find((item) => item.id === id && item.role === role && !item.deletedAt);
    if (!user) throw new Error(`Không tìm thấy ${labels[role]}.`);
    Object.assign(user, validate(input));
    mockDb.updateUser(user);
    auditService.record(actor, { action: "UPDATE", entity: role, entityId: user.id, description: `Cập nhật ${labels[role]} ${user.fullName}.` });
    return safe(user);
  },
  setActive(actor: MembershipActor, role: PersonnelRole, id: string, isActive: boolean) {
    authorizeRoles(actor, ["CENTER_MANAGER"]);
    const user = mockDb.getUsers().find((item) => item.id === id && item.role === role && !item.deletedAt);
    if (!user) throw new Error(`Không tìm thấy ${labels[role]}.`);
    user.isActive = isActive;
    mockDb.updateUser(user);
    auditService.record(actor, { action: isActive ? "ACTIVATE" : "DEACTIVATE", entity: role, entityId: user.id, description: `${isActive ? "Kích hoạt" : "Vô hiệu hóa"} ${labels[role]} ${user.fullName}.` });
  },
};
