import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Check, RefreshCw } from "lucide-react";
import { describeError } from "../services/apiErrors";
import { notificationApi } from "../services/notificationApi";
import type { ClassNotification } from "../types/notification";

type ReadFilter = "ALL" | "UNREAD" | "READ";

const TYPE_LABELS: Record<string, string> = {
  CLASS_REGISTERED: "Đăng ký lớp",
  SESSION_RESCHEDULED: "Đổi lịch học",
  SESSION_COACH_CHANGED: "Đổi huấn luyện viên",
  SESSION_CANCELED: "Hủy buổi học",
};

const formatCreatedAt = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không rõ thời gian"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

export function NotificationsPage() {
  const [items, setItems] = useState<ClassNotification[]>([]);
  const [filter, setFilter] = useState<ReadFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await notificationApi.list({
        pageSize: 100,
        isRead:
          filter === "ALL" ? undefined : filter === "READ",
      });
      setItems(result.items);
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const handleMarkRead = async (item: ClassNotification) => {
    setMarkingId(item.id);
    try {
      const updated = await notificationApi.markRead(item.id);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? updated : entry)),
      );
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setMarkingId("");
    }
  };

  return (
    <div className="long-page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">UC31 · THÔNG BÁO LỚP HỌC</span>
          <h1>Thông báo của tôi</h1>
          <p>
            Theo dõi đăng ký, đổi lịch, đổi huấn luyện viên và các buổi bị hủy.
          </p>
        </div>
        <span className="page-icon">
          <BellRing size={26} aria-hidden="true" />
        </span>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <span>{error}</span>
          <button type="button" className="button secondary" onClick={refresh}>
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="notifications-title">
        <div className="panel-heading">
          <div>
            <h2 id="notifications-title">Cập nhật gần đây</h2>
            <p>{unreadCount} thông báo chưa đọc trong danh sách hiện tại.</p>
          </div>
          <button
            type="button"
            className="button secondary"
            disabled={isLoading}
            onClick={refresh}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Làm mới
          </button>
        </div>

        <div className="toolbar">
          <div className="segmented-control" aria-label="Lọc trạng thái thông báo">
            {(["ALL", "UNREAD", "READ"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "is-active" : ""}
                onClick={() => setFilter(value)}
              >
                {value === "ALL"
                  ? "Tất cả"
                  : value === "UNREAD"
                    ? "Chưa đọc"
                    : "Đã đọc"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state" role="status">
            <p>Đang tải thông báo...</p>
          </div>
        ) : items.length ? (
          <div className="notification-list">
            {items.map((item) => (
              <article
                className={`notification-item ${item.isRead ? "is-read" : "is-unread"}`}
                key={item.id}
              >
                <span className="notification-icon">
                  <Bell size={19} aria-hidden="true" />
                </span>
                <div className="notification-content">
                  <div className="notification-heading">
                    <div>
                      <span className="eyebrow">
                        {TYPE_LABELS[item.type] ?? "Cập nhật lớp học"}
                      </span>
                      <h3>{item.title}</h3>
                    </div>
                    {!item.isRead && <span className="notification-dot">Mới</span>}
                  </div>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>{formatCreatedAt(item.createdAt)}</time>
                </div>
                {!item.isRead && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={markingId === item.id}
                    onClick={() => handleMarkRead(item)}
                  >
                    <Check size={15} aria-hidden="true" />
                    {markingId === item.id ? "Đang lưu..." : "Đã đọc"}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <Bell size={34} aria-hidden="true" />
            <h3>Không có thông báo phù hợp</h3>
            <p>Các thay đổi lớp học liên quan đến bạn sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>
    </div>
  );
}
