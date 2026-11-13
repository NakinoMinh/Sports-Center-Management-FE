import { apiRequest } from "./apiClient";
import { describeError } from "./apiErrors";
import { getAssignableClassSessions, getClassCoachAvailability } from "../utils/coachAssignment";
import type { TrainingClass } from "../types/classes";
import type {
  CoachOption,
  ClassSession,
  PagedResult,
} from "../types/assignCoach";

export class ClassCoachAssignmentError extends Error {
  readonly updatedSessionCount: number;
  readonly totalSessionCount: number;

  constructor(
    updatedSessionCount: number,
    totalSessionCount: number,
    cause: unknown,
  ) {
    super(
      `Đã cập nhật ${updatedSessionCount}/${totalSessionCount} buổi cần đổi HLV. ${describeError(cause)} Hãy kiểm tra danh sách và thử lại để hoàn tất phân công lớp.`,
      { cause },
    );
    this.updatedSessionCount = updatedSessionCount;
    this.totalSessionCount = totalSessionCount;
  }
}

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

  async assignClassCoach(trainingClass: TrainingClass, coachId: string): Promise<number> {
    const [sessions, coaches] = await Promise.all([this.getSessions(), this.getCoaches()]);
    const coach = coaches.find((item) => item.accountId === coachId);
    if (!coach) {
      throw new Error("Huấn luyện viên không còn tồn tại. Vui lòng tải lại danh sách và chọn lại.");
    }
    const availability = getClassCoachAvailability(coach, trainingClass, sessions);
    if (!availability.isAvailable) throw new Error(availability.reason);

    const targets = getAssignableClassSessions(sessions, trainingClass.id)
      .filter((session) => session.coachId !== coachId);
    let updatedSessionCount = 0;

    // API chưa có giao dịch cấp lớp; dừng ở lỗi đầu tiên và báo đúng phần đã lưu.
    for (const session of targets) {
      try {
        await this.assignCoach(session.id, coachId);
        updatedSessionCount += 1;
      } catch (error) {
        throw new ClassCoachAssignmentError(updatedSessionCount, targets.length, error);
      }
    }
    return updatedSessionCount;
  },
};
