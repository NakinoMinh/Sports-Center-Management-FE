import { apiRequest } from "./apiClient";
import type {
  CoachOption,
  ClassSession,
  PagedResult,
} from "../types/assignCoach";

export const assignCoachApi = {
  // Lấy danh sách buổi học của trung tâm
  // GET /api/ClassSession
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

  // Lấy danh sách huấn luyện viên đang hoạt động
  // GET /api/Coach
  async getCoaches(): Promise<CoachOption[]> {
    const coaches: CoachOption[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiRequest<PagedResult<CoachOption>>(
        `/Coach?page=${page}&pageSize=100&status=Active`,
      );

      coaches.push(...response.items);
      totalPages = response.totalPages;
      page++;
    } while (page <= totalPages);

    return coaches;
  },

  // Phân công huấn luyện viên cho buổi học
  // PUT /api/ClassSession/{id}/coach
  async assignCoach(sessionId: number, coachId: string): Promise<void> {
    await apiRequest<unknown>(`/ClassSession/${sessionId}/coach`, {
      method: "PUT",
      body: JSON.stringify({ coachId }),
    });
  },
};
