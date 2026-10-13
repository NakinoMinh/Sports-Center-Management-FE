/**
 * Hàm thuần dùng chung cho lớp học và lịch học (UC19, UC21, UC24, UC25, UC30).
 *
 * Tất cả quy tắc ở đây chỉ để người dùng biết sớm. Server vẫn là nơi quyết
 * định: một buổi học có thể bị người khác đặt nốt chỗ cuối hoặc bị hủy giữa
 * lúc màn hình đang mở, nên kết quả của các hàm này không được coi là bảo đảm.
 */

import type {
  ClassRegistration,
  ClassSession,
  ClassSessionStatus,
} from "../types/classes";

/** Giờ trung tâm. Timestamp gửi/nhận luôn kèm offset để khỏi lệch múi giờ. */
export const CENTER_UTC_OFFSET = "+07:00";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Số phút từ 00:00, hoặc null khi chuỗi không đúng dạng `HH:mm`. */
export const minutesOfDay = (time: string): number | null => {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** Timestamp có offset cho một ngày/giờ trung tâm: "2026-10-14T08:00:00+07:00". */
export const centerTimestamp = (date: string, time: string): string =>
  `${date}T${time}:00${CENTER_UTC_OFFSET}`;

/** "08:00 – 09:30" */
export const formatTimeRange = (startTime: string, endTime: string): string =>
  `${startTime} – ${endTime}`;

/** Ngày lệch `days` ngày so với `date`, giữ dạng `YYYY-MM-DD`. */
export const addCalendarDays = (date: string, days: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

/** Ngày hôm nay theo giờ trung tâm, dạng `YYYY-MM-DD`. */
export const centerToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Thứ hai đến chủ nhật của tuần chứa `date`. */
export const weekRangeOf = (date: string): { from: string; to: string } => {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return { from: date, to: date };
  // getUTCDay(): 0 = chủ nhật, nên chủ nhật phải lùi 6 ngày chứ không phải 0.
  const weekday = value.getUTCDay();
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  const from = addCalendarDays(date, offsetToMonday);
  return { from, to: addCalendarDays(from, 6) };
};

/** Nhãn tiếng Việt cho ngày trong tuần, ví dụ "Thứ ba". */
export const weekdayLabel = (date: string): string => {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return "—";
  return [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ][value.getUTCDay()];
};

/**
 * Hai khoảng giờ trong cùng một ngày có trùng nhau không.
 *
 * Khoảng là nửa mở [start, end): buổi kết thúc 09:00 không trùng buổi bắt đầu
 * 09:00, theo quy tắc đã chốt ở Sprint2.md §6. Dùng chung cho Coach, phòng và
 * thành viên để ba chỗ không mỗi nơi hiểu một kiểu.
 */
export const timeRangesOverlap = (
  first: { startTime: string; endTime: string },
  second: { startTime: string; endTime: string },
): boolean => {
  const firstStart = minutesOfDay(first.startTime);
  const firstEnd = minutesOfDay(first.endTime);
  const secondStart = minutesOfDay(second.startTime);
  const secondEnd = minutesOfDay(second.endTime);
  if (
    firstStart === null ||
    firstEnd === null ||
    secondStart === null ||
    secondEnd === null
  )
    return false;
  return firstStart < secondEnd && secondStart < firstEnd;
};

/** Trùng giờ khi cùng ngày và khoảng giờ giao nhau. */
export const sessionsOverlap = (
  first: Pick<ClassSession, "date" | "startTime" | "endTime">,
  second: Pick<ClassSession, "date" | "startTime" | "endTime">,
): boolean => first.date === second.date && timeRangesOverlap(first, second);

export const sessionStatusLabels: Record<ClassSessionStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  CANCELED: "Đã hủy",
  COMPLETED: "Đã diễn ra",
};

export const classStatusLabels: Record<string, string> = {
  DRAFT: "Nháp",
  OPEN: "Đang nhận đăng ký",
  CLOSED: "Ngừng nhận đăng ký",
  ARCHIVED: "Đã lưu trữ",
};

/** Lớp ở đúng tình trạng kinh doanh để nhận đăng ký mới. */
export const isClassBookable = (status: string): boolean => status === "OPEN";

/** Buổi học đã bắt đầu theo mốc server trả về. */
export const hasSessionStarted = (
  session: Pick<ClassSession, "startsAt">,
  now: Date = new Date(),
): boolean => {
  const start = new Date(session.startsAt).getTime();
  return !Number.isNaN(start) && start <= now.getTime();
};

/** Chỗ còn lại, không bao giờ âm dù server và FE lệch nhau một nhịp. */
export const remainingSeats = (
  session: Pick<ClassSession, "capacity" | "bookedCount" | "remainingCapacity">,
): number =>
  Math.max(
    0,
    Number.isFinite(session.remainingCapacity)
      ? session.remainingCapacity
      : session.capacity - session.bookedCount,
  );

export interface ActionAvailability {
  /** FE có nên cho bấm nút không. Server vẫn kiểm tra lại. */
  isAllowed: boolean;
  /** Lý do bị chặn, hiển thị ngay cạnh nút. */
  reason: string;
}

const allowed: ActionAvailability = { isAllowed: true, reason: "" };

/** Điều kiện FE thấy được trước khi gọi API đăng ký (UC24, UC29). */
export const canRegisterSession = (
  session: ClassSession,
  now: Date = new Date(),
): ActionAvailability => {
  if (session.status === "CANCELED")
    return { isAllowed: false, reason: "Buổi học đã bị hủy." };
  if (session.status === "COMPLETED" || hasSessionStarted(session, now))
    return { isAllowed: false, reason: "Buổi học đã bắt đầu." };
  if (remainingSeats(session) === 0)
    return { isAllowed: false, reason: "Buổi học đã đủ chỗ." };
  return allowed;
};

/** Điều kiện FE thấy được trước khi gọi API hủy (UC25, UC29). */
export const canCancelRegistration = (
  registration: Pick<ClassRegistration, "status" | "session">,
  now: Date = new Date(),
): ActionAvailability => {
  if (registration.status === "CANCELED")
    return { isAllowed: false, reason: "Đăng ký này đã được hủy." };
  if (registration.session.status === "CANCELED")
    return {
      isAllowed: false,
      reason: "Buổi học đã bị trung tâm hủy, không cần hủy đăng ký.",
    };
  if (hasSessionStarted(registration.session, now))
    return {
      isAllowed: false,
      reason: "Buổi học đã bắt đầu nên không thể hủy đăng ký.",
    };
  return allowed;
};

/**
 * Sức chứa buổi học không được vượt giới hạn lớp hoặc phòng, và không nhỏ hơn
 * số người đã đăng ký (Sprint2.md §6). Trả về thông báo lỗi, hoặc null.
 */
export const describeCapacityConflict = (input: {
  capacity: number;
  classCapacity: number;
  roomCapacity: number;
  bookedCount: number;
}): string | null => {
  if (!Number.isInteger(input.capacity) || input.capacity < 1)
    return "Sức chứa phải là số nguyên dương.";
  if (input.capacity > input.classCapacity)
    return `Sức chứa buổi học không vượt quá sức chứa lớp (${input.classCapacity}).`;
  if (input.capacity > input.roomCapacity)
    return `Sức chứa buổi học không vượt quá sức chứa phòng (${input.roomCapacity}).`;
  if (input.capacity < input.bookedCount)
    return `Đã có ${input.bookedCount} người đăng ký nên không thể hạ sức chứa xuống ${input.capacity}.`;
  return null;
};

/** Sắp xếp buổi học theo thời gian bắt đầu tăng dần. */
export const byStartTime = (first: ClassSession, second: ClassSession): number =>
  first.date === second.date
    ? first.startTime.localeCompare(second.startTime)
    : first.date.localeCompare(second.date);
