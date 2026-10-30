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
  CoachOption,
  Room,
  WeekDay,
} from "../types/classes";

/** Giờ trung tâm. Timestamp gửi/nhận luôn kèm offset để khỏi lệch múi giờ. */
export const CENTER_UTC_OFFSET = "+07:00";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Khung giờ (Slot) cố định do trung tâm quy định; không có giờ tập tự do. */
export interface CenterTimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export const CENTER_TIME_SLOTS: readonly CenterTimeSlot[] = [
  {
    id: "SLOT_1",
    name: "Ca 1 (Sáng sớm)",
    startTime: "06:30",
    endTime: "07:30",
  },
  {
    id: "SLOT_2",
    name: "Ca 2 (Sáng)",
    startTime: "08:00",
    endTime: "09:00",
  },
  {
    id: "SLOT_3",
    name: "Ca 3 (Sáng muộn)",
    startTime: "09:00",
    endTime: "10:00",
  },
  {
    id: "SLOT_4",
    name: "Ca 4 (Trưa - Chiều)",
    startTime: "14:00",
    endTime: "15:30",
  },
  {
    id: "SLOT_5",
    name: "Ca 5 (Chiều muộn)",
    startTime: "16:00",
    endTime: "17:00",
  },
  {
    id: "SLOT_6",
    name: "Ca 6 (Tối)",
    startTime: "18:00",
    endTime: "19:30",
  },
  {
    id: "SLOT_7",
    name: "Ca 7 (Tối muộn)",
    startTime: "19:30",
    endTime: "21:00",
  },
];

/** Tra khung giờ cố định khớp với giờ bắt đầu và kết thúc của buổi học. */
export const findTimeSlot = (
  startTime: string,
  endTime: string,
): CenterTimeSlot | null =>
  CENTER_TIME_SLOTS.find(
    (slot) =>
      slot.startTime === startTime.trim() && slot.endTime === endTime.trim(),
  ) ?? null;

/** Nhãn hiển thị kèm tên Ca/Slot và khoảng giờ. */
export const formatSlotLabel = (startTime: string, endTime: string): string => {
  const matched = findTimeSlot(startTime, endTime);
  const range = formatTimeRange(startTime, endTime);
  return matched ? `${matched.name} · ${range}` : `Khung giờ · ${range}`;
};

/** Kiểm tra buổi học có thuộc khung giờ (Slot) đang lọc không. */
export const matchesTimeSlot = (
  session: Pick<ClassSession, "startTime" | "endTime">,
  slotId: string,
): boolean => {
  if (!slotId || slotId === "ALL") return true;
  const matched = findTimeSlot(session.startTime, session.endTime);
  if (matched) return matched.id === slotId;
  const slot = CENTER_TIME_SLOTS.find((item) => item.id === slotId);
  return slot ? timeRangesOverlap(session, slot) : true;
};

const normalizeDiscipline = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Kiểm tra huấn luyện viên có phụ trách bộ môn của lớp học hay không.
 * Nếu HLV chưa được cấu hình danh sách chuyên môn thì không chặn ở client.
 */
export const isCoachSuitableForSport = (
  coach: {
    specializations?: readonly string[];
    disciplines?: readonly { disciplineName: string; isActive: boolean }[];
  },
  sportName?: string,
): boolean => {
  if (!sportName || !sportName.trim()) return true;
  const target = normalizeDiscipline(sportName);
  if (!target || target === "—") return true;

  const list =
    coach.specializations && coach.specializations.length > 0
      ? coach.specializations
      : (coach.disciplines ?? [])
          .filter((item) => item.isActive)
          .map((item) => item.disciplineName);

  if (list.length === 0) return true;
  return list.some((item) => normalizeDiscipline(item) === target);
};

export interface CoachSlotAvailability {
  isAvailable: boolean;
  isSportMatched: boolean;
  isTimeFree: boolean;
  conflictingSession?: ClassSession;
  reason: string;
}

/** Đánh giá mức độ phù hợp và rảnh lịch của HLV cho một ngày + khung giờ. */
export const getCoachSlotAvailability = (
  coach: Pick<CoachOption, "id" | "fullName" | "isActive" | "specializations">,
  context: {
    sportName?: string;
    date: string;
    startTime: string;
    endTime: string;
    sessions: readonly ClassSession[];
    excludeSessionId?: string;
  },
): CoachSlotAvailability => {
  const isSportMatched = isCoachSuitableForSport(coach, context.sportName);
  const conflictingSession = context.sessions.find(
    (session) =>
      session.id !== context.excludeSessionId &&
      session.status === "SCHEDULED" &&
      session.coachId === coach.id &&
      session.date === context.date &&
      timeRangesOverlap(session, {
        startTime: context.startTime,
        endTime: context.endTime,
      }),
  );
  const isTimeFree = !conflictingSession;

  if (!coach.isActive) {
    return {
      isAvailable: false,
      isSportMatched,
      isTimeFree,
      conflictingSession,
      reason: "Đã ngừng hoạt động",
    };
  }
  if (!isSportMatched) {
    return {
      isAvailable: false,
      isSportMatched: false,
      isTimeFree,
      conflictingSession,
      reason: `Khác chuyên môn (${context.sportName})`,
    };
  }
  if (conflictingSession) {
    return {
      isAvailable: false,
      isSportMatched: true,
      isTimeFree: false,
      conflictingSession,
      reason: `Trùng lịch lớp ${conflictingSession.className} (${conflictingSession.startTime}–${conflictingSession.endTime})`,
    };
  }
  return {
    isAvailable: true,
    isSportMatched: true,
    isTimeFree: true,
    reason: "Phù hợp · Rảnh khung giờ này",
  };
};

