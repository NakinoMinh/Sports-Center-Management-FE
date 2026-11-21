import { describe, expect, it } from "vitest";
import type { ClassSession, Room, SessionRosterMember, TrainingClass } from "../types/classes";
import {
  findMakeupMemberConflicts,
  filterCalendarEntries,
  makeupOverlapCandidates,
  makeupNotes,
  scheduleCalendarEntries,
  validateMakeupSchedule,
  type CalendarStatusFilter,
  type MakeupDraft,
  type MakeupReferences,
  type MakeupSessionRoster,
} from "./makeupSchedule";

const NOW = new Date("2026-11-21T10:00:00+07:00");
const SESSION: ClassSession = {
  id: "1", classId: "10", className: "Yoga sáng", sportId: "2", sportName: "Yoga",
  coachId: "coach-1", coachName: "HLV An", roomId: "room-1", roomName: "Studio",
  date: "2026-11-23", startTime: "08:00", endTime: "09:00",
  startsAt: "2026-11-23T08:00:00+07:00", endsAt: "2026-11-23T09:00:00+07:00",
  status: "SCHEDULED", capacity: 20, bookedCount: 7, remainingCapacity: 13,
  notes: "Mang thảm tập", updatedAt: "2026-11-20T00:00:00Z",
};
const TRAINING_CLASS: TrainingClass = {
  id: "10", name: "Yoga sáng", sportId: "2", sportName: "Yoga", description: "",
  capacity: 20, status: "OPEN", upcomingSessionCount: 10, totalSessionCount: 10,
  activeRegistrationCount: 7, scheduleBlocks: [], createdAt: "", updatedAt: "",
};
const ROOM: Room = { id: "room-1", name: "Studio", capacity: 20, location: "", isActive: true };
const DRAFT: MakeupDraft = {
  date: "2026-12-02", slotId: "SLOT_2", coachId: "coach-1", roomId: "room-1", reason: "HLV nghỉ bệnh",
};
function references(sessions: ClassSession[] = []): MakeupReferences {
  return { sessions, trainingClass: TRAINING_CLASS, rooms: [ROOM],
    coaches: [{ id: "coach-1", fullName: "HLV An", isActive: true, specializations: ["Yoga"] }] };
}
const validate = (draft = DRAFT, data = references(), session = SESSION) =>
  validateMakeupSchedule(draft, session, data, NOW);

