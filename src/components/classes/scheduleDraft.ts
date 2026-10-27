/**
 * Trạng thái form và quy tắc kiểm tra của khối lịch học, tách khỏi component để
 * `ClassForm` và `AssignClassForm` dùng chung mà file component chỉ export đúng
 * một component.
 */

import { CENTER_TIME_SLOTS, centerToday, countRecurrenceSessions } from "../../utils/classSchedule";
import * as v from "../../utils/validation";
import type { ClassScheduleInput, WeekDay } from "../../types/classes";

/** Trạng thái form của khối lịch: ID là chuỗi, ca học thay cho giờ tự do. */
export interface ScheduleDraft {
  coachId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: WeekDay[];
  slotId: string;
  sessionCapacity: string;
  notes: string;
}

export const emptyScheduleDraft = (): ScheduleDraft => ({
  coachId: "",
  roomId: "",
  startDate: centerToday(),
  endDate: "",
  daysOfWeek: [],
  slotId: "",
  sessionCapacity: "",
  notes: "",
});

const slotOf = (slotId: string) =>
  CENTER_TIME_SLOTS.find((slot) => slot.id === slotId) ?? null;

/**
 * Chuyển nháp thành payload gửi server. Trả về `null` khi chưa chọn ca học, để
 * phía gọi không gửi đi một lịch thiếu giờ.
 */
export const toScheduleInput = (
  draft: ScheduleDraft,
): ClassScheduleInput | null => {
  const slot = slotOf(draft.slotId);
  if (!slot) return null;
  const capacity = Number(draft.sessionCapacity);
  return {
    coachId: draft.coachId,
    roomId: draft.roomId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    daysOfWeek: draft.daysOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    sessionCapacity:
      draft.sessionCapacity.trim() && capacity > 0 ? capacity : undefined,
    notes: draft.notes,
  };
};

/**
 * Kiểm tra khối lịch ở client để người dùng biết sớm. Server kiểm lại tất cả:
 * trùng lịch giáo viên và phòng chỉ server mới biết chắc.
 */
export const validateScheduleDraft = (
  draft: ScheduleDraft,
  limits: { classCapacity: number; roomCapacity?: number },
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const today = centerToday();

  if (!draft.coachId) errors.coachId = "Chọn giáo viên đứng lớp.";
  if (!draft.roomId) errors.roomId = "Chọn phòng tập.";
  if (!draft.slotId) errors.slotId = "Chọn ca học.";
  if (draft.daysOfWeek.length === 0)
    errors.daysOfWeek = "Chọn ít nhất một thứ trong tuần.";

  if (!draft.startDate) errors.startDate = "Chọn ngày bắt đầu.";
  else if (draft.startDate < today)
    errors.startDate = "Ngày bắt đầu không được ở quá khứ.";

  if (!draft.endDate) errors.endDate = "Chọn ngày kết thúc.";
  else if (draft.startDate && draft.endDate < draft.startDate)
    errors.endDate = "Ngày kết thúc phải từ ngày bắt đầu trở đi.";

  if (
    !errors.startDate &&
    !errors.endDate &&
    !errors.daysOfWeek &&
    countRecurrenceSessions(
      draft.startDate,
      draft.endDate,
      draft.daysOfWeek,
    ) === 0
  )
    errors.daysOfWeek =
      "Khoảng thời gian đã chọn không có buổi nào ứng với các thứ này.";

  if (draft.sessionCapacity.trim()) {
    const capped = Math.min(
      limits.classCapacity || Number.MAX_SAFE_INTEGER,
      limits.roomCapacity ?? Number.MAX_SAFE_INTEGER,
    );
    const message = v.positiveInteger("Sức chứa buổi", {
      min: 1,
      max: Number.isFinite(capped) ? capped : 200,
    })(draft.sessionCapacity);
    if (message) errors.sessionCapacity = message;
  }

  return errors;
};
