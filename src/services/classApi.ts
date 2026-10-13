/**
 * Service cho lớp học, lịch học và đăng ký buổi học (UC19, UC21, UC24, UC25,
 * UC29, UC30).
 *
 * Mỗi hàm có hai đường đi:
 * - Backend đã cấu hình (`VITE_API_BASE_URL`): gọi API thật và map DTO.
 * - Chưa cấu hình: gọi `classMockServer`, mô phỏng đúng mã lỗi của contract.
 *
 * Nhờ vậy màn hình chỉ biết một bề mặt duy nhất. Khi API Flow 2 lên, xóa các
 * nhánh `if (runsOnMockData())` là xong — không phải sửa page hay component nào.
 * `isClassApiMocked()` cho màn hình hiển thị nhãn "dữ liệu mẫu", để không ai
 * nhầm bản demo với dữ liệu đã lưu ở server.
 *
 * Đường dẫn endpoint lấy từ docs/API_SPECIFICATION_SPRINT2_MINH.md. Chốt lại
 * với backend trong ngày đầu sprint trước khi coi là cố định.
 */

import { apiRequest, isApiConfigured } from "./apiClient";
import { classMockServer } from "./classMockServer";
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
  RegistrationChannel,
  Room,
  SessionMemberOption,
  Sport,
  TrainingClass,
} from "../types/classes";
import type { MembershipActor } from "../types/membership";

const runsOnMockData = (): boolean => !isApiConfigured();

/** True khi màn hình đang chạy trên dữ liệu mẫu thay vì API thật. */
export const isClassApiMocked = (): boolean => runsOnMockData();

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

