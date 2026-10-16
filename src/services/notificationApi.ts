import { apiRequest, isApiConfigured } from "./apiClient";
import type {
  ClassNotification,
  NotificationFilter,
  NotificationPage,
} from "../types/notification";

type NotificationDto = {
  id: number | string;
  type?: string;
  title?: string | null;
  body?: string | null;
  entityType?: string | null;
  entityId?: number | string | null;
  isRead?: boolean;
  createdAt?: string;
};

type PagedDto<T> = {
  items: T[];
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
};

const runsOnMockData = (): boolean => !isApiConfigured();

export const isNotificationApiMocked = (): boolean => runsOnMockData();

let mockItems: ClassNotification[] | null = null;

const getMockItems = (): ClassNotification[] => {
  if (mockItems) return mockItems;
  const hoursAgo = (hours: number): string =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  mockItems = [
    {
      id: "notification-1",
      type: "SESSION_RESCHEDULED",
      title: "Buổi Boxing trung cấp đã đổi lịch",
      body: "Buổi học ngày 14/10 chuyển sang 18:30 – 20:00 tại Studio B.",
      entityType: "ClassSession",
      entityId: "session-boxing-1",
      isRead: false,
      createdAt: hoursAgo(2),
    },
    {
      id: "notification-2",
      type: "SESSION_COACH_CHANGED",
      title: "Thay đổi huấn luyện viên",
      body: "Huấn luyện viên Trần Thu Hà sẽ phụ trách buổi Yoga ngày 15/10.",
      entityType: "ClassSession",
      entityId: "session-yoga-3",
      isRead: false,
      createdAt: hoursAgo(7),
    },
    {
      id: "notification-3",
      type: "SESSION_CANCELED",
      title: "Buổi Bơi lội thiếu nhi đã bị hủy",
      body: "Buổi học ngày 18/10 bị hủy do bảo trì hệ thống lọc nước.",
      entityType: "ClassSession",
      entityId: "session-swim-2",
      isRead: true,
      createdAt: hoursAgo(28),
    },
    {
      id: "notification-4",
      type: "CLASS_REGISTERED",
      title: "Đăng ký lớp thành công",
      body: "Bạn đã giữ chỗ buổi Boxing trung cấp ngày 14/10.",
      entityType: "ClassRegistration",
      entityId: "registration-demo-1",
      isRead: true,
      createdAt: hoursAgo(50),
    },
  ];
  return mockItems;
};

export const mapNotification = (dto: NotificationDto): ClassNotification => ({
  id: String(dto.id),
  type: dto.type ?? "UNKNOWN",
  title: dto.title?.trim() || "Cập nhật lớp học",
  body: dto.body?.trim() || "Lịch học của bạn vừa có thay đổi.",
  entityType: dto.entityType ?? "",
  entityId:
    dto.entityId === null || dto.entityId === undefined
      ? ""
      : String(dto.entityId),
  isRead: dto.isRead ?? false,
  createdAt: dto.createdAt ?? "",
});

export const notificationApi = {
  async list(filters: NotificationFilter = {}): Promise<NotificationPage> {
    if (runsOnMockData()) {
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = Math.max(1, filters.pageSize ?? 20);
      const filtered = getMockItems().filter(
        (item) => filters.isRead === undefined || item.isRead === filters.isRead,
      );
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        totalItems: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
    const query = new URLSearchParams({
      page: String(filters.page ?? 1),
      pageSize: String(filters.pageSize ?? 20),
    });
    if (filters.isRead !== undefined)
      query.set("isRead", String(filters.isRead));
    const result = await apiRequest<PagedDto<NotificationDto>>(
      `/Notification/me?${query.toString()}`,
    );
    const items = result.items.map(mapNotification);
    return {
      items,
      page: result.page ?? filters.page ?? 1,
      pageSize: result.pageSize ?? filters.pageSize ?? 20,
      totalItems: result.totalItems ?? items.length,
      totalPages: result.totalPages ?? 1,
    };
  },

  async markRead(id: string): Promise<ClassNotification> {
    if (runsOnMockData()) {
      const item = getMockItems().find((entry) => entry.id === id);
      if (!item) throw new Error("Không tìm thấy thông báo.");
      item.isRead = true;
      return { ...item };
    }
    const result = await apiRequest<NotificationDto>(`/Notification/${id}/read`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });
    return mapNotification(result);
  },
};
