import { useCallback, useEffect, useState } from "react";
import {
  History,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { auditApi, type AuditEntry } from "../../services/auditApi";
import { formatDate } from "../../utils/format";

const ACTION_LABELS: Record<string, { label: string; chipClass: string }> = {
  CREATE: { label: "Tạo mới", chipClass: "action-create" },
  UPDATE: { label: "Cập nhật", chipClass: "action-update" },
  UPDATE_PROFILE: { label: "Cập nhật hồ sơ", chipClass: "action-profile" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", chipClass: "action-security" },
  ACTIVATE: { label: "Kích hoạt", chipClass: "action-activate" },
  DEACTIVATE: { label: "Vô hiệu hóa", chipClass: "action-deactivate" },
  DELETE: { label: "Xóa", chipClass: "action-delete" },
  CONFIRM_PAYMENT: { label: "Thanh toán", chipClass: "action-payment" },
  CANCEL: { label: "Hủy yêu cầu", chipClass: "action-cancel" },
};

const ENTITY_LABELS: Record<string, string> = {
  MEMBER: "Thành viên",
  Member: "Thành viên",
  COACH: "Huấn luyện viên",
  Coach: "Huấn luyện viên",
  RECEPTIONIST: "Lễ tân",
  Receptionist: "Lễ tân",
  USER: "Người dùng",
  User: "Người dùng",
  CENTER_MANAGER: "Quản lý",
  CenterManager: "Quản lý",
  MEMBERSHIP_PACKAGE: "Gói tập",
  MembershipPackage: "Gói tập",
  MEMBERSHIP_ORDER: "Đơn gói tập",
  MembershipOrder: "Đơn gói tập",
  INVOICE: "Hóa đơn",
  Invoice: "Hóa đơn",
};

export function AuditLogPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await auditApi.list({ query, action, from, to });
      setItems(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch sử thao tác.",
      );
    }
  }, [currentUser, query, action, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearFilters = () => {
    setQuery("");
    setAction("");
    setFrom("");
    setTo("");
  };

  const hasActiveFilters = Boolean(query || action || from || to);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Lịch sử thao tác hệ thống</h1>
          <p>
            Theo dõi, tra cứu toàn bộ các thay đổi quan trọng về thành viên, nhân sự, gói tập và thanh toán.
          </p>
        </div>
        <span className="page-icon">
          <History size={26} />
        </span>
      </div>

      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}

      <section className="panel" aria-labelledby="audit-log-title">
        <div className="panel-heading">
          <div>
            <h2 id="audit-log-title">Nhật ký kiểm toán (Audit Log)</h2>
            <p>
              Hiển thị {items.length} bản ghi thao tác{" "}
              {hasActiveFilters ? "(theo bộ lọc)" : ""}
            </p>
          </div>
          <div className="counter-actions">
            {hasActiveFilters && (
              <button
                type="button"
                className="button secondary"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              onClick={refresh}
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>

        {/* Toolbar with comprehensive filters */}
        <div className="toolbar audit-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder="Tìm theo người thực hiện, đối tượng, mô tả..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <select
            aria-label="Loại thao tác"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Tất cả thao tác</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="UPDATE_PROFILE">Cập nhật hồ sơ</option>
            <option value="CHANGE_PASSWORD">Đổi mật khẩu</option>
            <option value="ACTIVATE">Kích hoạt</option>
            <option value="DEACTIVATE">Vô hiệu hóa</option>
            <option value="CONFIRM_PAYMENT">Xác nhận thanh toán</option>
            <option value="CANCEL">Hủy yêu cầu</option>
            <option value="DELETE">Xóa dữ liệu</option>
          </select>

          <label className="field toolbar-date-field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>

          <label className="field toolbar-date-field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {/* Table or Empty State */}
        {items.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Thời điểm</th>
                  <th scope="col">Người thao tác</th>
                  <th scope="col">Hành động</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Chi tiết nội dung</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const actionMeta = ACTION_LABELS[item.action] ?? {
                    label: item.action,
                    chipClass: "action-default",
                  };
                  const entityName = ENTITY_LABELS[item.entity] ?? item.entity;
                  const dateObj = new Date(item.createdAt);
                  const timeStr = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "";

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{formatDate(item.createdAt)}</strong>
                        <small className="text-muted">{timeStr}</small>
                      </td>

                      <td>
                        <div className="audit-actor">
                          <User size={13} className="text-muted" />
                          <div>
                            <strong>{item.actorName}</strong>
                            <small className="text-muted">{item.actorId}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`audit-action-chip ${actionMeta.chipClass}`}>
                          {actionMeta.label}
                        </span>
                      </td>

                      <td>
                        <span className="audit-entity-badge">
                          {entityName}
                        </span>
                        {item.entityId && (
                          <small className="text-muted block-id">
                            ID: {item.entityId.slice(0, 16)}
                            {item.entityId.length > 16 ? "..." : ""}
                          </small>
                        )}
                      </td>

                      <td>
                        <div className="audit-desc-cell">
                          <span>{item.description}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <History size={36} aria-hidden="true" />
            <h3>Chưa có bản ghi nhật ký phù hợp</h3>
            <p>
              {hasActiveFilters
                ? "Không tìm thấy thao tác nào khớp với tiêu chí tìm kiếm. Hãy thử bỏ bớt bộ lọc."
                : "Các thao tác quản lý mới sẽ tự động được ghi nhận tại đây."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="button secondary"
                onClick={clearFilters}
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
