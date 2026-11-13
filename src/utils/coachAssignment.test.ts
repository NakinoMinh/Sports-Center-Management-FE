import { describe, expect, it } from "vitest";
import type { ClassSession, CoachOption } from "../types/assignCoach";
import type { TrainingClass } from "../types/classes";
import {
  getAssignableClassSessions,
  getClassAssignmentSummary,
  getClassCoachAvailability,
} from "./coachAssignment";

const NOW = new Date("2026-11-12T12:00:00+07:00");
const TRAINING_CLASS: TrainingClass = {
  id: "2", name: "Yoga cơ bản", sportId: "1", sportName: "Yoga",
  description: "", capacity: 15, status: "OPEN", upcomingSessionCount: 2,
  totalSessionCount: 2, activeRegistrationCount: 0, scheduleBlocks: [],
  createdAt: "", updatedAt: "",
};
const COACH: CoachOption = {
  accountId: "coach-new", fullName: "HLV mới", email: "", phone: null,
  status: "Active", workSchedule: null,
  disciplines: [{ disciplineId: 1, disciplineName: "Yoga", isActive: true }],
};

function session(overrides: Partial<ClassSession> = {}): ClassSession {
  return {
    id: 1, classId: 2, className: "Yoga cơ bản", sportId: 1, sportName: "Yoga",
    coachId: "coach-old", coachName: "HLV cũ", roomId: 1, roomName: "Phòng A",
    date: "2026-11-14", startTime: "08:00:00", endTime: "09:00:00",
    startsAt: "2026-11-14T08:00:00+07:00", endsAt: "2026-11-14T09:00:00+07:00",
    capacity: 15, bookedCount: 0, remainingCapacity: 15, status: "SCHEDULED", notes: null,
    ...overrides,
  };
}

describe("class coach assignment", () => {
  it("selects only future scheduled sessions of the requested class", () => {
    const sessions = [
      session(),
      session({ id: 2, classId: 3 }),
      session({ id: 3, status: "COMPLETED" }),
      session({ id: 4, status: "CANCELED" }),
      session({ id: 5, status: "ONGOING" }),
      session({ id: 6, startsAt: NOW.toISOString() }),
      session({ id: 7, startsAt: "2026-11-11T08:00:00+07:00" }),
      session({ id: 8, startsAt: "invalid" }),
    ];
    expect(getAssignableClassSessions(sessions, "2", NOW).map((item) => item.id)).toEqual([1]);
  });

  it("checks conflicts on later days of the class, not just the first session", () => {
    const sessions = [
      session(),
      session({ id: 2, date: "2026-11-16", startsAt: "2026-11-16T08:00:00+07:00" }),
      session({ id: 3, classId: 3, className: "Yoga nâng cao", coachId: COACH.accountId,
        date: "2026-11-16", startTime: "08:30:00", endTime: "09:30:00" }),
    ];
    expect(getClassCoachAvailability(COACH, TRAINING_CLASS, sessions, NOW)).toEqual({
      isAvailable: false,
      reason: "Trùng lịch lớp Yoga nâng cao ngày 16/11/2026.",
    });
  });

  it("rejects simultaneous sessions within the class even with different current coaches", () => {
    const result = getClassCoachAvailability(COACH, TRAINING_CLASS, [
      session(), session({ id: 2, coachId: "another-coach", startTime: "08:30:00" }),
    ], NOW);
    expect(result.isAvailable).toBe(false);
    expect(result.reason).toContain("Trùng lịch lớp Yoga cơ bản");
  });

  it("allows adjacent time ranges and ignores canceled or completed conflicts", () => {
    const result = getClassCoachAvailability(COACH, TRAINING_CLASS, [
      session(),
      session({ id: 2, classId: 3, coachId: COACH.accountId, startTime: "09:00:00", endTime: "10:00:00" }),
      session({ id: 3, classId: 3, coachId: COACH.accountId, status: "CANCELED" }),
      session({ id: 4, classId: 3, coachId: COACH.accountId, status: "COMPLETED" }),
    ], NOW);
    expect(result.isAvailable).toBe(true);
  });

  it("rejects a conflicting ongoing session", () => {
    expect(getClassCoachAvailability(COACH, TRAINING_CLASS, [
      session(), session({ id: 2, classId: 3, coachId: COACH.accountId, status: "ONGOING" }),
    ], NOW).isAvailable).toBe(false);
  });

  it("rejects inactive coaches and mismatched expertise", () => {
    expect(getClassCoachAvailability({ ...COACH, status: "Inactive" }, TRAINING_CLASS, [session()], NOW).isAvailable).toBe(false);
    expect(getClassCoachAvailability({ ...COACH,
      disciplines: [{ disciplineId: 2, disciplineName: "Bơi lội", isActive: true }],
    }, TRAINING_CLASS, [session()], NOW).isAvailable).toBe(false);
  });

  it("rejects archived classes and classes with no future sessions", () => {
    expect(getClassCoachAvailability(COACH, { ...TRAINING_CLASS, status: "ARCHIVED" }, [session()], NOW).isAvailable).toBe(false);
    expect(getClassCoachAvailability(COACH, TRAINING_CLASS, [], NOW).isAvailable).toBe(false);
  });

  it("allows completing a partial assignment, but rejects an unchanged whole class", () => {
    const assigned = session({ coachId: COACH.accountId });
    expect(getClassCoachAvailability(COACH, TRAINING_CLASS, [assigned], NOW).isAvailable).toBe(false);
    expect(getClassCoachAvailability(COACH, TRAINING_CLASS, [assigned,
      session({ id: 2, date: "2026-11-16", startsAt: "2026-11-16T08:00:00+07:00" }),
    ], NOW).isAvailable).toBe(true);
  });
});