export const mapCoachOption = (dto: CoachOptionDto): CoachOption => ({
  id: dto.accountId ?? id(dto.id),
  fullName: dto.fullName?.trim() || "Huấn luyện viên chưa đặt tên",
  isActive: activeFlag(dto),
  specializations:
    typeof dto.specializations === "string"
      ? dto.specializations
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : (dto.specializations ?? []),
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
    if (runsOnMockData()) return classMockServer.listSports();
    const items = await listAllPages<SportDto>("/Sport");
    return items.map(mapSport);
  },

  async listRooms(): Promise<Room[]> {
    if (runsOnMockData()) return classMockServer.listRooms();
    const items = await listAllPages<RoomDto>("/Room");
    return items.map(mapRoom);
  },

  async listCoaches(): Promise<CoachOption[]> {
    if (runsOnMockData()) return classMockServer.listCoaches();
    const items = await listAllPages<CoachOptionDto>("/Coach");
    return items.map(mapCoachOption);
  },

  // --- UC19: quản lý lớp --------------------------------------------------

  async listClasses(): Promise<TrainingClass[]> {
    if (runsOnMockData()) return classMockServer.listClasses();
    const items = await listAllPages<ClassDto>("/Class");
    return items.map(mapClass);
  },

  async saveClass(input: ClassInput, classId?: string): Promise<TrainingClass> {
    if (runsOnMockData()) return classMockServer.saveClass(input, classId);
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
    if (runsOnMockData()) return classMockServer.setClassStatus(classId, status);
    const result = await apiRequest<ClassDto>(`/Class/${classId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapClass(result);
  },

  // --- UC21: lập và sửa lịch ---------------------------------------------

  async listSessions(filter: ClassSessionFilter = {}): Promise<ClassSession[]> {
    if (runsOnMockData()) return classMockServer.listSessions(filter);
    const items = await listAllPages<SessionDto>(
      `/ClassSession${sessionQuery(filter)}`,
    );
    return items.map(mapSession);
  },

  async saveSession(
    input: ClassSessionInput,
    sessionId?: string,
  ): Promise<ClassSession> {
    if (runsOnMockData()) return classMockServer.saveSession(input, sessionId);
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
    if (runsOnMockData()) return classMockServer.previewCancel(scope, target);
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
    actor: MembershipActor,
  ): Promise<number> {
    if (runsOnMockData())
      return classMockServer.cancelSessions(
        scope,
        target,
        reason,
        actor.fullName,
      );
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
   * Đăng ký của chính người đang đăng nhập. Danh tính lấy từ token phía server;
   * `actor` chỉ dùng cho nhánh mock, FE không được gửi memberId của mình lên.
   */
  async listMyRegistrations(
    actor: MembershipActor,
    includeCanceled = false,
  ): Promise<ClassRegistration[]> {
    if (runsOnMockData())
      return classMockServer.listRegistrations({
        memberId: classMockServer.ensureMember(actor),
        includeCanceled,
      });
    const items = await listAllPages<RegistrationDto>(
      `/ClassRegistration/me?includeCanceled=${includeCanceled}`,
    );
    return items.map(mapRegistration);
  },

  /** Đăng ký của một thành viên, dùng ở màn hình quầy (UC29). */
  async listMemberRegistrations(
    memberId: string,
    includeCanceled = true,
  ): Promise<ClassRegistration[]> {
    if (runsOnMockData())
      return classMockServer.listRegistrations({ memberId, includeCanceled });
    const items = await listAllPages<RegistrationDto>(
      `/ClassRegistration?memberAccountId=${encodeURIComponent(memberId)}&includeCanceled=${includeCanceled}`,
    );
    return items.map(mapRegistration);
  },

  async registerMyself(
    sessionId: string,
    actor: MembershipActor,
  ): Promise<ClassRegistration> {
    if (runsOnMockData())
      return classMockServer.register(
        sessionId,
        classMockServer.ensureMember(actor),
        "MEMBER",
        actor.fullName,
      );
    const result = await apiRequest<RegistrationDto>(
      "/ClassRegistration/register",
      { method: "POST", body: JSON.stringify({ sessionId }) },
    );
    return mapRegistration(result);
  },

  async registerAtCounter(
    sessionId: string,
    memberId: string,
    actor: MembershipActor,
  ): Promise<ClassRegistration> {
    if (runsOnMockData())
      return classMockServer.register(
        sessionId,
        memberId,
        "RECEPTIONIST",
        actor.fullName,
      );
    const result = await apiRequest<RegistrationDto>(
      "/ClassRegistration/counter-register",
      {
        method: "POST",
        body: JSON.stringify({ sessionId, memberAccountId: memberId }),
      },
    );
    return mapRegistration(result);
  },

  /** Thành viên tự hủy; server kiểm tra đăng ký có thuộc về người gọi. */
  async cancelMyRegistration(
    registrationId: string,
    reason: string,
    actor: MembershipActor,
    channel: RegistrationChannel = "MEMBER",
  ): Promise<ClassRegistration> {
    if (runsOnMockData())
      return classMockServer.cancelRegistration(
        registrationId,
        reason,
        actor.fullName,
        channel === "RECEPTIONIST",
      );
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
    actor: MembershipActor,
  ): Promise<ClassRegistration> {
    if (runsOnMockData())
      return classMockServer.cancelRegistration(
        registrationId,
        reason,
        actor.fullName,
        true,
      );
    const result = await apiRequest<RegistrationDto>(
      `/ClassRegistration/${registrationId}/counter-cancel`,
      { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
    );
    return mapRegistration(result);
  },

  /** Roster một buổi, dùng khi hiển thị ai sẽ bị ảnh hưởng nếu đổi/hủy lịch. */
  async listSessionRegistrations(
    sessionId: string,
  ): Promise<ClassRegistration[]> {
    if (runsOnMockData())
      return classMockServer.listRegistrations({
        sessionId,
        includeCanceled: true,
      });
    const items = await listAllPages<RegistrationDto>(
      `/ClassSession/${sessionId}/registrations`,
    );
    return items.map(mapRegistration);
  },

  /**
   * Tìm thành viên cho màn hình quầy. Dùng lại API Member của Sprint 1 khi có
   * backend, nên không phát sinh endpoint mới cho UC29.
   */
  async searchMembers(query: string): Promise<SessionMemberOption[]> {
    if (runsOnMockData()) return classMockServer.searchMembers(query);
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
