import { apiRequest } from "./apiClient";

export type HomeworkTargetType = "MEMBER" | "CLASS" | "SESSION";
export type HomeworkSourceType = "DIRECT" | "CLASS" | "SESSION";

export interface HomeworkAssignmentDto {
  id: number;
  coachId: string;
  coachName: string;
  memberId: string;
  memberName: string;
  classId: number | null;
  className: string | null;
  sessionId: number | null;
  sessionLabel: string | null;
  title: string;
  instructions: string;
  sourceType: HomeworkSourceType;
  assignedAtUtc: string;
}

export type CreateHomeworkAssignmentInput = {
  targetType: HomeworkTargetType;
  memberId?: string;
  classId?: number;
  sessionId?: number;
  title: string;
  instructions: string;
};

type HomeworkAssignmentResponse = Partial<HomeworkAssignmentDto> & {
  id?: unknown;
  classId?: unknown;
  sessionId?: unknown;
};

const nullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const nullableText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const mapHomeworkAssignment = (
  value: HomeworkAssignmentResponse,
): HomeworkAssignmentDto => ({
  id: Number(value.id ?? 0),
  coachId: String(value.coachId ?? ""),
  coachName: String(value.coachName ?? "Huấn luyện viên"),
  memberId: String(value.memberId ?? ""),
  memberName: String(value.memberName ?? "Học viên"),
  classId: nullableNumber(value.classId),
  className: nullableText(value.className),
  sessionId: nullableNumber(value.sessionId),
  sessionLabel: nullableText(value.sessionLabel),
  title: String(value.title ?? ""),
  instructions: String(value.instructions ?? ""),
  sourceType:
    value.sourceType === "CLASS" || value.sourceType === "SESSION"
      ? value.sourceType
      : "DIRECT",
  assignedAtUtc: String(value.assignedAtUtc ?? ""),
});

const mapList = (value: HomeworkAssignmentResponse[]): HomeworkAssignmentDto[] =>
  value.map(mapHomeworkAssignment);

export const homeworkApi = {
  async assign(
    input: CreateHomeworkAssignmentInput,
  ): Promise<HomeworkAssignmentDto[]> {
    const response = await apiRequest<HomeworkAssignmentResponse[]>("/Homework", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return mapList(response);
  },

  async getCoachHistory(): Promise<HomeworkAssignmentDto[]> {
    return mapList(
      await apiRequest<HomeworkAssignmentResponse[]>("/Homework/coach/me"),
    );
  },

  async getMemberHistory(): Promise<HomeworkAssignmentDto[]> {
    return mapList(
      await apiRequest<HomeworkAssignmentResponse[]>("/Homework/member/me"),
    );
  },
};
