import { apiRequest } from "./apiClient";
import type { ClassRosterPage } from "../types/classRoster";

export interface ClassRosterFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  includeCanceled?: boolean;
}

export const classRosterApi = {
  async getRegistrations(
    sessionId: number,
    filters: ClassRosterFilters = {},
  ): Promise<ClassRosterPage> {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new Error("ID buổi học không hợp lệ.");
    }

    const params = new URLSearchParams();

    if (filters.search?.trim()) params.set("search", filters.search.trim());
    params.set("page", String(filters.page ?? 1));
    params.set("pageSize", String(filters.pageSize ?? 20));
    params.set("includeCanceled", String(filters.includeCanceled ?? false));

    return apiRequest<ClassRosterPage>(
      `/ClassSession/${sessionId}/registrations?${params.toString()}`,
    );
  },
};
