/**
 * Trạng thái form và quy tắc kiểm tra của khối lịch học, tách khỏi component để
 * `ClassForm` và `AssignClassForm` dùng chung mà file component chỉ export đúng
 * một component.
 */

import {
  CENTER_TIME_SLOTS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  centerToday,
  countRecurrenceSessions,
  timeRangesOverlap,
} from "../../utils/classSchedule";
import type { ClassScheduleInput, WeekDay } from "../../types/classes";

/** Cấu hình của một buổi học / ca học trong tuần. */
export interface ScheduleSessionItem {
  id: string;
  slotId: string;
  daysOfWeek: WeekDay[];
}

/** Trạng thái form của khối lịch: hỗ trợ nhiều buổi học với ca học và thứ khác nhau. */
export interface ScheduleDraft {
  coachId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  sessions: ScheduleSessionItem[];
  notes: string;
  /** Tương thích ngược */
  slotId?: string;
  /** Tương thích ngược */
  daysOfWeek?: WeekDay[];
  /** Đã bỏ theo yêu cầu, giữ trường tùy chọn nếu còn nơi tham chiếu */
  sessionCapacity?: string;
}

export const createEmptySessionItem = (): ScheduleSessionItem => ({
  id: Math.random().toString(36).slice(2, 9),
  slotId: "",
  daysOfWeek: [],
});

export const emptyScheduleDraft = (): ScheduleDraft => {
  const initialSession = createEmptySessionItem();
  return {
    coachId: "",
    roomId: "",
    startDate: centerToday(),
    endDate: "",
    sessions: [initialSession],
    notes: "",
    slotId: "",
    daysOfWeek: [],
    sessionCapacity: "",
  };
};

const slotOf = (slotId: string) =>
  CENTER_TIME_SLOTS.find((slot) => slot.id === slotId) ?? null;

/**
 * Chuyển các buổi học thành danh sách `ClassScheduleInput`.
 * Sức chứa mỗi buổi học sẽ tự động lấy theo sức chứa lớp nếu được truyền vào.
 */
export const toScheduleInputs = (
  draft: ScheduleDraft,
  classCapacity?: number,
): ClassScheduleInput[] => {
  const sessions = draft.sessions && draft.sessions.length > 0
    ? draft.sessions
    : draft.slotId
      ? [{ id: "legacy", slotId: draft.slotId, daysOfWeek: draft.daysOfWeek ?? [] }]
      : [];

  const results: ClassScheduleInput[] = [];

  for (const session of sessions) {
    const slot = slotOf(session.slotId);
    if (!slot || session.daysOfWeek.length === 0) continue;
    results.push({
      coachId: draft.coachId,
      roomId: draft.roomId,
      startDate: draft.startDate,
      endDate: draft.endDate,
      daysOfWeek: session.daysOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      sessionCapacity: classCapacity && classCapacity > 0 ? classCapacity : undefined,
      notes: draft.notes,
    });
  }

  return results;
};

/**
 * Lấy buổi học đầu tiên để tương thích với các luồng chỉ nhận một lịch đơn.
 */
export const toScheduleInput = (
  draft: ScheduleDraft,
  classCapacity?: number,
): ClassScheduleInput | null => {
  const inputs = toScheduleInputs(draft, classCapacity);
  return inputs[0] ?? null;
};

/**
 * Kiểm tra khối lịch ở client để người dùng biết sớm:
 * - Bắt buộc giáo viên, phòng, ngày bắt đầu, ngày kết thúc.
 * - Từng buổi học phải có ca học và ít nhất một thứ.
 * - Validate trùng lặp: nếu hai buổi học có khung giờ trùng nhau và chọn cùng thứ thì báo lỗi.
 * - Sức chứa mỗi buổi đã bỏ nên không kiểm tra sessionCapacity.
 */
export const validateScheduleDraft = (
  draft: ScheduleDraft,
  _limits: { classCapacity?: number; roomCapacity?: number } = {},
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const today = centerToday();

  if (!draft.coachId) errors.coachId = "Chọn giáo viên đứng lớp.";
  if (!draft.roomId) errors.roomId = "Chọn phòng tập.";

  if (!draft.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  else if (draft.startDate < today)
    errors.startDate = "Ngày bắt đầu không được ở quá khứ.";

  if (!draft.endDate) errors.endDate = "Chọn ngày kết thúc.";
  else if (draft.startDate && draft.endDate < draft.startDate)
    errors.endDate = "Ngày kết thúc phải từ ngày bắt đầu trở đi.";

  const sessions = draft.sessions && draft.sessions.length > 0
    ? draft.sessions
    : draft.slotId
      ? [{ id: "legacy", slotId: draft.slotId, daysOfWeek: draft.daysOfWeek ?? [] }]
      : [];

  if (sessions.length === 0) {
    errors.sessions = "Cần ít nhất một buổi học.";
  } else {
    // Kiểm tra từng buổi
    sessions.forEach((session, idx) => {
      const prefix = `sessions[${idx}]`;
      if (!session.slotId) {
        errors[`${prefix}.slotId`] = "Chọn ca học.";
        if (idx === 0) errors.slotId = "Chọn ca học.";
      }
      if (!session.daysOfWeek || session.daysOfWeek.length === 0) {
        errors[`${prefix}.daysOfWeek`] = "Chọn ít nhất một thứ trong tuần.";
        if (idx === 0) errors.daysOfWeek = "Chọn ít nhất một thứ trong tuần.";
      } else if (
        !errors.startDate &&
        !errors.endDate &&
        countRecurrenceSessions(draft.startDate, draft.endDate, session.daysOfWeek) === 0
      ) {
        errors[`${prefix}.daysOfWeek`] =
          "Khoảng thời gian đã chọn không có buổi nào ứng với các thứ này.";
      }
    });

    // Validate trùng lặp khung giờ và thứ giữa các buổi học
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const s1 = sessions[i];
        const s2 = sessions[j];
        if (!s1.slotId || !s2.slotId) continue;

        const slot1 = slotOf(s1.slotId);
        const slot2 = slotOf(s2.slotId);
        if (!slot1 || !slot2) continue;

        const isOverlap = slot1.id === slot2.id || timeRangesOverlap(slot1, slot2);
        if (isOverlap) {
          const commonDays = s1.daysOfWeek.filter((d) => s2.daysOfWeek.includes(d));
          if (commonDays.length > 0) {
            const dayNames = commonDays.map((d) => WEEKDAY_NAMES[d] || WEEKDAY_SHORT_NAMES[d]).join(", ");
            const errorMsg = `Buổi ${i + 1} và Buổi ${j + 1} bị trùng khung giờ (${slot1.name} / ${slot2.name}) vào các thứ: ${dayNames}.`;
            errors[`sessions[${j}].conflict`] = errorMsg;
            errors.scheduleConflict = errorMsg;
          }
        }
      }
    }
  }

  return errors;
};