describe("makeup member conflict details", () => {
  const target = { date: DRAFT.date, startTime: "08:00", endTime: "09:00" };
  const busy = (overrides: Partial<ClassSession> = {}): ClassSession => ({
    ...SESSION, id: "2", classId: "20", className: "Cardio sáng", date: target.date,
    coachId: "other-coach", roomId: "other-room", ...overrides,
  });
  const member = (sessionId: string, memberId = "member-a", overrides: Partial<SessionRosterMember> = {}): SessionRosterMember => ({
    id: `${sessionId}:${memberId}`, sessionId, memberId, memberName: "Nguyễn An", memberCode: "HV001",
    status: "BOOKED", registeredVia: "MEMBER", registeredAt: "", ...overrides,
  });
  const find = (source: SessionRosterMember[], rosters: MakeupSessionRoster[]) =>
    findMakeupMemberConflicts(SESSION.id, target, source, rosters);

  it("matches member IDs rather than names and includes the conflicting class and time", () => {
    const source = [member(SESSION.id), member(SESSION.id, "same-name", { memberCode: "HV002" })];
    const conflict = busy({ startTime: "08:30", endTime: "09:30" });
    const found = find(source, [{ session: conflict, members: [member(conflict.id), member(conflict.id, "unrelated")] }]);
    expect(found).toEqual([{
      memberId: "member-a", memberName: "Nguyễn An", memberCode: "HV001", sessions: [conflict],
    }]);
  });

  it("groups every affected member and retains multiple overlapping sessions", () => {
    const source = [member(SESSION.id, "b", { memberName: "Bình" }), member(SESSION.id, "a", { memberName: "An" })];
    const first = busy({ id: "early", startTime: "07:45", endTime: "08:15" });
    const second = busy({ id: "late", startTime: "08:45", endTime: "09:15" });
    const found = find(source, [
      { session: second, members: [member(second.id, "a"), member(second.id, "b")] },
      { session: first, members: [member(first.id, "a")] },
    ]);
    expect(found.map((item) => item.memberId)).toEqual(["a", "b"]);
    expect(found[0].sessions.map((item) => item.id)).toEqual(["early", "late"]);
    expect(found[1].sessions.map((item) => item.id)).toEqual(["late"]);
  });

  it("ignores adjacent slots, different dates, inactive sessions and the original session", () => {
    const overlap = busy({ startTime: "08:30", endTime: "09:30" });
    const sessions = [
      busy({ id: SESSION.id }), busy({ id: "before", startTime: "07:00", endTime: "08:00" }),
      busy({ id: "after", startTime: "09:00", endTime: "10:00" }),
      busy({ id: "other-date", date: "2026-12-03" }), busy({ id: "canceled", status: "CANCELED" }),
      busy({ id: "completed", status: "COMPLETED" }), overlap,
    ];
    expect(makeupOverlapCandidates(sessions, SESSION.id, target)).toEqual([overlap]);
    expect(find([member(SESSION.id)], sessions.map((session) => ({ session, members: [member(session.id)] })))[0].sessions).toEqual([overlap]);
  });

  it("ignores canceled registrations on either session and unrelated roster entries", () => {
    const session = busy();
    expect(find([member(SESSION.id, "member-a", { status: "CANCELED" })], [
      { session, members: [member(session.id)] },
    ])).toEqual([]);
    expect(find([member(SESSION.id)], [
      { session, members: [member(session.id, "member-a", { status: "CANCELED" }), member("wrong-session")] },
    ])).toEqual([]);
    expect(find([member("wrong-session"), member(SESSION.id, "")], [
      { session, members: [member(session.id), member(session.id, "")] },
    ])).toEqual([]);
  });

  it("deduplicates member and session entries without changing input data", () => {
    const session = busy();
    const source = [member(SESSION.id), member(SESSION.id)];
    const rosters = [
      { session, members: [member(session.id), member(session.id)] },
      { session, members: [member(session.id)] },
    ];
    const snapshot = JSON.stringify({ source, rosters });
    expect(makeupOverlapCandidates([session, session], SESSION.id, target)).toHaveLength(1);
    const found = find(source, rosters);
    expect(found).toHaveLength(1);
    expect(found[0].sessions).toHaveLength(1);
    expect(JSON.stringify({ source, rosters })).toBe(snapshot);
  });

  it("returns no names when no members hold matching active registrations", () => {
    expect(find([], [{ session: busy(), members: [member("2")] }])).toEqual([]);
    expect(find([member(SESSION.id)], [])).toEqual([]);
    expect(find([member(SESSION.id)], [{ session: busy(), members: [member("2", "other")] }])).toEqual([]);
  });
});