export interface RoomSlotAvailability {
  isAvailable: boolean;
  isTimeFree: boolean;
  conflictingSession?: ClassSession;
  reason: string;
}

/** Đánh giá tình trạng trống của phòng tập cho một ngày + khung giờ. */
export const getRoomSlotAvailability = (
  room: Pick<Room, "id" | "name" | "isActive">,
  context: {
    date: string;
    startTime: string;
    endTime: string;
    sessions: readonly ClassSession[];
    excludeSessionId?: string;
  },
): RoomSlotAvailability => {
  const conflictingSession = context.sessions.find(
    (session) =>
      session.id !== context.excludeSessionId &&
      session.status === "SCHEDULED" &&
      session.roomId === room.id &&
      session.date === context.date &&
      timeRangesOverlap(session, {
        startTime: context.startTime,
        endTime: context.endTime,
      }),
  );
  const isTimeFree = !conflictingSession;

  if (!room.isActive) {
    return {
      isAvailable: false,
      isTimeFree,
      conflictingSession,
      reason: "Đã ngừng hoạt động",
    };
  }
  if (conflictingSession) {
    return {
      isAvailable: false,
      isTimeFree: false,
      conflictingSession,
      reason: `Đang dùng cho lớp ${conflictingSession.className} (${conflictingSession.startTime}–${conflictingSession.endTime})`,
    };
  }
  return {
    isAvailable: true,
    isTimeFree: true,
    reason: "Phòng trống khung giờ này",
  };
};

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

/**
 * Thứ trong tuần theo chỉ số 0 = Chủ nhật, khớp `Date.getDay()` và `daysOfWeek`
 * của backend. Dùng chung cho nhãn một ngày cụ thể và cho bộ chọn thứ của lịch
 * lớp, để hai chỗ không lệch nhau khi thêm/bớt nhãn.
 */
export const WEEKDAY_NAMES: readonly string[] = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

/** Nhãn ngắn cho ô chọn thứ: "CN", "T2"… */
export const WEEKDAY_SHORT_NAMES: readonly string[] = [
  "CN",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
];

/** Thứ hai đến chủ nhật — thứ tự hiển thị quen mắt hơn 0..6. */
export const WEEKDAY_ORDER: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 0];

/** Nhãn tiếng Việt cho ngày trong tuần, ví dụ "Thứ ba". */
export const weekdayLabel = (date: string): string => {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return "—";
  return WEEKDAY_NAMES[value.getUTCDay()];
};

/** Mô tả lịch lặp của lớp thành một dòng, ví dụ "T2, T4 · 18:00–19:30". */
export const describeRecurrence = (
  daysOfWeek: readonly WeekDay[],
  startTime: string,
  endTime: string,
): string => {
  const days = WEEKDAY_ORDER.filter((day) => daysOfWeek.includes(day))
    .map((day) => WEEKDAY_SHORT_NAMES[day])
    .join(", ");
  const range = formatTimeRange(startTime, endTime);
  return days ? `${days} · ${range}` : range;
};

/**
 * Số buổi một lịch lặp sinh ra. Chỉ để form báo trước cho người dùng; server
 * vẫn là nơi sinh buổi thật và có thể từ chối vì trùng lịch.
 */
export const countRecurrenceSessions = (
  startDate: string,
  endDate: string,
  daysOfWeek: readonly WeekDay[],
): number => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start ||
    daysOfWeek.length === 0
  )
    return 0;

  let count = 0;
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    if (daysOfWeek.includes(cursor.getUTCDay() as WeekDay)) count += 1;
  }
  return count;
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
  DRAFT: "Chờ mở đăng ký lớp",
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
  channel: "MEMBER" | "RECEPTIONIST" = "MEMBER",
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
  if (channel === "MEMBER") {
    const remainingMs = new Date(registration.session.startsAt).getTime() - now.getTime();
    if (!Number.isFinite(remainingMs) || remainingMs < 7 * 60 * 60 * 1000)
      return {
        isAllowed: false,
        reason: "Chỉ được hủy trước giờ học ít nhất 7 tiếng. Vui lòng liên hệ lễ tân để được hỗ trợ.",
      };
  }
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

/**
 * Tổng hợp danh sách huấn luyện viên để lọc trên giao diện Thành viên / Lễ tân
 * khi tài khoản không có quyền gọi trực tiếp `/api/Coach` (chỉ dành cho Quản lý).
 */
export const deriveCoachOptionsFromSessions = (
  sessions: readonly Pick<ClassSession, "coachId" | "coachName" | "sportName">[],
  fallbackCoaches: readonly CoachOption[] = [],
): CoachOption[] => {
  if (fallbackCoaches.length > 0) {
    return [...fallbackCoaches];
  }

  const byId = new Map<
    string,
    { id: string; fullName: string; sports: Set<string> }
  >();
  for (const item of sessions) {
    if (!item.coachId || !item.coachName) continue;
    let entry = byId.get(item.coachId);
    if (!entry) {
      entry = {
        id: item.coachId,
        fullName: item.coachName,
        sports: new Set<string>(),
      };
      byId.set(item.coachId, entry);
    }
    if (item.sportName && item.sportName !== "—") {
      entry.sports.add(item.sportName);
    }
  }

  return Array.from(byId.values())
    .sort((first, second) =>
      first.fullName.localeCompare(second.fullName, "vi"),
    )
    .map((entry) => ({
      id: entry.id,
      fullName: entry.fullName,
      email: "",
      specializations: Array.from(entry.sports),
      isActive: true,
    }));
};
