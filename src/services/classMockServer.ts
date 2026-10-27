/**
 * Bộ quy tắc Flow 2 dùng **chỉ cho unit test** (`classApi.test.ts`,
 * `packageSportApi.test.ts`).
 *
 * Trước đây `classApi` tự rơi về file này khi `VITE_API_BASE_URL` trống, nên
 * một màn hình cấu hình sai vẫn đặt chỗ “thành công” trên dữ liệu trong bộ nhớ.
 * Nhánh đó đã bị bỏ: API Flow 2 của backend đã chạy, và Sprint 2 yêu cầu
 * booking, counter và lịch cá nhân chỉ có một nguồn duy nhất là server. Không
 * import file này từ page, component hay service chạy thật.
 *
 * Còn giữ lại vì nó mô tả đúng tập quy tắc đã chốt ở Sprint2.md §6 và ném
 * `ApiError` với **cùng mã lỗi** contract yêu cầu, nên các test ở trên kiểm
 * được rằng FE xử lý đủ các nhánh bị-từ-chối (trùng Coach, trùng phòng, hết
 * chỗ, gói không hợp lệ, buổi đã bắt đầu…). Đây là test fixture, không phải
 * bằng chứng backend đã pass: điều đó phải do test tích hợp với API thật
 * chứng minh.
 */

import { ApiError } from "./apiClient";
import type {
  PackageSportEntitlement,
  PackageSummary,
} from "../types/packageSports";
import type {
  CancelImpact,
  CancelScope,
  ClassInput,
  ClassRegistration,
  ClassScheduleBlock,
  ClassSession,
  ClassSessionFilter,
  ClassSessionInput,
  ClassStatus,
  CoachOption,
  RegistrationChannel,
  Room,
  SessionMemberOption,
  Sport,
  SportInput,
  TrainingClass,
  WeekDay,
} from "../types/classes";
import {
  addCalendarDays,
  centerTimestamp,
  centerToday,
  describeCapacityConflict,
  isCoachSuitableForSport,
  minutesOfDay,
  timeRangesOverlap,
} from "../utils/classSchedule";

const MOCK_LATENCY_MS = 220;

/** Chữ ký trùng tên: bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường. */
const normalizeName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Khai báo dạng `function` (không phải arrow) để TypeScript dùng được kiểu
 * `never` cho phân tích luồng: sau `if (!found) fail(...)` thì `found` được
 * thu hẹp, khỏi phải thêm `return` giả.
 */
function fail(
  code: string,
  message: string,
  status = 409,
  details?: Record<string, string[]>,
): never {
  throw new ApiError(message, status, code, details);
}

interface MockClassRecord extends ClassInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface MockSessionRecord extends ClassSessionInput {
  id: string;
  status: ClassSession["status"];
  cancelReason?: string;
  canceledAt?: string;
  updatedAt: string;
}

interface MockRegistrationRecord {
  id: string;
  sessionId: string;
  memberId: string;
  status: "BOOKED" | "CANCELED";
  registeredAt: string;
  registeredVia: RegistrationChannel;
  registeredByName: string;
  canceledAt?: string;
  canceledByName?: string;
  cancelReason?: string;
}

/**
 * Thành viên mock kèm tình trạng gói, đủ để demo bốn nhánh từ chối của UC24:
 * tài khoản ngừng hoạt động, gói chờ thanh toán, gói hết hạn trước ngày học,
 * và gói không bao gồm bộ môn.
 */
interface MockMemberRecord extends SessionMemberOption {
  membershipStatus: "ACTIVE" | "PENDING_PAYMENT" | "EXPIRED" | "SUSPENDED";
  membershipEndDate: string;
  /**
   * Gói đang dùng. Quyền bộ môn suy ra từ gói chứ không gắn thẳng vào thành
   * viên, để màn hình cấu hình quyền (FR-09) đổi một chỗ là mọi thành viên
   * dùng gói đó đổi theo — đúng như backend sẽ hành xử.
   */
  packageId: string;
}

interface MockState {
  sports: Sport[];
  rooms: Room[];
  coaches: CoachOption[];
  classes: MockClassRecord[];
  sessions: MockSessionRecord[];
  registrations: MockRegistrationRecord[];
  members: MockMemberRecord[];
  packages: PackageSummary[];
  /** Gói không có dòng nào ở đây = vào được mọi bộ môn. */
  packageSports: { packageId: string; sportIds: string[] }[];
}

let state: MockState | null = null;
let sequence = 0;
const nextId = (prefix: string): string => `${prefix}-${++sequence}`;
const timestamp = (): string => new Date().toISOString();
const sportPayload = (input: SportInput): SportInput => ({
  name: input.name.trim(),
  description: input.description.trim(),
});

