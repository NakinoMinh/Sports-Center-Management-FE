/**
 * Service cho lớp học, lịch học và đăng ký buổi học (UC19, UC21, UC24, UC25,
 * UC29, UC30).
 *
 * Mọi hàm gọi API Flow 2 của backend và map DTO sang model của giao diện.
 * Không còn nhánh dữ liệu mẫu: trước đây service tự rơi về `classMockServer`
 * khi `VITE_API_BASE_URL` trống, nên một màn hình cấu hình sai vẫn đặt chỗ
 * "thành công" trên dữ liệu trong bộ nhớ. Nay `apiRequest` ném lỗi cấu hình và
 * màn hình hiển thị lỗi đó, đúng yêu cầu Sprint 2: booking, counter và lịch cá
 * nhân chỉ có một nguồn duy nhất là server.
 *
 * Danh tính người gọi do server lấy từ token, nên các hàm `/me`, đăng ký và
 * hủy đăng ký không nhận tham số actor.
 *
 * Đường dẫn endpoint theo các controller Flow 2 đang chạy
 * (`SPRINT2_API_TEST_REPORT_FOR_FE_2026-10-15.md`, §3).
 */

import { apiRequest } from "./apiClient";
import { memberApi } from "./memberApi";
import type {
  CancelImpact,
  CancelScope,
  ClassInput,
  ClassRegistration,
  ClassSession,
  ClassSessionFilter,
  ClassSessionInput,
  ClassStatus,
  CoachOption,
  Room,
  SessionMemberOption,
  Sport,
  SessionRosterMember,
  TrainingClass,
} from "../types/classes";

// --- DTO ------------------------------------------------------------------

interface SportDto {
  id: number | string;
  name: string;
  isActive?: boolean;
}

interface RoomDto {
  id: number | string;
  name: string;
  location?: string | null;
  capacity: number;
  isActive?: boolean;
}

interface CoachOptionDto {
  accountId?: string;
  id?: number | string;
  fullName?: string | null;
  isActive?: boolean;
  status?: string;
  /**
   * `GET /api/Coach` gửi chuyên môn trong `disciplines`
   * (`CoachListItemAPIViewModel`). `specializations` chỉ còn để nhận các DTO cũ
   * và fixture; nếu chỉ đọc trường đó thì ô chọn HLV mất phần chuyên môn.
   */
  disciplines?: { disciplineId?: number | string; disciplineName?: string | null; isActive?: boolean }[] | null;
  specializations?: string[] | string | null;
}

interface ClassDto {
  id: number | string;
  sportId: number | string;
  sportName?: string | null;
  name: string;
  description?: string | null;
  capacity: number;
  status?: string;
  upcomingSessionCount?: number;
  totalSessionCount?: number;
  activeRegistrationCount?: number;
  createdAt?: string;
  updatedAt?: string | null;
}

interface SessionDto {
  id: number | string;
  classId: number | string;
  className?: string | null;
  sportId?: number | string | null;
  sportName?: string | null;
  coachId?: string | number | null;
  coachName?: string | null;
  roomId?: number | string | null;
  roomName?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAt?: string;
  endsAt?: string;
  capacity: number;
  bookedCount?: number;
  remainingCapacity?: number;
  status?: string;
  notes?: string | null;
  cancelReason?: string | null;
  canceledAt?: string | null;
  updatedAt?: string | null;
}

interface RegistrationDto {
  id: number | string;
  sessionId: number | string;
  memberAccountId?: string;
  memberId?: string;
  memberName?: string | null;
  memberCode?: string | null;
  status?: string;
  registeredAt?: string;
  registeredVia?: string;
  registeredByName?: string | null;
  canceledAt?: string | null;
  canceledByName?: string | null;
  cancelReason?: string | null;
  session: SessionDto;
}

type RosterDto = Pick<RegistrationDto, "id" | "sessionId" | "memberAccountId" | "memberName" | "memberCode" | "status" | "registeredVia" | "registeredAt">;

