import type { ClassSession, ClassSessionStatus, CoachOption, Room, SessionRosterMember, TrainingClass } from "../types/classes";
import {
  CENTER_TIME_SLOTS,
  centerTimestamp,
  describeCapacityConflict,
  getCoachSlotAvailability,
  getRoomSlotAvailability,
  hasSessionStarted,
  matchesTimeSlot,
  minutesOfDay,
  timeRangesOverlap,
} from "./classSchedule";
import * as v from "./validation";

export type MakeupDraft = {
  date: string;
  slotId: string;
  coachId: string;
  roomId: string;
  reason: string;
};

export type MakeupReferences = {
  sessions: ClassSession[];
  coaches: CoachOption[];
  rooms: Room[];
  trainingClass?: TrainingClass;
};

export type SessionSchedule = Pick<ClassSession, "date" | "startTime" | "endTime">;

export type MakeupSessionRoster = {
  session: ClassSession;
  members: readonly SessionRosterMember[];
};

export type MakeupMemberConflict = {
  memberId: string;
  memberName: string;
  memberCode: string;
  sessions: ClassSession[];
};

export function makeupOverlapCandidates(
  sessions: readonly ClassSession[],
  sourceSessionId: string,
  target: SessionSchedule,
): ClassSession[] {
  return Array.from(new Map(sessions.filter((session) =>
    session.id !== sourceSessionId && session.status === "SCHEDULED" &&
    session.date === target.date && timeRangesOverlap(session, target),
  ).map((session) => [session.id, session])).values());
}

export function findMakeupMemberConflicts(
  sourceSessionId: string,
  target: SessionSchedule,
  sourceMembers: readonly SessionRosterMember[],
  rosters: readonly MakeupSessionRoster[],
): MakeupMemberConflict[] {
  const membersById = new Map(sourceMembers.filter((member) =>
    member.sessionId === sourceSessionId && member.status === "BOOKED" && member.memberId,
  ).map((member) => [member.memberId, member]));
  const candidateIds = new Set(makeupOverlapCandidates(
    rosters.map((roster) => roster.session), sourceSessionId, target,
  ).map((session) => session.id));
  const conflicts = new Map<string, MakeupMemberConflict>();
  for (const { session, members } of rosters) {
    if (!candidateIds.has(session.id)) continue;
    for (const member of members) {
      if (member.status !== "BOOKED" || member.sessionId !== session.id) continue;
      const source = membersById.get(member.memberId);
      if (!source) continue;
      let conflict = conflicts.get(source.memberId);
      if (!conflict) {
        conflict = {
          memberId: source.memberId,
          memberName: source.memberName,
          memberCode: source.memberCode,
          sessions: [],
        };
        conflicts.set(source.memberId, conflict);
      }
      if (!conflict.sessions.some((item) => item.id === session.id)) conflict.sessions.push(session);
    }
  }
  return Array.from(conflicts.values()).map((conflict) => ({
    ...conflict,
    sessions: conflict.sessions.sort((first, second) =>
      first.date.localeCompare(second.date) || first.startTime.localeCompare(second.startTime) || first.id.localeCompare(second.id),
    ),
  })).sort((first, second) => first.memberName.localeCompare(second.memberName, "vi") || first.memberId.localeCompare(second.memberId));
}

export type ScheduleCalendarEntry = {
  key: string;
  session: ClassSession;
  schedule: SessionSchedule;
  isHistorical: boolean;
  previousSchedule?: SessionSchedule;
  moveReason?: string;
};

export type CalendarStatusFilter = ClassSessionStatus | "RESCHEDULED" | "ALL";

const MOVE_NOTE_PATTERN = /^Dời lịch buổi (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})–(\d{2}:\d{2})\. Lý do: (.*)$/;

function movesFromNotes(notes: string): Array<SessionSchedule & { reason: string }> {
  return notes.split(/\r?\n/).flatMap((line) => {
    const match = MOVE_NOTE_PATTERN.exec(line);
    if (!match) return [];
    const [, date, startTime, endTime, reason] = match;
    const start = minutesOfDay(startTime);
    const end = minutesOfDay(endTime);
    if (v.reportDate(date) || start === null || end === null || start >= end) return [];
    return [{ date, startTime, endTime, reason }];
  });
}

function isSameSchedule(first: SessionSchedule, second: SessionSchedule): boolean {
  return first.date === second.date && first.startTime === second.startTime && first.endTime === second.endTime;
}

export function scheduleCalendarEntries(sessions: readonly ClassSession[]): ScheduleCalendarEntry[] {
  return sessions.flatMap((session) => {
    const moves = movesFromNotes(session.notes);
    const current: ScheduleCalendarEntry = {
      key: session.id,
      session,
      schedule: { date: session.date, startTime: session.startTime, endTime: session.endTime },
      isHistorical: false,
      previousSchedule: moves.at(-1),
    };
    const historical = new Map<string, ScheduleCalendarEntry>();
    for (const move of moves) {
      // Đây là dấu vết hiển thị, không tạo buổi học hay đăng ký thứ hai trên server.
      if (isSameSchedule(move, current.schedule)) continue;
      const key = `${session.id}:moved:${move.date}:${move.startTime}:${move.endTime}`;
      historical.set(key, { key, session, schedule: move, isHistorical: true, moveReason: move.reason });
    }
    return [current, ...historical.values()];
  }).sort((first, second) => first.schedule.date.localeCompare(second.schedule.date) ||
    first.schedule.startTime.localeCompare(second.schedule.startTime) || first.key.localeCompare(second.key));
}

