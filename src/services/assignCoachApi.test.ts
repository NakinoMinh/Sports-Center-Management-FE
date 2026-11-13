import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassSession, CoachOption } from "../types/assignCoach";
import type { TrainingClass } from "../types/classes";
import { ApiError, apiRequest } from "./apiClient";
import { assignCoachApi, ClassCoachAssignmentError } from "./assignCoachApi";

vi.mock("./apiClient", async (importOriginal) => ({
  ...await importOriginal<typeof import("./apiClient")>(),
  apiRequest: vi.fn(),
}));

const TRAINING_CLASS: TrainingClass = {
  id: "2", name: "Yoga cơ bản", sportId: "1", sportName: "Yoga",
  description: "", capacity: 15, status: "OPEN", upcomingSessionCount: 3,
  totalSessionCount: 3, activeRegistrationCount: 0, scheduleBlocks: [],
  createdAt: "", updatedAt: "",
};
const COACH: CoachOption = {
  accountId: "coach-new", fullName: "HLV mới", email: "", phone: null,
  status: "Active", workSchedule: null,
  disciplines: [{ disciplineId: 1, disciplineName: "Yoga", isActive: true }],
};
const request = vi.mocked(apiRequest);

function session(id: number, overrides: Partial<ClassSession> = {}): ClassSession {
  const date = `2026-11-${13 + id}`;
  return {
    id, classId: 2, className: "Yoga cơ bản", sportId: 1, sportName: "Yoga",
    coachId: "coach-old", coachName: "HLV cũ", roomId: 1, roomName: "Phòng A",
    date, startTime: "08:00:00", endTime: "09:00:00",
    startsAt: `${date}T08:00:00+07:00`, endsAt: `${date}T09:00:00+07:00`,
    capacity: 15, bookedCount: 0, remainingCapacity: 15, status: "SCHEDULED", notes: null,
    ...overrides,
  };
}

function mockLists(sessions: ClassSession[], coaches = [COACH]) {
  request.mockImplementation(async (path) => {
    const items = path.startsWith("/ClassSession?") ? sessions : coaches;
    return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T12:00:00+07:00"));
  request.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("assign coach to a whole class", () => {
  it("updates every eligible session, skipping history, cancellations, other classes and unchanged coaches", async () => {
    mockLists([
      session(1), session(2), session(3, { coachId: COACH.accountId }),
      session(4, { status: "COMPLETED" }), session(5, { status: "CANCELED" }),
      session(6, { startsAt: "2026-11-11T08:00:00+07:00" }),
      session(7, { classId: 3 }), session(8, { startsAt: "invalid" }),
    ]);
    expect(await assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId)).toBe(2);
    expect(request.mock.calls.filter(([, init]) => init?.method === "PUT")).toEqual([
      ["/ClassSession/1/coach", { method: "PUT", body: JSON.stringify({ coachId: COACH.accountId }) }],
      ["/ClassSession/2/coach", { method: "PUT", body: JSON.stringify({ coachId: COACH.accountId }) }],
    ]);
  });

  it("checks freshly loaded schedules before making any updates", async () => {
    mockLists([session(1), session(2), session(3, {
      classId: 3, coachId: COACH.accountId, date: "2026-11-15",
    })]);
    await expect(assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId)).rejects.toThrow("Trùng lịch");
    expect(request.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("rechecks current coach status and rejects removed coaches before saving", async () => {
    mockLists([session(1)], [{ ...COACH, status: "Inactive" }]);
    await expect(assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId)).rejects.toThrow("ngừng hoạt động");
    mockLists([session(1)], []);
    await expect(assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId)).rejects.toThrow("không còn tồn tại");
    expect(request.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("stops on the first failure and reports the committed count and translated error", async () => {
    const sessions = [session(1), session(2), session(3)];
    mockLists(sessions);
    const listRequest = request.getMockImplementation()!;
    request.mockImplementation(async (path, init) => {
      if (path === "/ClassSession/2/coach") {
        throw new ApiError("Coach conflict", 409, "COACH_SCHEDULE_CONFLICT");
      }
      return listRequest(path, init);
    });
    const error = await assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ClassCoachAssignmentError);
    expect(error).toMatchObject({ updatedSessionCount: 1, totalSessionCount: 3 });
    expect((error as ClassCoachAssignmentError).message).toContain("1/3");
    expect((error as ClassCoachAssignmentError).message).not.toContain("Coach conflict");
    expect(request.mock.calls.some(([path]) => path === "/ClassSession/3/coach")).toBe(false);

    // Sau khi tải lại, thử lại chỉ đổi các buổi còn lại, không gửi lại buổi đã lưu.
    mockLists([{ ...sessions[0], coachId: COACH.accountId }, sessions[1], sessions[2]]);
    request.mockClear();
    expect(await assignCoachApi.assignClassCoach(TRAINING_CLASS, COACH.accountId)).toBe(2);
    expect(request.mock.calls.some(([path]) => path === "/ClassSession/1/coach")).toBe(false);
  });
});
