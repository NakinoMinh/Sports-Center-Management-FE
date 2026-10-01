import { apiRequest } from "./apiClient";
import type { User, UserRole } from "../types/auth";

export interface CoachDto {
  accountId: string;
  email: string;
  fullName: string;
  phone: string | null;
  specialization: string | null;
  workSchedule: string | null;
  status: string;
  createdAt: string;
}

export interface PagedCoachResultDto {
  items: CoachDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ReceptionistDto {
  accountId: string;
  email: string;
  fullName: string;
  phone: string | null;
  workShift: string | null;
  status: string;
  createdAt: string;
}

export interface PagedReceptionistResultDto {
  items: ReceptionistDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PersonnelInput {
  fullName: string;
  phone: string;
  specialization: string;
  workSchedule: string;
  isActive: boolean;
}

export type PersonnelRole = "COACH" | "RECEPTIONIST";

const mapCoachToUser = (coach: CoachDto): Omit<User, "passwordHash"> => ({
  id: coach.accountId,
  username: coach.email.split("@")[0],
  email: coach.email,
  role: "COACH" as UserRole,
  fullName: coach.fullName,
  phone: coach.phone ?? undefined,
  specialization: coach.specialization ?? undefined,
  workSchedule: coach.workSchedule ?? undefined,
  createdAt: coach.createdAt,
  failedAttempts: 0,
  isLocked: false,
  isActive: coach.status === "Active",
});

const mapReceptionistToUser = (recept: ReceptionistDto): Omit<User, "passwordHash"> => ({
  id: recept.accountId,
  username: recept.email.split("@")[0],
  email: recept.email,
  role: "RECEPTIONIST" as UserRole,
  fullName: recept.fullName,
  phone: recept.phone ?? undefined,
  workSchedule: recept.workShift ?? undefined,
  createdAt: recept.createdAt,
  failedAttempts: 0,
  isLocked: false,
  isActive: recept.status === "Active",
});

export const personnelApi = {
  async list(role: PersonnelRole, search = "", status = ""): Promise<Omit<User, "passwordHash">[]> {
    const params: URLSearchParams = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search.trim()) params.set("search", search.trim());
    if (status && status !== "ALL") {
      params.set("status", status === "ACTIVE" ? "Active" : "Inactive");
    }

    if (role === "COACH") {
      const result: PagedCoachResultDto = await apiRequest<PagedCoachResultDto>(`/Coach?${params.toString()}`);
      return result.items.map(mapCoachToUser);
    } else {
      const result: PagedReceptionistResultDto = await apiRequest<PagedReceptionistResultDto>(`/Receptionist?${params.toString()}`);
      return result.items.map(mapReceptionistToUser);
    }
  },

  async create(
    role: PersonnelRole,
    email: string,
    form: PersonnelInput,
    password?: string,
  ): Promise<{ user: Omit<User, "passwordHash">; initialPassword: string }> {
    const initialPassword: string = password || "Test@12345";

    if (role === "COACH") {
      await apiRequest<string>("/Account/Create_coach", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: initialPassword,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          specialization: form.specialization.trim() || null,
          workSchedule: form.workSchedule.trim() || null,
        }),
      });
    } else {
      await apiRequest<string>("/Account/Create_receptionist", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: initialPassword,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          workShift: form.workSchedule.trim() || null,
        }),
      });
    }

    const createdUser: Omit<User, "passwordHash"> = {
      id: `acc_${Date.now()}`,
      username: email.split("@")[0],
      email: email.trim(),
      role,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      specialization: role === "COACH" ? form.specialization.trim() : undefined,
      workSchedule: form.workSchedule.trim() || undefined,
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
    };

    return { user: createdUser, initialPassword };
  },

  async update(role: PersonnelRole, accountId: string, form: PersonnelInput): Promise<void> {
    if (role === "COACH") {
      await apiRequest<string>(`/Coach/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          specialization: form.specialization.trim() || null,
          workSchedule: form.workSchedule.trim() || null,
        }),
      });
    } else {
      await apiRequest<string>(`/Receptionist/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          workShift: form.workSchedule.trim() || null,
        }),
      });
    }
  },

  async setActive(role: PersonnelRole, accountId: string, isActive: boolean): Promise<void> {
    const endpoint: string = role === "COACH" ? `/Coach/${accountId}/status` : `/Receptionist/${accountId}/status`;
    await apiRequest<string>(endpoint, {
      method: "PATCH",
      body: JSON.stringify({
        status: isActive ? "Active" : "Inactive",
      }),
    });
  },
};
