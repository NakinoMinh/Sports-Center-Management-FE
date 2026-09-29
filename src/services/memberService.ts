import bcrypt from "bcryptjs";
import { mockDb } from "./mockDb";
import { authorizeRoles, accessRules } from "./accessControl";
import { auditService } from "./auditService";
import type { MembershipActor } from "../types/membership";
import type { User } from "../types/auth";

export interface MemberInput {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  isActive: boolean;
}
export function validateBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Vui lòng nhập ngày sinh hợp lệ.");
  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split("-").map(Number);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day ||
    date > new Date() ||
    year < 1900
  )
    throw new Error("Ngày sinh phải hợp lệ, từ năm 1900 đến hôm nay.");
}
export function generateInitialPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `Tt9!${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
function validate(input: MemberInput) {
  const result = {
    ...input,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
  };
  if (result.fullName.length < 2 || result.fullName.length > 80)
    throw new Error("Họ tên cần từ 2 đến 80 ký tự.");
  if (
    !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(result.email) ||
    result.email.length > 254
  )
    throw new Error("Email không hợp lệ.");
  if (!/^0\d{9}$/.test(result.phone))
    throw new Error("Số điện thoại phải có 10 chữ số, bắt đầu bằng 0.");
  validateBirthDate(result.dateOfBirth);
  if (typeof result.isActive !== "boolean")
    throw new Error("Trạng thái không hợp lệ.");
  return result;
}
const safe = ({
  passwordHash: _passwordHash,
  ...user
}: User): MembershipActor => user;
export const memberService = {
  list(actor: MembershipActor, query = "", status = "ALL", page = 1) {
    authorizeRoles(actor, accessRules.members);
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase();
    const rows = mockDb
      .getUsers()
      .filter(
        (user) =>
          user.role === "MEMBER" &&
          !user.deletedAt &&
          normalize(
            `${user.fullName} ${user.email} ${user.phone ?? ""}`,
          ).includes(normalize(query.trim())) &&
          (status === "ALL" ||
            (status === "ACTIVE"
              ? user.isActive !== false
              : user.isActive === false)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pages = Math.max(1, Math.ceil(rows.length / 20));
    const currentPage = Math.min(pages, Math.max(1, Math.floor(page) || 1));
    return {
      items: rows.slice((currentPage - 1) * 20, currentPage * 20).map(safe),
      total: rows.length,
      pages,
      page: currentPage,
    };
  },
  async create(actor: MembershipActor, input: MemberInput) {
    authorizeRoles(actor, accessRules.members);
    const data = validate(input);
    const password = generateInitialPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    authorizeRoles(actor, accessRules.members);
    const users = mockDb.getUsers();
    if (users.some((user) => user.email.toLowerCase() === data.email))
      throw new Error("Email đã được sử dụng.");
    const user: User = {
      ...data,
      id: crypto.randomUUID(),
      username: `member_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      passwordHash,
      role: "MEMBER",
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      isLocked: false,
    };
    mockDb.saveUsers([...users, user]);
    auditService.record(actor, { action: "CREATE", entity: "MEMBER", entityId: user.id, description: `Tạo thành viên ${user.fullName}.` });
    return { member: safe(user), initialPassword: password };
  },
  update(actor: MembershipActor, id: string, input: MemberInput) {
    authorizeRoles(actor, accessRules.members);
    const data = validate(input);
    const users = mockDb.getUsers();
    const user = users.find(
      (item) => item.id === id && item.role === "MEMBER" && !item.deletedAt,
    );
    if (!user) throw new Error("Không tìm thấy thành viên.");
    if (
      users.some(
        (item) => item.id !== id && item.email.toLowerCase() === data.email,
      )
    )
      throw new Error("Email đã được sử dụng.");
    Object.assign(user, data);
    mockDb.saveUsers(users);
    auditService.record(actor, { action: "UPDATE", entity: "MEMBER", entityId: user.id, description: `Cập nhật thành viên ${user.fullName}.` });
    return safe(user);
  },
  remove(actor: MembershipActor, id: string) {
    authorizeRoles(actor, accessRules.members);
    const users = mockDb.getUsers();
    const user = users.find(
      (item) => item.id === id && item.role === "MEMBER" && !item.deletedAt,
    );
    if (!user) throw new Error("Không tìm thấy thành viên.");
    // Soft deletion preserves membership, invoices and attendance references.
    user.deletedAt = new Date().toISOString();
    user.isActive = false;
    mockDb.saveUsers(users);
    auditService.record(actor, { action: "DEACTIVATE", entity: "MEMBER", entityId: user.id, description: `Xóa mềm thành viên ${user.fullName}.` });
  },
};
