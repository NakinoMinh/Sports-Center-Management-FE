import { authorizeRoles, accessRules } from "./accessControl";
import { addDateDays, todayDate } from "./membershipService";
import type { MembershipActor } from "../types/membership";

export const RECEPTION_STORAGE_KEY = "scms_reception_v1";
export interface CenterVisit {
  id: string;
  memberId: string;
  date: string;
  checkedInAt: string;
  checkedOutAt?: string;
  createdBy: string;
}
export interface ClassSession {
  id: string;
  name: string;
  discipline: string;
  coach: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
}
export interface ClassBooking {
  id: string;
  memberId: string;
  sessionId: string;
  status: "BOOKED" | "CANCELED";
  createdAt: string;
  createdBy: string;
  canceledAt?: string;
  canceledBy?: string;
  cancelReason?: string;
}
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export interface SupportRequest {
  id: string;
  memberId: string;
  category: string;
  subject: string;
  description: string;
  status: SupportStatus;
  createdAt: string;
  createdBy: string;
  updates: { status: SupportStatus; note: string; at: string; by: string }[];
}
export interface ReceptionState {
  version: 1;
  visits: CenterVisit[];
  sessions: ClassSession[];
  bookings: ClassBooking[];
  requests: SupportRequest[];
}

function authorize(actor: MembershipActor) {
  authorizeRoles(actor, accessRules.counter);
}
function memberExists(memberId: string) {
  if (!memberId) throw new Error("Vui lòng chọn thành viên hợp lệ.");
  return { id: memberId };
}
function hasAccess(_actor: MembershipActor, memberId: string, _date: string) {
  if (!memberId) throw new Error("Vui lòng chọn thành viên hợp lệ.");
}
function save(state: ReceptionState) {
  try {
    localStorage.setItem(RECEPTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "Không thể lưu dữ liệu. Vui lòng kiểm tra bộ nhớ trình duyệt và thử lại.",
    );
  }
}
function read(): ReceptionState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(RECEPTION_STORAGE_KEY);
  } catch {
    throw new Error("Không thể đọc dữ liệu lễ tân.");
  }
  if (raw !== null) {
    try {
      const value = JSON.parse(raw);
      if (
        value.version !== 1 ||
        ![value.visits, value.sessions, value.bookings, value.requests].every(
          Array.isArray,
        )
      )
        throw new Error();
      return value;
    } catch {
      throw new Error("Dữ liệu lễ tân không hợp lệ. Không thể tải danh sách.");
    }
  }
  const sessions: ClassSession[] = Array.from({ length: 7 }, (_, day) =>
    [
      {
        name: "Yoga cân bằng",
        discipline: "Yoga",
        room: "Studio A",
        startTime: "08:00",
        endTime: "09:00",
        capacity: 15,
      },
      {
        name: "Sức mạnh toàn thân",
        discipline: "Fitness",
        room: "Studio B",
        startTime: "17:30",
        endTime: "18:30",
        capacity: 20,
      },
    ].map((item, index) => ({
      ...item,
      id: `session_${day}_${index}`,
      date: addDateDays(todayDate(), day),
      coach: "Trần Huấn Luyện Viên",
    })),
  ).flat();
  const state: ReceptionState = {
    version: 1,
    visits: [],
    sessions,
    bookings: [],
    requests: [],
  };
  save(state);
  return state;
}
function sessionFuture(session: ClassSession) {
  if (
    new Date(`${session.date}T${session.startTime}:00`).getTime() <= Date.now()
  )
    throw new Error(
      "Buổi học đã bắt đầu; không thể đăng ký hoặc hủy tại quầy.",
    );
}
const timestamp = () => new Date().toISOString();
export const receptionService = {
  getSnapshot(actor: MembershipActor) {
    authorize(actor);
    return read();
  },
  checkIn(actor: MembershipActor, memberId: string) {
    authorize(actor);
    hasAccess(actor, memberId, todayDate());
    const state = read();
    if (
      state.visits.some(
        (visit) => visit.memberId === memberId && visit.date === todayDate(),
      )
    )
      throw new Error("Thành viên đã được điểm danh hôm nay.");
    state.visits.unshift({
      id: crypto.randomUUID(),
      memberId,
      date: todayDate(),
      checkedInAt: timestamp(),
      createdBy: actor.id,
    });
    save(state);
  },
  checkOut(actor: MembershipActor, id: string) {
    authorize(actor);
    const state = read();
    const visit = state.visits.find((item) => item.id === id);
    if (!visit || visit.checkedOutAt)
      throw new Error("Lượt điểm danh không tồn tại hoặc đã ghi nhận ra về.");
    visit.checkedOutAt = timestamp();
    save(state);
  },
  bookClass(actor: MembershipActor, memberId: string, sessionId: string) {
    authorize(actor);
    const state = read();
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("Không tìm thấy buổi học.");
    sessionFuture(session);
    hasAccess(actor, memberId, session.date);
    const booked = state.bookings.filter(
      (booking) => booking.status === "BOOKED",
    );
    if (
      booked.some(
        (booking) =>
          booking.memberId === memberId && booking.sessionId === sessionId,
      )
    )
      throw new Error("Thành viên đã đăng ký buổi học này.");
    if (
      booked.filter((booking) => booking.sessionId === sessionId).length >=
      session.capacity
    )
      throw new Error("Lớp học đã đủ chỗ.");
    if (
      booked.some((booking) => {
        const other = state.sessions.find(
          (item) => item.id === booking.sessionId,
        );
        return (
          booking.memberId === memberId &&
          other &&
          other.date === session.date &&
          other.startTime < session.endTime &&
          other.endTime > session.startTime
        );
      })
    )
      throw new Error("Buổi học trùng lịch với lớp thành viên đã đăng ký.");
    state.bookings.unshift({
      id: crypto.randomUUID(),
      memberId,
      sessionId,
      status: "BOOKED",
      createdAt: timestamp(),
      createdBy: actor.id,
    });
    save(state);
  },
  cancelBooking(actor: MembershipActor, id: string, reason: string) {
    authorize(actor);
    const state = read();
    const booking = state.bookings.find((item) => item.id === id);
    if (!booking || booking.status !== "BOOKED")
      throw new Error("Đăng ký không tồn tại hoặc đã hủy.");
    const session = state.sessions.find(
      (item) => item.id === booking.sessionId,
    );
    if (!session) throw new Error("Không tìm thấy buổi học.");
    sessionFuture(session);
    if (reason.trim().length < 3 || reason.trim().length > 500)
      throw new Error("Nhập lý do hủy từ 3 đến 500 ký tự.");
    Object.assign(booking, {
      status: "CANCELED",
      canceledAt: timestamp(),
      canceledBy: actor.id,
      cancelReason: reason.trim(),
    });
    save(state);
  },
  createRequest(
    actor: MembershipActor,
    input: Pick<
      SupportRequest,
      "memberId" | "category" | "subject" | "description"
    >,
  ) {
    authorize(actor);
    memberExists(input.memberId);
    if (
      !["Gói tập", "Lớp học", "Thanh toán", "Cơ sở vật chất", "Khác"].includes(
        input.category,
      )
    )
      throw new Error("Chọn nhóm yêu cầu hợp lệ.");
    if (
      input.subject.trim().length < 3 ||
      input.subject.trim().length > 120 ||
      input.description.trim().length < 10 ||
      input.description.trim().length > 2000
    )
      throw new Error("Tiêu đề cần 3–120 ký tự; nội dung cần 10–2000 ký tự.");
    const state = read();
    state.requests.unshift({
      ...input,
      subject: input.subject.trim(),
      description: input.description.trim(),
      id: crypto.randomUUID(),
      status: "OPEN",
      createdAt: timestamp(),
      createdBy: actor.id,
      updates: [],
    });
    save(state);
  },
  updateRequest(
    actor: MembershipActor,
    id: string,
    status: SupportStatus,
    note: string,
  ) {
    authorize(actor);
    const state = read();
    const request = state.requests.find((item) => item.id === id);
    if (!request) throw new Error("Không tìm thấy yêu cầu hỗ trợ.");
    if (
      !["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status) ||
      note.trim().length < 3 ||
      note.trim().length > 2000
    )
      throw new Error(
        "Chọn trạng thái hợp lệ và nhập ghi chú từ 3–2000 ký tự.",
      );
    request.status = status;
    request.updates.push({
      status,
      note: note.trim(),
      at: timestamp(),
      by: actor.id,
    });
    save(state);
  },
};
