import { apiRequest } from "./apiClient";
import type {
  CoachOption,
  ClassSession,
  PagedResult,
} from "../types/assignCoach";

export const assignCoachApi = {
  // GET /api/ClassSession
  // Lấy danh sách buổi học của trung tâm
  async getSessions(): Promise<ClassSession[]> {
    const sessions: ClassSession[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiRequest<PagedResult<ClassSession>>(
        `/ClassSession?page=${page}&pageSize=100`,
      );

      sessions.push(...response.items);
      totalPages = response.totalPages;
      page++;
    } while (page <= totalPages);

    return sessions;
  },

  // GET /api/Coach
  // Không truyền status để lấy cả Coach Active và Inactive
  async getCoaches(): Promise<CoachOption[]> {
    const coaches: CoachOption[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiRequest<PagedResult<CoachOption>>(
        `/Coach?page=${page}&pageSize=100`,
      );

      coaches.push(...response.items);
      totalPages = response.totalPages;
      page++;
    } while (page <= totalPages);

    return coaches;
  },

  // PUT /api/ClassSession/{id}/coach
  // Chỉ thay đổi Coach, không thay đổi lịch/phòng/sức chứa
  async assignCoach(sessionId: number, coachId: string): Promise<void> {
    await apiRequest<unknown>(`/ClassSession/${sessionId}/coach`, {
      method: "PUT",
      body: JSON.stringify({ coachId }),
    });
  },
};