export const mapRoster = (dto: RosterDto): SessionRosterMember => ({
  id: String(dto.id), sessionId: String(dto.sessionId), memberId: dto.memberAccountId ?? "",
  memberName: dto.memberName ?? "—", memberCode: dto.memberCode ?? "—",
  status: dto.status === "CANCELED" ? "CANCELED" : "BOOKED",
  registeredVia: dto.registeredVia === "RECEPTIONIST" ? "RECEPTIONIST" : "MEMBER",
  registeredAt: dto.registeredAt ?? "",
});

interface CancelImpactDto {
  scope?: string;
  affectedSessionCount?: number;
  affectedRegistrationCount?: number;
  affectedMemberCount?: number;
  nextSessionStartsAt?: string | null;
}

interface PagedDto<T> {
  items: T[];
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
}

// --- Map DTO -> model -----------------------------------------------------

const id = (value: number | string | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

/**
 * Backend dùng `isActive` hoặc `status: "Active"` tùy controller của Sprint 1,
 * nên nhận cả hai và mặc định là đang hoạt động.
 */
const activeFlag = (dto: { isActive?: boolean; status?: string }): boolean =>
  dto.isActive ?? (dto.status ? dto.status.toLowerCase() === "active" : true);

export const mapSport = (dto: SportDto): Sport => ({
  id: id(dto.id),
  name: dto.name,
  isActive: activeFlag(dto),
});

export const mapRoom = (dto: RoomDto): Room => ({
  id: id(dto.id),
  name: dto.name,
  location: dto.location ?? "",
  capacity: dto.capacity,
  isActive: activeFlag(dto),
});

const coachExpertise = (dto: CoachOptionDto): string[] => {
  if (dto.disciplines?.length) {
    return dto.disciplines
      .filter((item) => item.isActive !== false)
      .map((item) => (item.disciplineName ?? "").trim())
      .filter(Boolean);
  }
  if (typeof dto.specializations === "string") {
    return dto.specializations
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return dto.specializations ?? [];
};

export const mapCoachOption = (dto: CoachOptionDto): CoachOption => ({
  id: dto.accountId ?? id(dto.id),
  fullName: dto.fullName?.trim() || "Huấn luyện viên chưa đặt tên",
  isActive: activeFlag(dto),
  specializations: coachExpertise(dto),
});

const CLASS_STATUSES: readonly ClassStatus[] = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "ARCHIVED",
];

/** Trạng thái lạ được quy về DRAFT, vì DRAFT là trạng thái không cho đặt chỗ. */
const classStatusOf = (value: string | undefined): ClassStatus => {
  const normalized = (value ?? "").toUpperCase() as ClassStatus;
  return CLASS_STATUSES.includes(normalized) ? normalized : "DRAFT";
};

export const mapClass = (dto: ClassDto): TrainingClass => ({
  id: id(dto.id),
  sportId: id(dto.sportId),
  sportName: dto.sportName ?? "—",
  name: dto.name,
  description: dto.description ?? "",
  capacity: dto.capacity,
  status: classStatusOf(dto.status),
  upcomingSessionCount: dto.upcomingSessionCount ?? 0,
  totalSessionCount: dto.totalSessionCount ?? 0,
  activeRegistrationCount: dto.activeRegistrationCount ?? 0,
  createdAt: dto.createdAt ?? new Date().toISOString(),
  updatedAt: dto.updatedAt ?? dto.createdAt ?? new Date().toISOString(),
});

const sessionStatusOf = (value: string | undefined): ClassSession["status"] => {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "CANCELED" || normalized === "CANCELLED")
    return "CANCELED";
  if (normalized === "COMPLETED") return "COMPLETED";
  return "SCHEDULED";
};