describe("makeup schedule business rules", () => {
  it("allows a free slot outside the displayed week and preserves notes", () => {
    expect(validate()).toEqual({});
    expect(makeupNotes(SESSION, ` ${DRAFT.reason} `)).toBe(
      "Mang thảm tập\nDời lịch buổi 2026-11-23 08:00–09:00. Lý do: HLV nghỉ bệnh",
    );
    expect(SESSION.notes).toBe("Mang thảm tập");
  });

  it("blocks a coach occupied by another class even when that class uses another room", () => {
    const busy = { ...SESSION, id: "2", classId: "99", className: "Pilates", roomId: "other-room", date: DRAFT.date };
    expect(validate(DRAFT, references([busy])).coachId).toContain("Trùng lịch lớp Pilates");
  });

  it("detects partially overlapping times, not only matching slot IDs", () => {
    const busy = { ...SESSION, id: "2", classId: "99", roomId: "other-room", date: DRAFT.date, startTime: "08:30", endTime: "09:30" };
    expect(validate(DRAFT, references([busy])).coachId).toContain("Trùng lịch");
  });

  it("blocks a room occupied by another coach", () => {
    const busy = { ...SESSION, id: "2", classId: "99", coachId: "other-coach", date: DRAFT.date };
    expect(validate(DRAFT, references([busy])).roomId).toContain("Đang dùng");
  });

  it("blocks overlapping sessions of the same class with different coaches and rooms", () => {
    const busy = { ...SESSION, id: "2", roomId: "other-room", coachId: "other-coach", date: DRAFT.date };
    expect(validate(DRAFT, references([busy])).slotId).toContain("Lớp đã có buổi học");
  });

  it("allows adjacent sessions and ignores canceled sessions and the session being moved", () => {
    const adjacent = { ...SESSION, id: "2", date: DRAFT.date, startTime: "09:00", endTime: "10:00" };
    const canceled = { ...SESSION, id: "3", date: DRAFT.date, status: "CANCELED" as const };
    expect(validate(DRAFT, references([adjacent, canceled, { ...SESSION, date: DRAFT.date }]))).toEqual({});
  });

  it("catches a conflict added after the initial availability check", () => {
    expect(validate()).toEqual({});
    const added = { ...SESSION, id: "new", classId: "99", date: DRAFT.date };
    expect(validate(DRAFT, references([added])).coachId).toBeTruthy();
  });

  it.each(["", "2026-02-30", "invalid", "2026-11-20"])("rejects an invalid or past date: %s", (date) => {
    expect(validate({ ...DRAFT, date }).date).toBeTruthy();
  });

  it("rejects a slot that already started today, including the exact start instant", () => {
    const draft = { ...DRAFT, date: "2026-11-21" };
    expect(validate(draft).date).toBeTruthy();
    expect(validateMakeupSchedule(draft, SESSION, references(), new Date("2026-11-21T08:00:00+07:00")).date).toBeTruthy();
  });

  it("requires a different date or time and a predefined slot", () => {
    expect(validate({ ...DRAFT, date: SESSION.date }).slotId).toBeTruthy();
    expect(validate({ ...DRAFT, slotId: "CUSTOM" }).slotId).toBeTruthy();
  });

  it.each(["", " a ", "x".repeat(501)])("rejects an invalid reason", (reason) => {
    expect(validate({ ...DRAFT, reason }).reason).toBeTruthy();
  });

  it("rejects notes that would exceed the server limit without truncating the existing note", () => {
    const original = { ...SESSION, notes: "x".repeat(480) };
    expect(validate(DRAFT, references(), original).reason).toContain("500");
    expect(makeupNotes(original, DRAFT.reason)).toContain(original.notes);
  });

  it("blocks missing or inactive coaches and rooms", () => {
    expect(validate({ ...DRAFT, coachId: "missing" }).coachId).toBeTruthy();
    expect(validate({ ...DRAFT, roomId: "missing" }).roomId).toBeTruthy();
    const data = references();
    data.coaches[0].isActive = false;
    data.rooms = [{ ...ROOM, isActive: false }];
    expect(validate(DRAFT, data).coachId).toContain("ngừng hoạt động");
    expect(validate(DRAFT, data).roomId).toContain("ngừng hoạt động");
  });

  it("blocks coaches with a different specialization", () => {
    const data = references();
    data.coaches[0].specializations = ["Boxing"];
    expect(validate(DRAFT, data).coachId).toContain("Khác chuyên môn");
  });

  it("preserves session capacity and rejects smaller rooms even if current members would fit", () => {
    const data = references();
    data.rooms = [{ ...ROOM, capacity: 10 }];
    expect(validate(DRAFT, data).roomId).toContain("sức chứa phòng");
    expect(validate(DRAFT, references(), { ...SESSION, bookedCount: 21 }).roomId).toBeTruthy();
  });

  it("blocks archived or missing classes, while allowing existing bookings in a closed class", () => {
    expect(validate(DRAFT, { ...references(), trainingClass: undefined }).session).toBeTruthy();
    expect(validate(DRAFT, { ...references(), trainingClass: { ...TRAINING_CLASS, status: "ARCHIVED" } }).session).toBeTruthy();
    expect(validate(DRAFT, { ...references(), trainingClass: { ...TRAINING_CLASS, status: "CLOSED" } })).toEqual({});
  });

  it.each(["CANCELED", "COMPLETED"] as const)("blocks a %s original session", (status) => {
    expect(validate(DRAFT, references(), { ...SESSION, status }).session).toBeTruthy();
  });

  it("blocks an original session that started while the dialog was open", () => {
    expect(validateMakeupSchedule(DRAFT, SESSION, references(), new Date(SESSION.startsAt)).session).toBeTruthy();
  });

  it("blocks an original session whose start timestamp cannot be verified", () => {
    expect(validate(DRAFT, references(), { ...SESSION, startsAt: "" }).session).toBeTruthy();
  });
});