describe("class assignment table summaries", () => {
  it("shows one coach only when every relevant session has the same assignment", () => {
    const summary = getClassAssignmentSummary("2", [session(), session({
      id: 2, date: "2026-11-16", startsAt: "2026-11-16T08:00:00+07:00",
    })], NOW);
    expect(summary).toMatchObject({ coachId: "coach-old", coachName: "HLV cũ", status: "SCHEDULED" });
  });

  it("does not display two session coaches or arbitrarily choose a class coach", () => {
    const summary = getClassAssignmentSummary("2", [session(), session({
      id: 2, coachId: COACH.accountId, coachName: COACH.fullName,
      date: "2026-11-16", startsAt: "2026-11-16T08:00:00+07:00",
    })], NOW);
    expect(summary).toMatchObject({ coachId: "", coachName: "" });
  });

  it("does not mix former coaches into a current class assignment", () => {
    const summary = getClassAssignmentSummary("2", [session(), session({
      id: 2, coachId: COACH.accountId, coachName: COACH.fullName,
      status: "COMPLETED", startsAt: "2026-11-10T08:00:00+07:00",
    })], NOW);
    expect(summary).toMatchObject({ coachId: "coach-old", coachName: "HLV cũ" });
  });

  it("keeps completed classes compact without using archive status or mixing historical coaches", () => {
    const summary = getClassAssignmentSummary("2", [
      session({ status: "COMPLETED", date: "2026-10-14" }),
      session({ id: 2, status: "COMPLETED", date: "2026-10-14", coachId: COACH.accountId, coachName: COACH.fullName }),
    ], NOW);
    expect(summary).toMatchObject({
      coachId: "", coachName: "", startDate: "2026-10-14", endDate: "2026-10-14", status: "COMPLETED",
    });
  });

  it("summarizes the class date range and room without exposing session slots", () => {
    const summary = getClassAssignmentSummary("2", [
      session({ date: "2026-11-20" }),
      session({ id: 2, date: "2026-11-14", roomId: 2, roomName: "Phòng B" }),
      session({ id: 3, classId: 3, date: "2026-12-25" }),
    ], NOW);
    expect(summary).toMatchObject({ startDate: "2026-11-14", endDate: "2026-11-20", roomName: "Nhiều phòng" });
    expect(summary.roomNames).toEqual(["Phòng A", "Phòng B"]);
  });

  it("preserves unassigned, ongoing, canceled and unscheduled class states", () => {
    expect(getClassAssignmentSummary("2", [session({ coachId: "" })], NOW).coachId).toBe("");
    expect(getClassAssignmentSummary("2", [session({ status: "ONGOING" })], NOW).status).toBe("ONGOING");
    expect(getClassAssignmentSummary("2", [session({ status: "CANCELED" })], NOW))
      .toMatchObject({ status: "CANCELED", roomName: "Phòng A" });
    expect(getClassAssignmentSummary("2", [], NOW).status).toBe("UNSCHEDULED");
  });
});
