/**
 * Điểm danh và yêu cầu hỗ trợ tại quầy, lưu tạm trên LocalStorage vì hai
 * chức năng này chưa có API (ngoài phạm vi Sprint 2).
 *
 * Đặt và hủy lớp **không** còn ở đây: trước đây service giữ sẵn bảy ngày buổi
 * học mẫu và một mảng `bookings` trong LocalStorage, nên hai máy ở quầy thấy
 * hai tập dữ liệu khác nhau và không có quy tắc gói tập nào được kiểm tra.
 * UC29 nay đi qua `classApi` — xem `CounterClassBooking` — nên phần
 * lịch/booking ở đây đã được bỏ hẳn: không còn nguồn booking nào ngoài server.
 */

import { authorizeRoles, accessRules } from "./accessControl";
import { todayDate } from "./membershipService";
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
        ![value.visits, value.requests].every(Array.isArray)
      )
        throw new Error();
      // Dữ liệu lưu từ bản cũ còn `sessions`/`bookings`: bỏ qua hai mảng đó
      // thay vì báo lỗi, để lịch sử điểm danh và hỗ trợ không mất khi nâng cấp.
      return { version: 1, visits: value.visits, requests: value.requests };
    } catch {
      throw new Error("Dữ liệu lễ tân không hợp lệ. Không thể tải danh sách.");
    }
  }
  const state: ReceptionState = { version: 1, visits: [], requests: [] };
  save(state);
  return state;
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
