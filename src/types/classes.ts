/**
 * Domain model cho Flow 2 — lớp học, buổi học và đăng ký buổi học.
 *
 * Mọi ID đều là chuỗi ở phía FE, kể cả khi backend dùng số: màn hình chỉ so
 * sánh và truyền lại ID, nên giữ một kiểu duy nhất tránh lỗi `1 !== "1"` khi
 * map DTO.
 *
 * Quy ước thời gian (chốt tại Sprint2.md §6):
 * - `date` là ngày theo lịch trung tâm, dạng `YYYY-MM-DD`.
 * - `startTime` / `endTime` là giờ trung tâm, dạng `HH:mm`, khoảng [start, end).
 * - `startsAt` / `endsAt` là timestamp có offset do server tính, dùng để so
 *   mốc "đã bắt đầu chưa" — không tin giờ máy khách để quyết định nghiệp vụ.
 */

/** Bộ môn (UC17, Long sở hữu màn hình; ở đây chỉ dùng để chọn khi tạo lớp). */
export interface Sport {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SportInput = {
  name: string;
  description: string;
};

/**
 * Phòng tập (UC18) do Tam sở hữu, định nghĩa gốc nằm ở `types/room.ts`.
 * Re-export để màn hình lập lịch và màn hình quản lý phòng dùng chung một
 * model: thêm trường ở một nơi là cả hai bên thấy, không lệch nhau.
 */
export type { Room } from "./room";

/** Thông tin Coach tối thiểu cần cho dropdown phân công. */
export interface CoachOption {
  id: string;
  fullName: string;
  isActive: boolean;
  specializations: string[];
}

/**
 * Trạng thái lớp.
 * - `DRAFT`: đang soạn, chưa cho đặt chỗ.
 * - `OPEN`: nhận đăng ký (server chỉ cho chuyển sang OPEN khi có buổi hợp lệ).
 * - `CLOSED`: ngừng nhận đăng ký mới, buổi đã đăng ký vẫn giữ.
 * - `ARCHIVED`: ẩn khỏi danh sách vận hành, giữ toàn bộ lịch sử.
 */
export type ClassStatus = "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";

/**
 * Thứ trong tuần theo quy ước của `Date.getDay()`: 0 là Chủ nhật, 6 là Thứ bảy.
 * Backend dùng đúng quy ước này cho `daysOfWeek`.
 */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Lịch học của lớp — giáo viên đứng lớp, phòng, khoảng ngày, các thứ trong tuần
 * và khung giờ. Tạo lớp phải kèm khối này: lớp sinh ra là đã có đủ buổi học
 * trên lịch trung tâm, chứ không phải một vỏ rỗng chờ thêm từng buổi một.
 */
export interface ClassScheduleInput {
  coachId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: WeekDay[];
  startTime: string;
  endTime: string;
  /** Bỏ trống thì mỗi buổi lấy luôn sức chứa của lớp. */
  sessionCapacity?: number;
  notes?: string;
}

/**
 * Một đợt lịch của lớp, server suy ra từ các buổi đã lập: cùng giáo viên, cùng
 * phòng và cùng ca học thì là một đợt. Lớp dạy tối T2/T4 và sáng T6 có hai đợt
 * — hiện riêng từng đợt, vì gộp một dòng thì mọi ca đều bị hiển thị theo giờ
 * của đợt sớm nhất.
 */
export interface ClassScheduleBlock {
  coachId: string;
  coachName: string;
  roomId: string;
  roomName: string;
  /** Ngày của buổi đầu và buổi cuối trong đợt này. */
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: WeekDay[];
  sessionCount: number;
}

export interface ClassInput {
  sportId: string;
  name: string;
  description: string;
  capacity: number;
  status: ClassStatus;
}

/** Tạo lớp: thông tin lớp cộng lịch học bắt buộc. Có thể kèm các đợt lịch bổ sung. */
export interface CreateClassInput extends ClassInput {
  schedule: ClassScheduleInput;
  additionalSchedules?: ClassScheduleInput[];
}

export interface TrainingClass extends ClassInput {
  id: string;
  sportName: string;
  /** Số buổi còn ở tương lai và chưa hủy. Server tính, FE không suy ra. */
  upcomingSessionCount: number;
  totalSessionCount: number;
  /** Số đăng ký còn hiệu lực trên toàn bộ buổi của lớp. */
  activeRegistrationCount: number;
  /** Rỗng khi lớp chưa có buổi nào còn hiệu lực. */
  scheduleBlocks: ClassScheduleBlock[];
  createdAt: string;
  updatedAt: string;
}

export type ClassListFilter = {
  search?: string;
  sportId?: string;
  status?: ClassStatus;
};

export type ClassSessionStatus = "SCHEDULED" | "CANCELED" | "COMPLETED";

export interface ClassSessionInput {
  classId: string;
  coachId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes: string;
}

export interface ClassSession {
  id: string;
  classId: string;
  className: string;
  sportId: string;
  sportName: string;
  coachId: string;
  coachName: string;
  roomId: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  /** Số chỗ đã đặt do server tính; FE không tự đếm từ danh sách đăng ký. */
  bookedCount: number;
  remainingCapacity: number;
  status: ClassSessionStatus;
  notes: string;
  cancelReason?: string;
  canceledAt?: string;
  updatedAt: string;
}

export type ClassRegistrationStatus = "BOOKED" | "CANCELED";

/** Vai trò đã thực hiện thao tác, để quầy và tự đăng ký phân biệt được. */
export type RegistrationChannel = "MEMBER" | "RECEPTIONIST";

export interface ClassRegistration {
  id: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  status: ClassRegistrationStatus;
  registeredAt: string;
  registeredVia: RegistrationChannel;
  /** Người bấm nút — khác member khi lễ tân đăng ký thay. */
  registeredByName: string;
  canceledAt?: string;
  canceledByName?: string;
  cancelReason?: string;
  /** Snapshot buổi học, để danh sách đăng ký hiển thị không cần gọi thêm. */
  session: ClassSession;
}

/**
 * Một lượt đăng ký lớp học. Thành viên đăng ký cả lớp: server giữ chỗ cho mọi
 * buổi còn ở tương lai của lớp, `sessions` là các buổi đã giữ chỗ (vẫn cần cho
 * lịch cá nhân và điểm danh).
 */
export interface ClassEnrollment {
  classId: string;
  className: string;
  sportId: string;
  sportName: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  /** BOOKED khi còn ít nhất một buổi đang giữ chỗ, ngược lại CANCELED. */
  status: ClassRegistrationStatus;
  registeredAt: string;
  registeredVia: RegistrationChannel;
  registeredByName: string;
  canceledAt?: string;
  canceledByName?: string;
  cancelReason?: string;
  bookedSessionCount: number;
  upcomingSessionCount: number;
  scheduleBlocks: ClassScheduleBlock[];
  sessions: ClassRegistration[];
}

/** Phạm vi hủy của UC30 — một buổi, hay mọi buổi tương lai của lớp. */
export type CancelScope = "SESSION" | "CLASS_FUTURE_SESSIONS";

/** Số liệu ảnh hưởng, hiển thị trong dialog xác nhận trước khi hủy. */
export interface CancelImpact {
  scope: CancelScope;
  affectedSessionCount: number;
  affectedRegistrationCount: number;
  affectedMemberCount: number;
  nextSessionStartsAt?: string;
}

export interface ClassSessionFilter {
  classId?: string;
  coachId?: string;
  roomId?: string;
  sportId?: string;
  status?: ClassSessionStatus | "ALL";
  from?: string;
  to?: string;
}

/** Thành viên ở màn hình quầy (UC29) — tái dùng kết quả tìm Member Sprint 1. */
export interface SessionMemberOption {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
}

export type SessionRosterMember = Pick<ClassRegistration, "id" | "sessionId" | "memberId" | "memberName" | "memberCode" | "status" | "registeredVia" | "registeredAt">;