export const mapSession = (dto: SessionDto): ClassSession => {
  const capacity = dto.capacity;
  const bookedCount = dto.bookedCount ?? 0;
  return {
    id: id(dto.id),
    classId: id(dto.classId),
    className: dto.className ?? "—",
    sportId: id(dto.sportId),
    sportName: dto.sportName ?? "—",
    coachId: id(dto.coachId),
    coachName: dto.coachName ?? "Chưa phân công",
    roomId: id(dto.roomId),
    roomName: dto.roomName ?? "—",
    date: dto.date.slice(0, 10),
    startTime: dto.startTime.slice(0, 5),
    endTime: dto.endTime.slice(0, 5),
    startsAt: dto.startsAt ?? `${dto.date.slice(0, 10)}T${dto.startTime}`,
    endsAt: dto.endsAt ?? `${dto.date.slice(0, 10)}T${dto.endTime}`,
    capacity,
    bookedCount,
    // Số chỗ còn lại phải do server tính; chỉ suy ra khi DTO thiếu hẳn trường.
    remainingCapacity: Math.max(
      0,
      dto.remainingCapacity ?? capacity - bookedCount,
    ),
    status: sessionStatusOf(dto.status),
    notes: dto.notes ?? "",
    cancelReason: dto.cancelReason ?? undefined,
    canceledAt: dto.canceledAt ?? undefined,
    updatedAt: dto.updatedAt ?? new Date().toISOString(),
  };
};

export const mapRegistration = (dto: RegistrationDto): ClassRegistration => ({
  id: id(dto.id),
  sessionId: id(dto.sessionId),
  memberId: dto.memberAccountId ?? dto.memberId ?? "",
  memberName: dto.memberName ?? dto.memberCode ?? "—",
  memberCode: dto.memberCode ?? "—",
  status: (dto.status ?? "").toUpperCase() === "CANCELED" ? "CANCELED" : "BOOKED",
  registeredAt: dto.registeredAt ?? new Date().toISOString(),
  registeredVia:
    (dto.registeredVia ?? "").toUpperCase() === "RECEPTIONIST"
      ? "RECEPTIONIST"
      : "MEMBER",
  registeredByName: dto.registeredByName ?? dto.memberName ?? "—",
  canceledAt: dto.canceledAt ?? undefined,
  canceledByName: dto.canceledByName ?? undefined,
  cancelReason: dto.cancelReason ?? undefined,
  session: mapSession(dto.session),
});

export const mapCancelImpact = (
  dto: CancelImpactDto,
  fallbackScope: CancelScope,
): CancelImpact => ({
  scope:
    (dto.scope ?? "").toUpperCase() === "CLASS_FUTURE_SESSIONS"
      ? "CLASS_FUTURE_SESSIONS"
      : (dto.scope ?? "").toUpperCase() === "SESSION"
        ? "SESSION"
        : fallbackScope,
  affectedSessionCount: dto.affectedSessionCount ?? 0,
  affectedRegistrationCount: dto.affectedRegistrationCount ?? 0,
  affectedMemberCount: dto.affectedMemberCount ?? 0,
  nextSessionStartsAt: dto.nextSessionStartsAt ?? undefined,
});

const classPayload = (input: ClassInput) => ({
  sportId: Number.isNaN(Number(input.sportId))
    ? input.sportId
    : Number(input.sportId),
  name: input.name.trim(),
  description: input.description.trim(),
  capacity: input.capacity,
  status: input.status,
});

const sessionPayload = (input: ClassSessionInput) => ({
  classId: Number.isNaN(Number(input.classId))
    ? input.classId
    : Number(input.classId),
  coachId: input.coachId,
  roomId: Number.isNaN(Number(input.roomId))
    ? input.roomId
    : Number(input.roomId),
  date: input.date,
  startTime: input.startTime,
  endTime: input.endTime,
  capacity: input.capacity,
  notes: input.notes.trim(),
});

