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
  isActive: boolean;
}

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

export interface ClassInput {
  sportId: string;
  name: string;
  description: string;
  capacity: number;
  status: ClassStatus;
}

export interface TrainingClass extends ClassInput {
  id: string;
  sportName: string;
  /** Số buổi còn ở tương lai và chưa hủy. Server tính, FE không suy ra. */
  upcomingSessionCount: number;
  totalSessionCount: number;
  /** Số đăng ký còn hiệu lực trên toàn bộ buổi của lớp. */
  activeRegistrationCount: number;
  createdAt: string;
  updatedAt: string;
}

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
