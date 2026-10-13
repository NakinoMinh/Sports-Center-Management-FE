import { describe, expect, it } from "vitest";
import type { ClassRegistration, ClassSession } from "../types/classes";
import {
  addCalendarDays,
  canCancelRegistration,
  canRegisterSession,
  centerTimestamp,
  describeCapacityConflict,
  minutesOfDay,
  remainingSeats,
  sessionsOverlap,
  timeRangesOverlap,
  weekRangeOf,
  weekdayLabel,
} from "./classSchedule";

const session = (overrides: Partial<ClassSession> = {}): ClassSession => ({
  id: "session-1",
  classId: "class-1",
  className: "Yoga cân bằng",
  sportId: "sport-1",
  sportName: "Yoga",
  coachId: "coach-1",
  coachName: "Trần Thu Hà",
  roomId: "room-1",
  roomName: "Studio A",
  date: "2026-10-20",
  startTime: "08:00",
  endTime: "09:00",
  startsAt: "2026-10-20T08:00:00+07:00",
  endsAt: "2026-10-20T09:00:00+07:00",
  capacity: 15,
  bookedCount: 3,
  remainingCapacity: 12,
  status: "SCHEDULED",
  notes: "",
  updatedAt: "2026-10-11T02:00:00.000Z",
  ...overrides,
});

const beforeSession = new Date("2026-10-20T00:00:00+07:00");
const afterSession = new Date("2026-10-20T08:30:00+07:00");

describe("parsing center-time inputs", () => {
  it("reads a valid HH:mm and rejects anything else", () => {
    expect(minutesOfDay("08:30")).toBe(510);
    expect(minutesOfDay("00:00")).toBe(0);
    expect(minutesOfDay("24:00")).toBeNull();
    expect(minutesOfDay("8:30")).toBeNull();
    expect(minutesOfDay("")).toBeNull();
  });

  it("builds a timestamp that carries the center offset", () => {
    // Không có offset thì backend sẽ đọc 08:00 như giờ UTC và lệch 7 tiếng.
    expect(centerTimestamp("2026-10-20", "08:00")).toBe(
      "2026-10-20T08:00:00+07:00",
    );
  });
});

describe("overlap rule on half-open intervals", () => {
  it("treats back-to-back sessions as not overlapping", () => {
    expect(
      timeRangesOverlap(
        { startTime: "08:00", endTime: "09:00" },
        { startTime: "09:00", endTime: "10:00" },
      ),
    ).toBe(false);
  });

  it("detects a partial and a contained overlap", () => {
    expect(
      timeRangesOverlap(
        { startTime: "08:00", endTime: "09:00" },
        { startTime: "08:59", endTime: "10:00" },
      ),
    ).toBe(true);
    expect(
      timeRangesOverlap(
        { startTime: "08:00", endTime: "11:00" },
        { startTime: "09:00", endTime: "10:00" },
      ),
    ).toBe(true);
  });

  it("never reports an overlap across different days", () => {
    expect(
      sessionsOverlap(session(), session({ date: "2026-10-21" })),
    ).toBe(false);
    expect(sessionsOverlap(session(), session({ id: "session-2" }))).toBe(true);
  });
});

describe("calendar helpers", () => {
  it("shifts a date across a month boundary", () => {
    expect(addCalendarDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("anchors a week on Monday, including for a Sunday", () => {
    expect(weekRangeOf("2026-10-14")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    // Chủ nhật 18/10 vẫn thuộc tuần bắt đầu 12/10, không mở tuần mới.
    expect(weekRangeOf("2026-10-18")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
  });

  it("labels the weekday in Vietnamese", () => {
    expect(weekdayLabel("2026-10-12")).toBe("Thứ hai");
    expect(weekdayLabel("2026-10-18")).toBe("Chủ nhật");
  });
});

describe("seat counting", () => {
  it("prefers the server figure and never goes negative", () => {
    expect(remainingSeats(session())).toBe(12);
    expect(remainingSeats(session({ remainingCapacity: -2 }))).toBe(0);
  });
});

describe("registration availability", () => {
  it("allows a future session with free seats", () => {
    expect(canRegisterSession(session(), beforeSession).isAllowed).toBe(true);
  });

  it("blocks a full, a canceled and a started session", () => {
    expect(
      canRegisterSession(session({ remainingCapacity: 0 }), beforeSession),
    ).toEqual({ isAllowed: false, reason: "Buổi học đã đủ chỗ." });
    expect(
      canRegisterSession(session({ status: "CANCELED" }), beforeSession)
        .isAllowed,
    ).toBe(false);
    expect(canRegisterSession(session(), afterSession).isAllowed).toBe(false);
  });
});

describe("cancellation availability", () => {
  const registration = (
    overrides: Partial<ClassRegistration> = {},
  ): ClassRegistration => ({
    id: "registration-1",
    sessionId: "session-1",
    memberId: "member-1",
    memberName: "Nguyễn Văn A",
    memberCode: "MEM0001",
    status: "BOOKED",
    registeredAt: "2026-10-11T02:00:00.000Z",
    registeredVia: "MEMBER",
    registeredByName: "Nguyễn Văn A",
    session: session(),
    ...overrides,
  });

  it("allows cancelling before the session starts", () => {
    expect(canCancelRegistration(registration(), beforeSession).isAllowed).toBe(
      true,
    );
  });

  it("blocks a second cancellation and a started session", () => {
    expect(
      canCancelRegistration(registration({ status: "CANCELED" }), beforeSession)
        .isAllowed,
    ).toBe(false);
    expect(canCancelRegistration(registration(), afterSession).isAllowed).toBe(
      false,
    );
  });
});

describe("capacity rules for a session", () => {
  const base = { classCapacity: 15, roomCapacity: 20, bookedCount: 5 };

  it("accepts a capacity inside every limit", () => {
    expect(describeCapacityConflict({ ...base, capacity: 15 })).toBeNull();
  });

  it("rejects values above the class or room limit", () => {
    expect(describeCapacityConflict({ ...base, capacity: 16 })).toContain(
      "sức chứa lớp",
    );
    expect(
      describeCapacityConflict({ ...base, capacity: 25, classCapacity: 30 }),
    ).toContain("sức chứa phòng");
  });

  it("rejects a capacity below the active registrations", () => {
    expect(describeCapacityConflict({ ...base, capacity: 4 })).toContain(
      "5 người đăng ký",
    );
  });

  it("rejects a non-positive or fractional capacity", () => {
    expect(describeCapacityConflict({ ...base, capacity: 0 })).toBe(
      "Sức chứa phải là số nguyên dương.",
    );
    expect(describeCapacityConflict({ ...base, capacity: 7.5 })).toBe(
      "Sức chứa phải là số nguyên dương.",
    );
  });
});
