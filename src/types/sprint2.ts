export type PageResult<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };
export type SportItem = { id: number; name: string; description: string | null; isActive: boolean };
export type SportInput = { name: string; description: string };
/**
 * Bốn loại sự kiện backend sinh thông báo cho Member/Coach (UC31). FE không
 * tự thêm loại mới: `notificationTypeLabels` chỉ dịch những gì server gửi và
 * có fallback cho mã lạ.
 */
export type ClassNotificationType =
  | "CLASS_REGISTERED"
  | "SESSION_RESCHEDULED"
  | "SESSION_COACH_CHANGED"
  | "SESSION_CANCELED";

export const notificationTypeLabels: Record<string, string> = {
  CLASS_REGISTERED: "Đăng ký buổi học",
  SESSION_RESCHEDULED: "Dời lịch buổi học",
  SESSION_COACH_CHANGED: "Đổi huấn luyện viên",
  SESSION_CANCELED: "Hủy buổi học",
};

export type ClassNotification = { id: number; type: string; title: string; body: string; entityType: string; entityId: string; isRead: boolean; createdAt: string };