export function filterCalendarEntries(
  entries: readonly ScheduleCalendarEntry[],
  filter: {
    from: string;
    to: string;
    slotId: string;
    status: CalendarStatusFilter;
    classId?: string;
    coachId?: string;
    roomId?: string;
  },
): ScheduleCalendarEntry[] {
  return entries.filter((entry) => {
    const { session, schedule, isHistorical } = entry;
    if (schedule.date < filter.from || schedule.date > filter.to || !matchesTimeSlot(schedule, filter.slotId)) return false;
    if (filter.classId && session.classId !== filter.classId) return false;
    if (filter.coachId && session.coachId !== filter.coachId) return false;
    if (filter.roomId && session.roomId !== filter.roomId) return false;
    if (filter.status === "ALL") return true;
    if (filter.status === "RESCHEDULED") return isHistorical || Boolean(entry.previousSchedule);
    return !isHistorical && session.status === filter.status;
  });
}

export function makeupNotes(session: ClassSession, reason: string): string {
  return [
    session.notes.trim(),
    `Dời lịch buổi ${session.date} ${session.startTime}–${session.endTime}. Lý do: ${reason.trim()}`,
  ].filter(Boolean).join("\n");
}

export function validateMakeupSchedule(
  draft: MakeupDraft,
  session: ClassSession,
  references: MakeupReferences,
  now = new Date(),
): Record<string, string> {
  const errors: Record<string, string> = v.validateForm(draft, {
    date: v.all(v.required("Ngày học bù"), v.reportDate),
    slotId: v.selected("khung giờ học bù"),
    coachId: v.selected("huấn luyện viên"),
    roomId: v.selected("phòng tập"),
    reason: v.all(v.required("Lý do đổi lịch"), v.minLength("Lý do đổi lịch", 3), v.maxLength("Lý do đổi lịch", 500)),
  });
  const slot = CENTER_TIME_SLOTS.find((item) => item.id === draft.slotId);
  if (!slot) errors.slotId = "Vui lòng chọn khung giờ có sẵn của trung tâm.";
  if (session.status !== "SCHEDULED" || !Number.isFinite(Date.parse(session.startsAt)) || hasSessionStarted(session, now)) {
    errors.session = "Buổi học đã hủy hoặc đã bắt đầu. Hãy tải lại lịch học.";
  }
  if (!references.trainingClass || references.trainingClass.status === "ARCHIVED") {
    errors.session = "Lớp học không còn hoạt động. Hãy tải lại danh sách lớp.";
  }
  if (slot && !errors.date) {
    if (new Date(centerTimestamp(draft.date, slot.startTime)).getTime() <= now.getTime()) {
      errors.date = "Lịch học bù phải ở tương lai. Hãy chọn lại ngày hoặc khung giờ.";
    } else if (draft.date === session.date && slot.startTime === session.startTime && slot.endTime === session.endTime) {
      errors.slotId = "Chọn ngày hoặc khung giờ khác với lịch học hiện tại.";
    }
  }
  if (makeupNotes(session, draft.reason).length > 500) {
    errors.reason = "Ghi chú hiện có và lý do đổi lịch vượt 500 ký tự. Hãy rút ngắn lý do hoặc chỉnh ghi chú buổi học trước.";
  }
  const coach = references.coaches.find((item) => item.id === draft.coachId);
  const room = references.rooms.find((item) => item.id === draft.roomId);
  if (!coach && !errors.coachId) errors.coachId = "Không tìm thấy huấn luyện viên. Hãy chọn lại.";
  if (!room && !errors.roomId) errors.roomId = "Không tìm thấy phòng tập. Hãy chọn lại.";
  if (slot && !errors.date) {
    const context = { ...slot, date: draft.date, sessions: references.sessions, excludeSessionId: session.id };
    if (coach) {
      const availability = getCoachSlotAvailability(coach, { ...context, sportName: session.sportName });
      if (!availability.isAvailable) errors.coachId = availability.reason;
    }
    if (room) {
      const availability = getRoomSlotAvailability(room, context);
      if (!availability.isAvailable) errors.roomId = availability.reason;
    }
    const classConflict = references.sessions.find((item) =>
      item.id !== session.id && item.status === "SCHEDULED" &&
      item.classId === session.classId && item.date === draft.date && timeRangesOverlap(item, slot),
    );
    if (classConflict) errors.slotId = "Lớp đã có buổi học trong khung giờ này. Hãy chọn khung giờ khác.";
  }
  if (room && references.trainingClass) {
    const capacityError = describeCapacityConflict({
      capacity: session.capacity,
      bookedCount: session.bookedCount,
      classCapacity: references.trainingClass.capacity,
      roomCapacity: room.capacity,
    });
    if (capacityError) errors.roomId = capacityError;
  }
  return errors;
}