function seed(): MockState {
  const today = centerToday();
  const sports: Sport[] = [
    {
      id: "sport-yoga",
      name: "Yoga",
      description: "Các lớp cân bằng, dẻo dai và phục hồi.",
      isActive: true,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
    {
      id: "sport-boxing",
      name: "Boxing",
      description: "Kỹ thuật đối kháng và thể lực toàn thân.",
      isActive: true,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
    {
      id: "sport-swim",
      name: "Bơi lội",
      description: "Các lớp bơi theo trình độ tại hồ trong nhà.",
      isActive: true,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
    {
      id: "sport-dance",
      name: "Dance fitness",
      description: "Vận động theo nhạc dành cho nhóm đông.",
      isActive: false,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
  ];
  const rooms: Room[] = [
    {
      id: "room-a",
      name: "Studio A",
      location: "Tầng 2",
      capacity: 20,
      isActive: true,
    },
    {
      id: "room-b",
      name: "Studio B",
      location: "Tầng 2",
      capacity: 25,
      isActive: true,
    },
    {
      id: "room-pool",
      name: "Hồ bơi trong nhà",
      location: "Tầng 1",
      capacity: 12,
      isActive: true,
    },
    {
      id: "room-out",
      name: "Sân ngoài trời",
      location: "Sân sau",
      capacity: 30,
      isActive: false,
    },
  ];
  const coaches: CoachOption[] = [
    {
      id: "coach-ha",
      fullName: "Trần Thu Hà",
      isActive: true,
      specializations: ["Yoga", "Pilates"],
    },
    {
      id: "coach-nam",
      fullName: "Lê Hoàng Nam",
      isActive: true,
      specializations: ["Boxing", "Thể lực"],
    },
    {
      id: "coach-linh",
      fullName: "Phạm Mỹ Linh",
      isActive: true,
      specializations: ["Bơi lội"],
    },
    {
      id: "coach-son",
      fullName: "Đỗ Trường Sơn",
      isActive: false,
      specializations: ["Dance fitness"],
    },
  ];
  const classes: MockClassRecord[] = [
    {
      id: "class-yoga-basic",
      sportId: "sport-yoga",
      name: "Yoga cân bằng cơ bản",
      description:
        "Lớp nhập môn cho người mới, tập trung vào hơi thở và tư thế nền.",
      capacity: 15,
      status: "OPEN",
      createdAt: "2026-10-01T02:00:00.000Z",
      updatedAt: "2026-10-09T02:00:00.000Z",
    },
    {
      id: "class-boxing-inter",
      sportId: "sport-boxing",
      name: "Boxing trung cấp",
      description:
        "Kỹ thuật di chuyển và tổ hợp đòn, yêu cầu đã tập ít nhất 3 tháng.",
      capacity: 12,
      status: "OPEN",
      createdAt: "2026-10-02T02:00:00.000Z",
      updatedAt: "2026-10-09T02:00:00.000Z",
    },
    {
      id: "class-swim-kid",
      sportId: "sport-swim",
      name: "Bơi lội thiếu nhi",
      description: "Nhóm nhỏ tối đa 10 bạn, luôn có cứu hộ tại bể.",
      capacity: 10,
      status: "CLOSED",
      createdAt: "2026-09-20T02:00:00.000Z",
      updatedAt: "2026-10-05T02:00:00.000Z",
    },
    {
      id: "class-yoga-advanced",
      sportId: "sport-yoga",
      name: "Yoga nâng cao buổi tối",
      description:
        "Chuỗi tư thế liên tục, dành cho thành viên đã tập trên 6 tháng.",
      capacity: 12,
      status: "DRAFT",
      createdAt: "2026-10-08T02:00:00.000Z",
      updatedAt: "2026-10-08T02:00:00.000Z",
    },
  ];

  /** Buổi học rải từ hôm qua tới 7 ngày tới, để có cả quá khứ và tương lai. */
  const sessions: MockSessionRecord[] = [
    ...[-1, 0, 2, 4, 7].map((offset, index) => ({
      id: `session-yoga-${index}`,
      classId: "class-yoga-basic",
      coachId: "coach-ha",
      roomId: "room-a",
      date: addCalendarDays(today, offset),
      startTime: "08:00",
      endTime: "09:00",
      capacity: 15,
      notes: "",
      status: (offset < 0
        ? "COMPLETED"
        : "SCHEDULED") as ClassSession["status"],
      updatedAt: "2026-10-09T02:00:00.000Z",
    })),
    ...[1, 3, 6].map((offset, index) => ({
      id: `session-boxing-${index}`,
      classId: "class-boxing-inter",
      coachId: "coach-nam",
      roomId: "room-b",
      date: addCalendarDays(today, offset),
      startTime: "18:00",
      endTime: "19:30",
      capacity: 12,
      notes: "Mang găng cá nhân.",
      status: "SCHEDULED" as ClassSession["status"],
      updatedAt: "2026-10-09T02:00:00.000Z",
    })),
    {
      id: "session-swim-0",
      classId: "class-swim-kid",
      coachId: "coach-linh",
      roomId: "room-pool",
      date: addCalendarDays(today, 2),
      startTime: "16:00",
      endTime: "17:00",
      capacity: 10,
      notes: "",
      status: "SCHEDULED",
      updatedAt: "2026-10-09T02:00:00.000Z",
    },
    {
      id: "session-swim-1",
      classId: "class-swim-kid",
      coachId: "coach-linh",
      roomId: "room-pool",
      date: addCalendarDays(today, 5),
      startTime: "16:00",
      endTime: "17:00",
      capacity: 10,
      notes: "",
      status: "CANCELED",
      cancelReason: "Bảo trì hệ thống lọc nước.",
      canceledAt: "2026-10-10T03:00:00.000Z",
      updatedAt: "2026-10-10T03:00:00.000Z",
    },
  ];

  const members: MockMemberRecord[] = [
    {
      id: "member-an",
      memberCode: "MEM0001",
      fullName: "Nguyễn Hoàng An",
      email: "an.nguyen@example.com",
      phone: "0901000001",
      isActive: true,
      membershipStatus: "ACTIVE",
      membershipEndDate: addCalendarDays(today, 120),
      packageId: "4",
    },
    {
      id: "member-binh",
      memberCode: "MEM0002",
      fullName: "Trần Thanh Bình",
      email: "binh.tran@example.com",
      phone: "0901000002",
      isActive: true,
      membershipStatus: "ACTIVE",
      membershipEndDate: addCalendarDays(today, 45),
      packageId: "5",
    },
    {
      id: "member-chi",
      memberCode: "MEM0003",
      fullName: "Lê Khánh Chi",
      email: "chi.le@example.com",
      phone: "0901000003",
      isActive: true,
      membershipStatus: "PENDING_PAYMENT",
      membershipEndDate: addCalendarDays(today, 30),
      packageId: "1",
    },
    {
      id: "member-dung",
      memberCode: "MEM0004",
      fullName: "Phạm Tiến Dũng",
      email: "dung.pham@example.com",
      phone: "0901000004",
      isActive: true,
      membershipStatus: "ACTIVE",
      // Gói hết hạn ngay mai, nên các buổi từ ngày thứ ba trở đi bị từ chối.
      membershipEndDate: addCalendarDays(today, 1),
      packageId: "1",
    },
    {
      id: "member-em",
      memberCode: "MEM0005",
      fullName: "Vũ Ngọc Em",
      email: "em.vu@example.com",
      phone: "0901000005",
      isActive: false,
      membershipStatus: "ACTIVE",
      membershipEndDate: addCalendarDays(today, 60),
      packageId: "4",
    },
  ];

  const registrations: MockRegistrationRecord[] = [
    {
      id: "registration-1",
      sessionId: "session-yoga-2",
      memberId: "member-an",
      status: "BOOKED",
      registeredAt: "2026-10-10T01:00:00.000Z",
      registeredVia: "MEMBER",
      registeredByName: "Nguyễn Hoàng An",
    },
    {
      id: "registration-2",
      sessionId: "session-yoga-2",
      memberId: "member-binh",
      status: "BOOKED",
      registeredAt: "2026-10-10T01:30:00.000Z",
      registeredVia: "RECEPTIONIST",
      registeredByName: "Lễ tân Nguyễn Thị Mai",
    },
    {
      id: "registration-3",
      sessionId: "session-boxing-0",
      memberId: "member-an",
      status: "BOOKED",
      registeredAt: "2026-10-10T02:00:00.000Z",
      registeredVia: "MEMBER",
      registeredByName: "Nguyễn Hoàng An",
    },
  ];

  // Bảy gói mirror đúng seed SQL của Sprint 1, để demo khớp dữ liệu thật.
  const packages: PackageSummary[] = [
    { id: "1", name: "Gói Trải Nghiệm 1 Tháng", durationMonths: 1, price: 500000, isActive: true },
    { id: "2", name: "Gói Tiêu Chuẩn 3 Tháng", durationMonths: 3, price: 1350000, isActive: true },
    { id: "3", name: "Gói Năng Động 6 Tháng", durationMonths: 6, price: 2400000, isActive: true },
    { id: "4", name: "Gói Toàn Diện 12 Tháng", durationMonths: 12, price: 4200000, isActive: true },
    { id: "5", name: "Gói Học Viên Yoga 3 Tháng", durationMonths: 3, price: 1600000, isActive: true },
    { id: "6", name: "Gói Thể Thao Bơi Lội 6 Tháng", durationMonths: 6, price: 2200000, isActive: true },
    { id: "7", name: "Gói Thẻ Hội Viên VIP 24 Tháng", durationMonths: 24, price: 7500000, isActive: true },
  ];
  // Chỉ hai gói chuyên đề bị giới hạn; năm gói còn lại không có dòng nào nên
  // vào được mọi bộ môn.
  const packageSports = [
    { packageId: "5", sportIds: ["sport-yoga"] },
    { packageId: "6", sportIds: ["sport-swim"] },
  ];

  return {
    sports,
    rooms,
    coaches,
    classes,
    sessions,
    registrations,
    members,
    packages,
    packageSports,
  };
}

const store = (): MockState => (state ??= seed());

/** Chỉ dùng trong test: đưa dữ liệu mock về trạng thái gốc. */
export const resetClassMockServer = (): void => {
  state = null;
  sequence = 0;
};

const wait = (): Promise<void> =>
  new Promise((resolve) => globalThis.setTimeout(resolve, MOCK_LATENCY_MS));

// --- Projection: bản ghi thô -> model mà màn hình dùng ---------------------

const activeRegistrationsOf = (sessionId: string): MockRegistrationRecord[] =>
  store().registrations.filter(
    (item) => item.sessionId === sessionId && item.status === "BOOKED",
  );

function projectSession(record: MockSessionRecord): ClassSession {
  const data = store();
  const owner = data.classes.find((item) => item.id === record.classId);
  const sport = data.sports.find((item) => item.id === owner?.sportId);
  const coach = data.coaches.find((item) => item.id === record.coachId);
  const room = data.rooms.find((item) => item.id === record.roomId);
  const bookedCount = activeRegistrationsOf(record.id).length;
  return {
    id: record.id,
    classId: record.classId,
    className: owner?.name ?? "Lớp đã xóa",
    sportId: owner?.sportId ?? "",
    sportName: sport?.name ?? "—",
    coachId: record.coachId,
    coachName: coach?.fullName ?? "Chưa phân công",
    roomId: record.roomId,
    roomName: room?.name ?? "—",
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    startsAt: centerTimestamp(record.date, record.startTime),
    endsAt: centerTimestamp(record.date, record.endTime),
    capacity: record.capacity,
    bookedCount,
    remainingCapacity: Math.max(0, record.capacity - bookedCount),
    status: record.status,
    notes: record.notes,
    cancelReason: record.cancelReason,
    canceledAt: record.canceledAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Gộp các buổi thành từng đợt lịch giống `ClassService.BuildScheduleBlocks` của
 * server: cùng giáo viên, cùng phòng, cùng ca là một đợt. Dữ liệu mẫu phải mô
 * tả lớp y như API thật, nếu không màn hình chạy trên mock sẽ khác thật.
 */
function scheduleBlocksOf(
  sessions: readonly MockSessionRecord[],
): ClassScheduleBlock[] {
  const data = store();
  const groups = new Map<string, MockSessionRecord[]>();
  for (const session of sessions) {
    if (session.status === "CANCELED") continue;
    const key = `${session.coachId}|${session.roomId}|${session.startTime}|${session.endTime}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(session);
    else groups.set(key, [session]);
  }

  return [...groups.values()]
    .map((group) => {
      const dates = group.map((item) => item.date).sort();
      const [first] = group;
      return {
        coachId: first.coachId,
        coachName:
          data.coaches.find((item) => item.id === first.coachId)?.fullName ??
          "Chưa phân công",
        roomId: first.roomId,
        roomName:
          data.rooms.find((item) => item.id === first.roomId)?.name ?? "—",
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        startTime: first.startTime,
        endTime: first.endTime,
        daysOfWeek: [
          ...new Set(
            group.map(
              (item) => new Date(`${item.date}T00:00:00Z`).getUTCDay() as WeekDay,
            ),
          ),
        ].sort((left, right) => left - right),
        sessionCount: group.length,
      };
    })
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) ||
        left.startTime.localeCompare(right.startTime),
    );
}

function projectClass(record: MockClassRecord): TrainingClass {
  const data = store();
  const sport = data.sports.find((item) => item.id === record.sportId);
  const sessions = data.sessions.filter((item) => item.classId === record.id);
  const today = centerToday();
  return {
    ...record,
    sportName: sport?.name ?? "—",
    totalSessionCount: sessions.length,
    upcomingSessionCount: sessions.filter(
      (item) => item.status === "SCHEDULED" && item.date >= today,
    ).length,
    activeRegistrationCount: sessions.reduce(
      (total, item) => total + activeRegistrationsOf(item.id).length,
      0,
    ),
    scheduleBlocks: scheduleBlocksOf(sessions),
  };
}

function projectRegistration(
  record: MockRegistrationRecord,
): ClassRegistration {
  const data = store();
  const session = data.sessions.find((item) => item.id === record.sessionId);
  if (!session) fail("SESSION_NOT_FOUND", "Không tìm thấy buổi học.", 404);
  const member = data.members.find((item) => item.id === record.memberId);
  return {
    id: record.id,
    sessionId: record.sessionId,
    memberId: record.memberId,
    memberName: member?.fullName ?? record.memberId,
    memberCode: member?.memberCode ?? "—",
    status: record.status,
    registeredAt: record.registeredAt,
    registeredVia: record.registeredVia,
    registeredByName: record.registeredByName,
    canceledAt: record.canceledAt,
    canceledByName: record.canceledByName,
    cancelReason: record.cancelReason,
    session: projectSession(session),
  };
}

// --- Kiểm tra nghiệp vụ ---------------------------------------------------

function requireClass(classId: string): MockClassRecord {
  const found = store().classes.find((item) => item.id === classId);
  if (!found) fail("CLASS_NOT_FOUND", "Không tìm thấy lớp học.", 404);
  return found;
}

function requireSession(sessionId: string): MockSessionRecord {
  const found = store().sessions.find((item) => item.id === sessionId);
  if (!found) fail("SESSION_NOT_FOUND", "Không tìm thấy buổi học.", 404);
  return found;
}

const hasStarted = (record: MockSessionRecord): boolean =>
  new Date(centerTimestamp(record.date, record.startTime)).getTime() <=
  Date.now();

/**
 * Buổi tương lai còn hủy được của một lớp.
 *
 * Dùng chung cho `previewCancel` và `cancelSessions`: nếu hai chỗ lọc khác
 * nhau thì dialog xác nhận sẽ báo số buổi ảnh hưởng khác số buổi thực sự bị
 * hủy, đúng vào lúc người dùng cần tin con số đó nhất.
 */
const cancelableSessionsOfClass = (classId: string): MockSessionRecord[] =>
  store().sessions.filter(
    (item) =>
      item.classId === classId &&
      item.status === "SCHEDULED" &&
      !hasStarted(item),
  );

/** Trùng Coach/phòng xét trên buổi còn hiệu lực, bỏ qua chính buổi đang sửa. */
function assertNoResourceConflict(
  input: ClassSessionInput,
  excludeSessionId?: string,
): void {
  const data = store();
  const others = data.sessions.filter(
    (item) =>
      item.id !== excludeSessionId &&
      item.status === "SCHEDULED" &&
      item.date === input.date,
  );
  const coachClash = others.find(
    (item) => item.coachId === input.coachId && timeRangesOverlap(item, input),
  );
  if (coachClash) {
    const coach = data.coaches.find((item) => item.id === input.coachId);
    fail(
      "COACH_SCHEDULE_CONFLICT",
      `${coach?.fullName ?? "Huấn luyện viên"} đã có buổi ${coachClash.startTime}–${coachClash.endTime} trong ngày này.`,
      409,
      {
        coachId: [
          `Trùng với buổi ${coachClash.startTime}–${coachClash.endTime}.`,
        ],
      },
    );
  }
  const roomClash = others.find(
    (item) => item.roomId === input.roomId && timeRangesOverlap(item, input),
  );
  if (roomClash) {
    const room = data.rooms.find((item) => item.id === input.roomId);
    fail(
      "ROOM_SCHEDULE_CONFLICT",
      `${room?.name ?? "Phòng"} đã được dùng ${roomClash.startTime}–${roomClash.endTime} trong ngày này.`,
      409,
      {
        roomId: [
          `Trùng với buổi ${roomClash.startTime}–${roomClash.endTime}.`,
        ],
      },
    );
  }
}

/**
 * Gói không có dòng nào trong bảng quyền = vào được mọi bộ môn. Quy ước này
 * giữ cho các gói đã bán từ Sprint 1 không mất quyền lợi khi bật tính năng.
 */
const packageAllowsSport = (packageId: string, sportId: string): boolean => {
  const entitlement = store().packageSports.find(
    (item) => item.packageId === packageId,
  );
  return !entitlement || entitlement.sportIds.length === 0
    ? true
    : entitlement.sportIds.includes(sportId);
};

const membershipCoversDate = (
  member: MockMemberRecord,
  date: string,
): boolean =>
  member.membershipStatus === "ACTIVE" && member.membershipEndDate >= date;

/** Điều kiện của chính thành viên: tài khoản, gói, quyền bộ môn, trùng giờ. */
function assertMemberEligible(
  member: MockMemberRecord,
  record: MockSessionRecord,
): void {
  const owner = requireClass(record.classId);
  if (!member.isActive)
    fail(
      "ACCOUNT_INACTIVE",
      `Tài khoản của ${member.fullName} đang ngừng hoạt động.`,
      403,
    );
  if (!membershipCoversDate(member, record.date))
    fail(
      "MEMBERSHIP_NOT_VALID_FOR_SESSION",
      member.membershipStatus === "ACTIVE"
        ? `Gói tập của ${member.fullName} hết hạn ngày ${member.membershipEndDate}, không bao phủ ngày học ${record.date}.`
        : `Gói tập của ${member.fullName} chưa dùng được (trạng thái ${member.membershipStatus}).`,
      409,
    );
  if (!packageAllowsSport(member.packageId, owner.sportId))
    fail(
      "PACKAGE_NOT_ELIGIBLE",
      `Gói tập của ${member.fullName} không bao gồm bộ môn của lớp này.`,
      409,
    );

  const data = store();
  const clash = data.registrations
    .filter((item) => item.memberId === member.id && item.status === "BOOKED")
    .map((item) =>
      data.sessions.find((session) => session.id === item.sessionId),
    )
    .find(
      (other) =>
        other !== undefined &&
        other.status === "SCHEDULED" &&
        other.date === record.date &&
        other.id !== record.id &&
        timeRangesOverlap(other, record),
    );
  if (clash)
    fail(
      "MEMBER_SCHEDULE_CONFLICT",
      `${member.fullName} đã có buổi học ${clash.startTime}–${clash.endTime} trùng giờ.`,
      409,
    );
}

/** Thành viên đang đăng ký buổi này mà sẽ xung đột nếu đổi sang giờ mới. */
function membersBlockingReschedule(
  record: MockSessionRecord,
  next: ClassSessionInput,
): string[] {
  const data = store();
  return activeRegistrationsOf(record.id)
    .map((registration) =>
      data.members.find((item) => item.id === registration.memberId),
    )
    .filter((member): member is MockMemberRecord => member !== undefined)
    .filter((member) => {
      if (!membershipCoversDate(member, next.date)) return true;
      return data.registrations
        .filter(
          (item) => item.memberId === member.id && item.status === "BOOKED",
        )
        .some((item) => {
          if (item.sessionId === record.id) return false;
          const other = data.sessions.find(
            (session) => session.id === item.sessionId,
          );
          return (
            other !== undefined &&
            other.status === "SCHEDULED" &&
            other.date === next.date &&
            timeRangesOverlap(other, next)
          );
        });
    })
    .map((member) => member.fullName);
}

// --- Bề mặt mock tương ứng từng endpoint ----------------------------------

export const classMockServer = {
  async listSports(): Promise<Sport[]> {
    await wait();
    return store().sports.map((item) => ({ ...item }));
  },

  async saveSport(input: SportInput, sportId?: string): Promise<Sport> {
    await wait();
    const data = store();
    const duplicate = data.sports.some(
      (item) =>
        item.id !== sportId && normalizeName(item.name) === normalizeName(input.name),
    );
    if (duplicate)
      fail("SPORT_NAME_DUPLICATE", "Tên bộ môn đã tồn tại.", 409, {
        name: ["Tên bộ môn đã tồn tại sau khi chuẩn hóa."],
      });
    const existing = sportId
      ? data.sports.find((item) => item.id === sportId)
      : undefined;
    if (sportId && !existing)
      fail("SPORT_NOT_FOUND", "Không tìm thấy bộ môn.", 404);
    if (existing) {
      Object.assign(existing, sportPayload(input), { updatedAt: timestamp() });
      return { ...existing };
    }
    const now = timestamp();
    const created: Sport = {
      id: nextId("sport"),
      ...sportPayload(input),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    data.sports.push(created);
    return { ...created };
  },

  async setSportActive(sportId: string, isActive: boolean): Promise<Sport> {
    await wait();
    const sport = store().sports.find((item) => item.id === sportId);
    if (!sport) fail("SPORT_NOT_FOUND", "Không tìm thấy bộ môn.", 404);
    sport.isActive = isActive;
    sport.updatedAt = timestamp();
    return { ...sport };
  },

  async listRooms(): Promise<Room[]> {
    await wait();
    return store().rooms.map((item) => ({ ...item }));
  },

  async listCoaches(): Promise<CoachOption[]> {
    await wait();
    return store().coaches.map((item) => ({ ...item }));
  },

  async listClasses(): Promise<TrainingClass[]> {
    await wait();
    return store()
      .classes.map(projectClass)
      .sort((first, second) => first.name.localeCompare(second.name, "vi"));
  },

  async saveClass(input: ClassInput, classId?: string): Promise<TrainingClass> {
    await wait();
    const data = store();
    const sport = data.sports.find((item) => item.id === input.sportId);
    if (!sport) fail("SPORT_NOT_FOUND", "Không tìm thấy bộ môn.", 404);
    const existing = classId ? requireClass(classId) : undefined;
    // Bộ môn ngừng hoạt động vẫn giữ được ở lớp cũ, chỉ không dùng cho lớp mới
    // hoặc khi đổi sang nó (UC17).
    if (!sport.isActive && existing?.sportId !== input.sportId)
      fail(
        "SPORT_INACTIVE",
        `Bộ môn “${sport.name}” đã ngừng hoạt động, không dùng để tạo lớp mới.`,
        409,
        { sportId: ["Bộ môn đã ngừng hoạt động."] },
      );
    if (
      data.classes.some(
        (item) =>
          item.id !== classId &&
          item.status !== "ARCHIVED" &&
          normalizeName(item.name) === normalizeName(input.name),
      )
    )
      fail("CLASS_NAME_DUPLICATE", "Tên lớp đã tồn tại.", 409, {
        name: ["Tên lớp đã tồn tại sau khi chuẩn hóa."],
      });

    const sessions = data.sessions.filter((item) => item.classId === classId);
    const maxBooked = sessions.reduce(
      (highest, item) =>
        Math.max(highest, activeRegistrationsOf(item.id).length),
      0,
    );
    if (input.capacity < maxBooked)
      fail(
        "CAPACITY_BELOW_REGISTRATIONS",
        `Một buổi của lớp đã có ${maxBooked} người đăng ký nên không thể hạ sức chứa xuống ${input.capacity}.`,
        409,
        { capacity: [`Tối thiểu là ${maxBooked}.`] },
      );
    const overCapacitySession = sessions.find(
      (item) => item.capacity > input.capacity,
    );
    if (overCapacitySession)
      fail(
        "CAPACITY_BELOW_REGISTRATIONS",
        `Buổi ngày ${overCapacitySession.date} đang đặt sức chứa ${overCapacitySession.capacity}, lớn hơn sức chứa lớp mới.`,
        409,
        { capacity: ["Sửa sức chứa buổi học trước khi hạ sức chứa lớp."] },
      );
    // "Lớp chỉ mở đặt chỗ khi có buổi học hợp lệ" (UC19).
    if (input.status === "OPEN") {
      const today = centerToday();
      const hasUsableSession = sessions.some(
        (item) => item.status === "SCHEDULED" && item.date >= today,
      );
      if (!hasUsableSession)
        fail(
          "CLASS_HAS_NO_VALID_SESSION",
          "Lớp chưa có buổi học nào ở tương lai nên chưa thể mở đăng ký. Hãy lập lịch trước.",
          409,
          { status: ["Cần ít nhất một buổi học hợp lệ."] },
        );
    }

    if (existing) {
      Object.assign(existing, input, { updatedAt: timestamp() });
      return projectClass(existing);
    }
    const created: MockClassRecord = {
      ...input,
      id: nextId("class"),
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    data.classes.push(created);
    return projectClass(created);
  },

  async setClassStatus(
    classId: string,
    status: ClassStatus,
  ): Promise<TrainingClass> {
    const record = requireClass(classId);
    return classMockServer.saveClass(
      {
        sportId: record.sportId,
        name: record.name,
        description: record.description,
        capacity: record.capacity,
        status,
      },
      classId,
    );
  },

  async listSessions(filter: ClassSessionFilter = {}): Promise<ClassSession[]> {
    await wait();
    const data = store();
    return data.sessions
      .filter((item) => {
        const owner = data.classes.find((entry) => entry.id === item.classId);
        if (filter.classId && item.classId !== filter.classId) return false;
        if (filter.coachId && item.coachId !== filter.coachId) return false;
        if (filter.roomId && item.roomId !== filter.roomId) return false;
        if (filter.sportId && owner?.sportId !== filter.sportId) return false;
        if (
          filter.status &&
          filter.status !== "ALL" &&
          item.status !== filter.status
        )
          return false;
        if (filter.from && item.date < filter.from) return false;
        if (filter.to && item.date > filter.to) return false;
        return true;
      })
      .map(projectSession)
      .sort((first, second) =>
        first.date === second.date
          ? first.startTime.localeCompare(second.startTime)
          : first.date.localeCompare(second.date),
      );
  },

  async saveSession(
    input: ClassSessionInput,
    sessionId?: string,
  ): Promise<ClassSession> {
    await wait();
    const data = store();
    const owner = requireClass(input.classId);
    const existing = sessionId ? requireSession(sessionId) : undefined;
    if (existing?.status === "CANCELED")
      fail("SESSION_CANCELLED", "Buổi học đã hủy, không thể sửa.", 409);
    if (owner.status === "ARCHIVED")
      fail("CLASS_ARCHIVED", "Lớp đã lưu trữ, không thể thêm buổi mới.", 409);

    const start = minutesOfDay(input.startTime);
    const end = minutesOfDay(input.endTime);
    const fieldErrors: Record<string, string[]> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
      fieldErrors.date = ["Ngày học không hợp lệ."];
    if (start === null) fieldErrors.startTime = ["Giờ bắt đầu không hợp lệ."];
    if (end === null) fieldErrors.endTime = ["Giờ kết thúc không hợp lệ."];
    if (start !== null && end !== null && start >= end)
      fieldErrors.endTime = ["Giờ kết thúc phải sau giờ bắt đầu."];
    if (Object.keys(fieldErrors).length)
      fail(
        "VALIDATION_ERROR",
        "Dữ liệu buổi học chưa hợp lệ.",
        400,
        fieldErrors,
      );

    const coach = data.coaches.find((item) => item.id === input.coachId);
    if (!coach) fail("COACH_NOT_FOUND", "Không tìm thấy huấn luyện viên.", 404);
    if (!coach.isActive && existing?.coachId !== input.coachId)
      fail(
        "COACH_INACTIVE",
        `${coach.fullName} đang ngừng hoạt động, không thể phân công.`,
        409,
        { coachId: ["Huấn luyện viên đã ngừng hoạt động."] },
      );
    const room = data.rooms.find((item) => item.id === input.roomId);
    if (!room) fail("ROOM_NOT_FOUND", "Không tìm thấy phòng tập.", 404);
    if (!room.isActive && existing?.roomId !== input.roomId)
      fail(
        "ROOM_INACTIVE",
        `${room.name} đang ngừng hoạt động, không dùng cho lịch mới.`,
        409,
        { roomId: ["Phòng đã ngừng hoạt động."] },
      );

    const capacityProblem = describeCapacityConflict({
      capacity: input.capacity,
      classCapacity: owner.capacity,
      roomCapacity: room.capacity,
      bookedCount: existing ? activeRegistrationsOf(existing.id).length : 0,
    });
    if (capacityProblem)
      fail("VALIDATION_ERROR", capacityProblem, 400, {
        capacity: [capacityProblem],
      });

    if (
      new Date(centerTimestamp(input.date, input.startTime)).getTime() <=
      Date.now()
    )
      fail(
        "SESSION_IN_PAST",
        "Không thể lập hoặc chuyển buổi học về thời điểm đã qua.",
        400,
        { date: ["Chọn thời điểm ở tương lai."] },
      );

    assertNoResourceConflict(input, sessionId);

    const ownerSport = data.sports.find((item) => item.id === owner.sportId);
    if (
      existing?.coachId !== input.coachId &&
      !isCoachSuitableForSport(coach, ownerSport?.name)
    ) {
      fail(
        "COACH_DISCIPLINE_MISMATCH",
        `${coach.fullName} không phụ trách bộ môn ${ownerSport?.name ?? "của lớp này"}.`,
        409,
        {
          coachId: [
            `Huấn luyện viên không phụ trách bộ môn ${ownerSport?.name ?? "của lớp này"}.`,
          ],
        },
      );
    }

    if (existing) {
      const timeChanged =
        existing.date !== input.date ||
        existing.startTime !== input.startTime ||
        existing.endTime !== input.endTime;
      if (timeChanged) {
        const blocked = membersBlockingReschedule(existing, input);
        if (blocked.length)
          fail(
            "MEMBER_SCHEDULE_CONFLICT",
            `Không đổi được lịch: ${blocked.join(", ")} không còn tham gia được vào giờ mới. Hãy hủy đăng ký của họ trước hoặc chọn giờ khác.`,
            409,
            { date: [`${blocked.length} học viên không hợp lệ ở giờ mới.`] },
          );
      }
      Object.assign(existing, input, { updatedAt: timestamp() });
      return projectSession(existing);
    }

    const created: MockSessionRecord = {
      ...input,
      id: nextId("session"),
      status: "SCHEDULED",
      updatedAt: timestamp(),
    };
    data.sessions.push(created);
    return projectSession(created);
  },

  async previewCancel(
    scope: CancelScope,
    target: { sessionId?: string; classId?: string },
  ): Promise<CancelImpact> {
    await wait();
    const affected =
      scope === "SESSION"
        ? [requireSession(target.sessionId ?? "")]
        : cancelableSessionsOfClass(target.classId ?? "");
    const registrations = affected.flatMap((item) =>
      activeRegistrationsOf(item.id),
    );
    const next = [...affected]
      .filter((item) => item.status === "SCHEDULED")
      .sort((first, second) =>
        first.date === second.date
          ? first.startTime.localeCompare(second.startTime)
          : first.date.localeCompare(second.date),
      )[0];
    return {
      scope,
      affectedSessionCount: affected.length,
      affectedRegistrationCount: registrations.length,
      affectedMemberCount: new Set(registrations.map((item) => item.memberId))
        .size,
      nextSessionStartsAt: next
        ? centerTimestamp(next.date, next.startTime)
        : undefined,
    };
  },

  async cancelSessions(
    scope: CancelScope,
    target: { sessionId?: string; classId?: string },
    reason: string,
    actorName: string,
  ): Promise<number> {
    await wait();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 500)
      fail("VALIDATION_ERROR", "Nhập lý do hủy từ 3 đến 500 ký tự.", 400, {
        reason: ["Lý do hủy cần 3–500 ký tự."],
      });

    const targets =
      scope === "SESSION"
        ? [requireSession(target.sessionId ?? "")]
        : cancelableSessionsOfClass(target.classId ?? "");
    if (scope === "SESSION") {
      const single = targets[0];
      if (single.status === "CANCELED")
        fail("SESSION_CANCELLED", "Buổi học này đã được hủy trước đó.", 409);
      if (hasStarted(single))
        fail(
          "SESSION_ALREADY_STARTED",
          "Buổi học đã bắt đầu nên không thể hủy.",
          409,
        );
    }
    const cancelable = targets.filter(
      (item) => item.status === "SCHEDULED" && !hasStarted(item),
    );
    if (!cancelable.length)
      fail(
        "NO_CANCELABLE_SESSION",
        "Không còn buổi học nào ở tương lai để hủy.",
        409,
      );

    const at = timestamp();
    // Hủy buổi và hủy mọi đăng ký còn hiệu lực trong cùng một bước: không để
    // tồn đăng ký còn hiệu lực trỏ vào buổi đã hủy.
    for (const item of cancelable) {
      for (const registration of activeRegistrationsOf(item.id)) {
        registration.status = "CANCELED";
        registration.canceledAt = at;
        registration.canceledByName = actorName;
        registration.cancelReason = `Trung tâm hủy buổi học: ${trimmedReason}`;
      }
      item.status = "CANCELED";
      item.cancelReason = trimmedReason;
      item.canceledAt = at;
      item.updatedAt = at;
    }
    return cancelable.length;
  },

  async listPackages(): Promise<PackageSummary[]> {
    await wait();
    return store().packages.map((item) => ({ ...item }));
  },

  async getPackageSports(packageId: string): Promise<PackageSportEntitlement> {
    await wait();
    const data = store();
    if (!data.packages.some((item) => item.id === packageId))
      fail("PACKAGE_NOT_FOUND", "Không tìm thấy gói tập.", 404);
    const sportIds =
      data.packageSports.find((item) => item.packageId === packageId)
        ?.sportIds ?? [];
    return {
      packageId,
      sportIds: [...sportIds],
      allowsAllSports: sportIds.length === 0,
    };
  },

  async setPackageSports(
    packageId: string,
    sportIds: string[],
  ): Promise<PackageSportEntitlement> {
    await wait();
    const data = store();
    if (!data.packages.some((item) => item.id === packageId))
      fail("PACKAGE_NOT_FOUND", "Không tìm thấy gói tập.", 404);
    const unknown = sportIds.filter(
      (id) => !data.sports.some((sport) => sport.id === id),
    );
    if (unknown.length)
      fail("SPORT_NOT_FOUND", "Có bộ môn không còn tồn tại.", 404, {
        sportIds: ["Danh sách bộ môn chứa mục không hợp lệ."],
      });
    const inactive = sportIds.filter((id) =>
      data.sports.some((sport) => sport.id === id && !sport.isActive),
    );
    if (inactive.length)
      fail(
        "SPORT_INACTIVE",
        "Không thể cấp quyền cho bộ môn đã ngừng hoạt động.",
        409,
        { sportIds: ["Bỏ bộ môn đã ngừng hoạt động khỏi danh sách."] },
      );

    const unique = [...new Set(sportIds)];
    const existing = data.packageSports.find(
      (item) => item.packageId === packageId,
    );
    if (existing) existing.sportIds = unique;
    else data.packageSports.push({ packageId, sportIds: unique });
    return {
      packageId,
      sportIds: unique,
      allowsAllSports: unique.length === 0,
    };
  },

  async searchMembers(query: string): Promise<SessionMemberOption[]> {
    await wait();
    const needle = normalizeName(query);
    return store()
      .members.filter((item) =>
        normalizeName(
          `${item.fullName} ${item.memberCode} ${item.email} ${item.phone}`,
        ).includes(needle),
      )
      .map(({ id, memberCode, fullName, email, phone, isActive }) => ({
        id,
        memberCode,
        fullName,
        email,
        phone,
        isActive,
      }));
  },

  /**
   * Thành viên mock tương ứng người đang đăng nhập. Tài khoản demo của FE
   * không nằm trong tập mock, nên lần đầu sẽ được thêm vào với gói hợp lệ —
   * nếu không, màn hình "lớp của tôi" luôn rỗng và không demo được gì.
   */
  ensureMember(actor: { id: string; fullName: string; email: string }): string {
    const data = store();
    const existing = data.members.find((item) => item.id === actor.id);
    if (existing) return existing.id;
    data.members.push({
      id: actor.id,
      memberCode: `MEM${String(data.members.length + 1).padStart(4, "0")}`,
      fullName: actor.fullName,
      email: actor.email,
      phone: "",
      isActive: true,
      membershipStatus: "ACTIVE",
      membershipEndDate: addCalendarDays(centerToday(), 180),
      packageId: "4",
    });
    return actor.id;
  },

  async listRegistrations(filter: {
    memberId?: string;
    sessionId?: string;
    includeCanceled?: boolean;
  }): Promise<ClassRegistration[]> {
    await wait();
    return store()
      .registrations.filter(
        (item) =>
          (!filter.memberId || item.memberId === filter.memberId) &&
          (!filter.sessionId || item.sessionId === filter.sessionId) &&
          (filter.includeCanceled || item.status === "BOOKED"),
      )
      .map(projectRegistration)
      .sort((first, second) =>
        second.session.startsAt.localeCompare(first.session.startsAt),
      );
  },

  async register(
    sessionId: string,
    memberId: string,
    channel: RegistrationChannel,
    actorName: string,
  ): Promise<ClassRegistration> {
    await wait();
    const data = store();
    const record = requireSession(sessionId);
    const owner = requireClass(record.classId);
    const member = data.members.find((item) => item.id === memberId);
    if (!member) fail("MEMBER_NOT_FOUND", "Không tìm thấy thành viên.", 404);

    if (record.status === "CANCELED")
      fail("SESSION_CANCELLED", "Buổi học đã bị hủy.", 409);
    if (record.status === "COMPLETED" || hasStarted(record))
      fail("SESSION_ALREADY_STARTED", "Buổi học đã bắt đầu.", 409);
    if (owner.status !== "OPEN")
      fail(
        "CLASS_NOT_OPEN",
        `Lớp “${owner.name}” hiện không nhận đăng ký mới.`,
        409,
      );

    const duplicate = data.registrations.find(
      (item) =>
        item.sessionId === sessionId &&
        item.memberId === memberId &&
        item.status === "BOOKED",
    );
    if (duplicate)
      fail(
        "DUPLICATE_REGISTRATION",
        `${member.fullName} đã đăng ký buổi học này.`,
        409,
      );

    assertMemberEligible(member, record);

    if (activeRegistrationsOf(sessionId).length >= record.capacity)
      fail("CLASS_FULL", "Buổi học đã đủ chỗ.", 409);

    const created: MockRegistrationRecord = {
      id: nextId("registration"),
      sessionId,
      memberId,
      status: "BOOKED",
      registeredAt: timestamp(),
      registeredVia: channel,
      registeredByName: actorName,
    };
    data.registrations.push(created);
    return projectRegistration(created);
  },

  async cancelRegistration(
    registrationId: string,
    reason: string,
    actorName: string,
    requireReason: boolean,
  ): Promise<ClassRegistration> {
    await wait();
    const data = store();
    const record = data.registrations.find(
      (item) => item.id === registrationId,
    );
    if (!record) fail("REGISTRATION_NOT_FOUND", "Không tìm thấy đăng ký.", 404);
    if (record.status === "CANCELED")
      // Gửi lặp không được trả chỗ hai lần: lần thứ hai bị từ chối hẳn.
      fail(
        "REGISTRATION_ALREADY_CANCELED",
        "Đăng ký này đã được hủy trước đó.",
        409,
      );
    const session = requireSession(record.sessionId);
    if (hasStarted(session))
      fail(
        "SESSION_ALREADY_STARTED",
        "Buổi học đã bắt đầu nên không thể hủy đăng ký.",
        409,
      );
    const trimmedReason = reason.trim();
    if (
      requireReason &&
      (trimmedReason.length < 3 || trimmedReason.length > 500)
    )
      fail("VALIDATION_ERROR", "Nhập lý do hủy từ 3 đến 500 ký tự.", 400, {
        reason: ["Lý do hủy cần 3–500 ký tự."],
      });

    record.status = "CANCELED";
    record.canceledAt = timestamp();
    record.canceledByName = actorName;
    record.cancelReason = trimmedReason || undefined;
    return projectRegistration(record);
  },
};
