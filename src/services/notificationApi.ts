/**
 * Thông báo lớp học (UC31).
 *
 * Không có nhánh dữ liệu mẫu: thông báo cho biết lịch học vừa đổi hay bị
 * hủy, nên một danh sách dựng sẵn trong bộ nhớ còn tệ hơn là danh sách rỗng:
 * người dùng tưởng mình đã nắm được thay đổi trong khi không. Cấu hình sai
 * `VITE_API_BASE_URL` sẽ thành lỗi hiển thị trên màn hình, đúng như các
 * service Flow 2 còn lại.
 */

import { apiRequest } from "./apiClient";
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
    const result = await apiRequest<NotificationDto>(`/Notification/${id}/read`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });
    return mapNotification(result);
  },
};