describe("canceled and rescheduled calendar entries", () => {
  const moved = (overrides: Partial<ClassSession> = {}): ClassSession => ({
    ...SESSION,
    date: DRAFT.date,
    startsAt: `${DRAFT.date}T08:00:00+07:00`,
    endsAt: `${DRAFT.date}T09:00:00+07:00`,
    notes: makeupNotes(SESSION, DRAFT.reason),
    ...overrides,
  });
  const filter = (status: CalendarStatusFilter = "ALL") => ({
    from: "2026-11-01", to: "2026-12-31", slotId: "ALL", status,
  });

  it("keeps a canceled session on its date without creating a replacement", () => {
    const canceled = { ...SESSION, status: "CANCELED" as const, bookedCount: 0, cancelReason: "HLV nghỉ" };
    const entries = scheduleCalendarEntries([canceled]);
    expect(entries).toHaveLength(1);
    expect(entries[0].isHistorical).toBe(false);
    expect(entries[0].schedule.date).toBe(SESSION.date);
    expect(entries[0].session.status).toBe("CANCELED");
    expect(filterCalendarEntries(entries, filter("CANCELED"))).toHaveLength(1);
  });

  it("reconstructs the old slot from persisted notes and preserves the actual session", () => {
    const current = moved();
    const snapshot = JSON.stringify(current);
    const entries = scheduleCalendarEntries([current]);
    expect(entries).toHaveLength(2);
    const old = entries.find((entry) => entry.isHistorical);
    expect(old?.schedule).toMatchObject({ date: SESSION.date, startTime: "08:00", endTime: "09:00" });
    expect(old?.session).toBe(current);
    expect(old?.moveReason).toBe(DRAFT.reason);
    const actual = entries.find((entry) => !entry.isHistorical);
    expect(actual?.schedule.date).toBe(DRAFT.date);
    expect(actual?.previousSchedule?.date).toBe(SESSION.date);
    expect(actual?.session.bookedCount).toBe(7);
    expect(JSON.stringify(current)).toBe(snapshot);
    expect(scheduleCalendarEntries([JSON.parse(snapshot) as ClassSession])).toEqual(entries);
  });

  it("shows the old card even if the new date is outside the requested week", () => {
    const entries = scheduleCalendarEntries([moved()]);
    const oldWeek = filterCalendarEntries(entries, { ...filter(), from: "2026-11-23", to: "2026-11-29" });
    expect(oldWeek).toHaveLength(1);
    expect(oldWeek[0].isHistorical).toBe(true);
    expect(oldWeek[0].session.date).toBe(DRAFT.date);
    const newWeek = filterCalendarEntries(entries, { ...filter(), from: "2026-11-30", to: "2026-12-06" });
    expect(newWeek).toHaveLength(1);
    expect(newWeek[0].isHistorical).toBe(false);
  });

  it("keeps the old slot when moving to another slot on the same date", () => {
    const entries = scheduleCalendarEntries([moved({ date: SESSION.date, startTime: "09:00", endTime: "10:00" })]);
    expect(entries).toHaveLength(2);
    const oldSlot = filterCalendarEntries(entries, { ...filter(), slotId: "SLOT_2" });
    const newSlot = filterCalendarEntries(entries, { ...filter(), slotId: "SLOT_3" });
    expect(oldSlot[0].isHistorical).toBe(true);
    expect(newSlot[0].isHistorical).toBe(false);
  });

  it("retains every previous slot after repeated moves and points them to the current schedule", () => {
    const firstMove = moved();
    const latest = { ...firstMove, date: "2026-12-10", notes: makeupNotes(firstMove, "Đổi phòng") };
    const entries = scheduleCalendarEntries([latest]);
    expect(entries.filter((entry) => entry.isHistorical).map((entry) => entry.schedule.date)).toEqual([SESSION.date, DRAFT.date]);
    expect(entries.find((entry) => !entry.isHistorical)?.previousSchedule?.date).toBe(DRAFT.date);
    expect(entries.every((entry) => entry.session.date === "2026-12-10")).toBe(true);
  });

  it("does not double count registrations or create duplicate React keys", () => {
    const current = moved();
    current.notes += `\n${makeupNotes({ ...SESSION, notes: "" }, DRAFT.reason)}`;
    const entries = scheduleCalendarEntries([current]);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length);
    const actual = entries.filter((entry) => !entry.isHistorical);
    expect(actual).toHaveLength(1);
    expect(actual.reduce((total, entry) => total + entry.session.bookedCount, 0)).toBe(7);
  });

  it("does not create a second card if a session returns to its original slot", () => {
    const firstMove = moved();
    const returned = { ...SESSION, notes: makeupNotes(firstMove, "Trở lại lịch đầu") };
    const entries = scheduleCalendarEntries([returned]);
    expect(entries.filter((entry) => entry.schedule.date === SESSION.date)).toHaveLength(1);
    expect(entries.filter((entry) => entry.isHistorical)).toHaveLength(1);
  });

  it("keeps the new cancellation state when a previously moved session is later canceled", () => {
    const entries = scheduleCalendarEntries([moved({ status: "CANCELED", bookedCount: 0 })]);
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => !entry.isHistorical)?.session.status).toBe("CANCELED");
    expect(filterCalendarEntries(entries, filter("SCHEDULED"))).toHaveLength(0);
    expect(filterCalendarEntries(entries, filter("CANCELED"))).toHaveLength(1);
  });

  it("filters current states separately from historical slots", () => {
    const entries = scheduleCalendarEntries([moved(), { ...SESSION, id: "canceled", status: "CANCELED" }]);
    expect(filterCalendarEntries(entries, filter("RESCHEDULED"))).toHaveLength(2);
    expect(filterCalendarEntries(entries, filter("SCHEDULED"))).toHaveLength(1);
    expect(filterCalendarEntries(entries, filter("CANCELED"))).toHaveLength(1);
    expect(filterCalendarEntries(entries, { ...filter(), classId: "other" })).toHaveLength(0);
    expect(filterCalendarEntries(entries, { ...filter(), coachId: "other" })).toHaveLength(0);
    expect(filterCalendarEntries(entries, { ...filter(), roomId: "other" })).toHaveLength(0);
  });

  it.each([
    "Ghi chú thông thường",
    "Dời lịch buổi 2026-02-30 08:00–09:00. Lý do: Bù",
    "Dời lịch buổi 2026-11-23 25:00–26:00. Lý do: Bù",
    "Dời lịch buổi 2026-11-23 09:00–08:00. Lý do: Bù",
  ])("ignores ordinary notes and malformed old schedules", (notes) => {
    expect(scheduleCalendarEntries([moved({ notes })])).toHaveLength(1);
  });
});