const sessionQuery = (filter: ClassSessionFilter): string => {
  const query = new URLSearchParams();
  if (filter.classId) query.set("classId", filter.classId);
  if (filter.coachId) query.set("coachId", filter.coachId);
  if (filter.roomId) query.set("roomId", filter.roomId);
  if (filter.sportId) query.set("sportId", filter.sportId);
  if (filter.status && filter.status !== "ALL")
    query.set("status", filter.status);
  if (filter.from) query.set("from", filter.from);
  if (filter.to) query.set("to", filter.to);
  const text = query.toString();
  return text ? `?${text}` : "";
};

/** Danh sách có phân trang: lấy hết trang để màn hình lọc tại chỗ. */
async function listAllPages<T>(path: string, pageSize = 20): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  const separator = path.includes("?") ? "&" : "?";
  do {
    const result = await apiRequest<PagedDto<T>>(
      `${path}${separator}page=${page}&pageSize=${pageSize}`,
    );
    items.push(...result.items);
    totalPages = Math.max(1, result.totalPages ?? 1);
    page += 1;
  } while (page <= totalPages);
  return items;
}

export const classApi = {
  // --- Dữ liệu tham chiếu (bộ môn, phòng, Coach) --------------------------

  async listSports(): Promise<Sport[]> {
    const items = await listAllPages<SportDto>("/Sport");
    return items.map(mapSport);
  },

  async listRooms(): Promise<Room[]> {
    const items = await listAllPages<RoomDto>("/Room");
    return items.map(mapRoom);
  },

  async listCoaches(): Promise<CoachOption[]> {
    const items = await listAllPages<CoachOptionDto>("/Coach");
    return items.map(mapCoachOption);
  },

  // --- UC19: quản lý lớp --------------------------------------------------

  async listClasses(): Promise<TrainingClass[]> {
    const items = await listAllPages<ClassDto>("/Class");
    return items.map(mapClass);
  },

  async saveClass(input: ClassInput, classId?: string): Promise<TrainingClass> {
    const result = await apiRequest<ClassDto>(
      classId ? `/Class/${classId}` : "/Class",
      {
        method: classId ? "PUT" : "POST",
        body: JSON.stringify(classPayload(input)),
      },
    );
    return mapClass(result);
  },

  async setClassStatus(
    classId: string,
    status: ClassStatus,
  ): Promise<TrainingClass> {
    const result = await apiRequest<ClassDto>(`/Class/${classId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapClass(result);
  },

  // --- UC21: lập và sửa lịch ---------------------------------------------

  async listSessions(filter: ClassSessionFilter = {}): Promise<ClassSession[]> {
    const items = await listAllPages<SessionDto>(
      `/ClassSession${sessionQuery(filter)}`,
    );
    return items.map(mapSession);
  },

  async saveSession(
    input: ClassSessionInput,
    sessionId?: string,
  ): Promise<ClassSession> {
    const result = await apiRequest<SessionDto>(
      sessionId ? `/ClassSession/${sessionId}` : "/ClassSession",
      {
        method: sessionId ? "PUT" : "POST",
        body: JSON.stringify(sessionPayload(input)),
      },
    );
    return mapSession(result);
  },

  // --- UC30: hủy buổi hoặc mọi buổi tương lai của lớp --------------------

  async previewCancel(
    scope: CancelScope,
    target: { sessionId?: string; classId?: string },
  ): Promise<CancelImpact> {
    const path =
      scope === "SESSION"
        ? `/ClassSession/${target.sessionId}/cancel-impact`
        : `/Class/${target.classId}/cancel-impact`;
    return mapCancelImpact(await apiRequest<CancelImpactDto>(path), scope);
  },

  /** Trả về số buổi đã hủy, để thông báo nói đúng con số. */
  async cancelSessions(
    scope: CancelScope,
    target: { sessionId?: string; classId?: string },
    reason: string,
  ): Promise<number> {
    if (scope === "SESSION") {
      await apiRequest(`/ClassSession/${target.sessionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      return 1;
    }
    const result = await apiRequest<{ canceledSessionCount?: number }>(
      `/Class/${target.classId}/cancel-future-sessions`,
      { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
    );
    return result?.canceledSessionCount ?? 0;
  },

  // --- UC24, UC25, UC29: đăng ký và hủy đăng ký --------------------------

  /**
   * Đăng ký của chính người đang đăng nhập (UC26). Server lấy danh tính từ
   * token, nên FE không gửi memberId của mình lên; `from`/`to` để không tải cả
   * lịch sử khi màn hình chỉ xem một tuần.
   */
  async listMyRegistrations(
    includeCanceled = false,
    range: { from?: string; to?: string } = {},
  ): Promise<ClassRegistration[]> {
    const query = new URLSearchParams({
      includeCanceled: String(includeCanceled),
    });
    if (range.from) query.set("from", range.from);
    if (range.to) query.set("to", range.to);
    const items = await listAllPages<RegistrationDto>(
      `/ClassRegistration/me?${query.toString()}`,
    );
    return items.map(mapRegistration);
  },

  /** Đăng ký của một thành viên, dùng ở màn hình quầy (UC29). */
  async listMemberRegistrations(
    memberId: string,
    includeCanceled = true,
  ): Promise<ClassRegistration[]> {
    const items = await listAllPages<RegistrationDto>(
      `/ClassRegistration?memberAccountId=${encodeURIComponent(memberId)}&includeCanceled=${includeCanceled}`,
    );
    return items.map(mapRegistration);
  },

  async registerMyself(sessionId: string): Promise<ClassRegistration> {
    const result = await apiRequest<RegistrationDto>(
      "/ClassRegistration/register",
      { method: "POST", body: JSON.stringify({ sessionId: Number(sessionId) }) },
    );
    return mapRegistration(result);
  },

  async registerAtCounter(
    sessionId: string,
    memberId: string,
  ): Promise<ClassRegistration> {
    const result = await apiRequest<RegistrationDto>(
      "/ClassRegistration/counter-register",
      {
        method: "POST",
        body: JSON.stringify({ sessionId: Number(sessionId), memberAccountId: memberId }),
      },
    );
    return mapRegistration(result);
  },

  /** Thành viên tự hủy; server kiểm tra đăng ký có thuộc về người gọi. */
  async cancelMyRegistration(
    registrationId: string,
    reason: string,
  ): Promise<ClassRegistration> {
    const result = await apiRequest<RegistrationDto>(
      `/ClassRegistration/${registrationId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
      },
    );
    return mapRegistration(result);
  },

  /** Lễ tân hủy thay; lý do là bắt buộc để audit nói được vì sao. */
  async cancelAtCounter(
    registrationId: string,
    reason: string,
  ): Promise<ClassRegistration> {
    const result = await apiRequest<RegistrationDto>(
      `/ClassRegistration/${registrationId}/counter-cancel`,
      { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
    );
    return mapRegistration(result);
  },

  /** Roster một buổi, dùng khi hiển thị ai sẽ bị ảnh hưởng nếu đổi/hủy lịch. */
  async listSessionRegistrations(
    sessionId: string,
  ): Promise<SessionRosterMember[]> {
    const items = await listAllPages<RosterDto>(
      `/ClassSession/${sessionId}/registrations?includeCanceled=true`,
    );
    return items.map(mapRoster);
  },

  async listTeachingSessions(filter: ClassSessionFilter = {}): Promise<ClassSession[]> {
    return (await listAllPages<SessionDto>(`/ClassSession/me${sessionQuery(filter)}`)).map(mapSession);
  },

  /**
   * Tìm thành viên cho màn hình quầy. Dùng lại API Member của Sprint 1 khi có
   * backend, nên không phát sinh endpoint mới cho UC29.
   */
  async searchMembers(query: string): Promise<SessionMemberOption[]> {
    const result = await memberApi.listMembers(1, 20, query, "ALL");
    return result.items.map((item) => ({
      id: item.id,
      memberCode: item.username,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone ?? "",
      isActive: item.isActive !== false,
    }));
  },
};
