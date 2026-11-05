import { apiRequest } from "./apiClient";
import type { User, UserRole } from "../types/auth";

export interface CoachDto {
  accountId: string;
  email: string;
  fullName: string;
  phone: string | null;
  specialization: string | null;
  disciplines?: { disciplineId: number; disciplineName: string; isActive: boolean }[];
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
  disciplineIds?: number[];
  fullName: string;
  phone: string;
  specialization: string;
  workSchedule: string;
  isActive: boolean;
}

export type PersonnelRole = "COACH" | "RECEPTIONIST";
export type PersonnelPerson = Omit<User, "passwordHash"> & { disciplineIds?: number[] };

const mapCoachToUser = (coach: CoachDto): PersonnelPerson => ({
  id: coach.accountId,
  username: coach.email.split("@")[0],
  email: coach.email,
  role: "COACH" as UserRole,
  fullName: coach.fullName,
  phone: coach.phone ?? undefined,
  specialization: coach.disciplines?.filter((item) => item.isActive).map((item) => item.disciplineName).join(", ") ?? coach.specialization ?? undefined,
  disciplineIds: coach.disciplines?.filter((item) => item.isActive).map((item) => item.disciplineId) ?? [],
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

/**
 * The API caps a page at 20 rows and silently falls back to that default when a
 * larger pageSize is asked for, so a single request can never hold the whole
 * roster. The screen has no pager, so it walks the pages and keeps every row —
 * otherwise a centre with more than 20 coaches shows 20 and claims that is all
 * of them.
 */
const PERSONNEL_PAGE_SIZE = 20;
const PERSONNEL_PAGE_LIMIT = 50;

const listPages = async <TItem>(
  path: string,
  params: URLSearchParams,
): Promise<TItem[]> => {
  const collected: TItem[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    params.set("page", String(page));
    params.set("pageSize", String(PERSONNEL_PAGE_SIZE));
    const result = await apiRequest<{
      items: TItem[];
      totalPages: number;
    }>(`${path}?${params.toString()}`);
    collected.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages && page <= PERSONNEL_PAGE_LIMIT);
  return collected;
};

export const personnelApi = {
  async list(role: PersonnelRole, search = "", status = ""): Promise<PersonnelPerson[]> {
    const params: URLSearchParams = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status && status !== "ALL") {
      params.set("status", status === "ACTIVE" ? "Active" : "Inactive");
    }

    if (role === "COACH") {
      const items = await listPages<CoachDto>("/Coach", params);
      return items.map(mapCoachToUser);
    }
    const items = await listPages<ReceptionistDto>("/Receptionist", params);
    return items.map(mapReceptionistToUser);
  },

  async create(
    role: PersonnelRole,
    email: string,
    form: PersonnelInput,
    password?: string,
  ): Promise<{ user: Omit<User, "passwordHash">; initialPassword: string }> {
    const initialPassword: string = password || "Test@12345";

    if (role === "COACH") {
      const coach = await apiRequest<CoachDto>("/Account/Create_coach", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: initialPassword,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          disciplineIds: form.disciplineIds ?? [],
          workSchedule: form.workSchedule.trim() || null,
        }),
      });
      return { user: mapCoachToUser(coach), initialPassword };
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
      specialization: undefined,
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
          disciplineIds: form.disciplineIds ?? [],
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
