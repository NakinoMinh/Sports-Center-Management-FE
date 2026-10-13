import { apiRequest } from "./apiClient";
import type {
  TeachingSchedulePage,
  TeachingSessionStatus,
} from "../types/myTeachingSchedule";

export interface TeachingScheduleFilters {
  from?: string;
  to?: string;
  status?: TeachingSessionStatus;
  page?: number;
  pageSize?: number;
}

export const myTeachingScheduleApi = {
  async getMySchedule(
    filters: TeachingScheduleFilters = {},
  ): Promise<TeachingSchedulePage> {
    const params = new URLSearchParams();

    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    params.set("page", String(filters.page ?? 1));
    params.set("pageSize", String(filters.pageSize ?? 20));

    return apiRequest<TeachingSchedulePage>(
      `/ClassSession/me?${params.toString()}`,
    );
  },
};
