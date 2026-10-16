import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, Search, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { auditApi, type AuditEntry } from "../../services/auditApi";
import { formatDate } from "../../utils/format";
import { describeError } from "../../services/apiErrors";
import * as v from "../../utils/validation";
const ACTION_LABELS: Record<string, { label: string; chipClass: string }> = {
  // --- Sprint 1: tài khoản, nhân sự, gói tập, thanh toán ---
  CREATE: { label: "Tạo mới", chipClass: "action-create" },
  UPDATE: { label: "Cập nhật", chipClass: "action-update" },
  UPDATE_STATUS: { label: "Đổi trạng thái", chipClass: "action-update" },
  UPDATE_PROFILE: { label: "Cập nhật hồ sơ", chipClass: "action-profile" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", chipClass: "action-security" },
  ACTIVATE: { label: "Kích hoạt", chipClass: "action-activate" },
  DEACTIVATE: { label: "Vô hiệu hóa", chipClass: "action-deactivate" },
  DELETE: { label: "Xóa", chipClass: "action-delete" },
  CONFIRM_PAYMENT: { label: "Thanh toán", chipClass: "action-payment" },
  REGISTER: { label: "Đăng ký gói", chipClass: "action-create" },
  RENEW: { label: "Gia hạn gói", chipClass: "action-update" },
  LOGIN: { label: "Đăng nhập", chipClass: "action-default" },
  CANCEL: { label: "Hủy yêu cầu", chipClass: "action-cancel" },

  // --- Sprint 2 / Flow 2: bộ môn, phòng, lớp, lịch và đăng ký buổi học ---
  // Backend ghi các hành động này qua StageAuditLogAsync; thiếu nhãn thì bảng
  // chỉ hiện mã thô và quản lý không đọc được nhật ký thay đổi lịch.
  SPORT_CREATED: { label: "Tạo bộ môn", chipClass: "action-create" },
  SPORT_UPDATED: { label: "Sửa bộ môn", chipClass: "action-update" },
  SPORT_STATUS_CHANGED: {
    label: "Đổi trạng thái bộ môn",
    chipClass: "action-update",
  },
  ROOM_CREATED: { label: "Tạo phòng tập", chipClass: "action-create" },
  ROOM_UPDATED: { label: "Sửa phòng tập", chipClass: "action-update" },
  ROOM_STATUS_CHANGED: {
    label: "Đổi trạng thái phòng",
    chipClass: "action-update",
  },
  CLASS_CREATED: { label: "Tạo lớp học", chipClass: "action-create" },
  CLASS_UPDATED: { label: "Sửa lớp học", chipClass: "action-update" },
  CLASS_STATUS_CHANGED: {
    label: "Đổi trạng thái lớp",
    chipClass: "action-update",
  },
  CLASS_SESSIONS_CANCELED: {
    label: "Hủy các buổi tương lai",
    chipClass: "action-cancel",
  },
  SESSION_CREATED: { label: "Tạo buổi học", chipClass: "action-create" },
  SESSION_UPDATED: { label: "Sửa buổi học", chipClass: "action-update" },
  SESSION_RESCHEDULED: { label: "Dời lịch buổi học", chipClass: "action-update" },
  SESSION_COACH_CHANGED: { label: "Đổi huấn luyện viên", chipClass: "action-update" },
  SESSION_CANCELED: { label: "Hủy buổi học", chipClass: "action-cancel" },
  CLASS_REGISTERED: { label: "Đăng ký buổi học", chipClass: "action-create" },
  CLASS_REGISTRATION_CANCELED: {
    label: "Hủy đăng ký buổi học",
    chipClass: "action-cancel",
  },
  PACKAGE_SPORTS_UPDATED: {
    label: "Sửa quyền bộ môn của gói",
    chipClass: "action-update",
  },
};

/** Nhóm chọn cho ô "Loại thao tác", theo đúng mã backend ghi vào audit. */
const ACTION_GROUPS: readonly { title: string; actions: readonly string[] }[] = [
  {
    title: "Lớp học và lịch (Sprint 2)",
    actions: [
      "CLASS_CREATED",
      "CLASS_UPDATED",
      "CLASS_STATUS_CHANGED",
      "CLASS_SESSIONS_CANCELED",
      "SESSION_CREATED",
      "SESSION_UPDATED",
      "SESSION_RESCHEDULED",
      "SESSION_COACH_CHANGED",
      "SESSION_CANCELED",
      "CLASS_REGISTERED",
      "CLASS_REGISTRATION_CANCELED",
    ],
  },
  {
    title: "Danh mục và quyền lợi",
    actions: [
      "SPORT_CREATED",
      "SPORT_UPDATED",
      "SPORT_STATUS_CHANGED",
      "ROOM_CREATED",
      "ROOM_UPDATED",
      "ROOM_STATUS_CHANGED",
      "PACKAGE_SPORTS_UPDATED",
    ],
  },
  {
    title: "Tài khoản và gói tập",
    actions: [
      "CREATE",
      "UPDATE",
      "UPDATE_STATUS",
      "UPDATE_PROFILE",
      "CHANGE_PASSWORD",
      "ACTIVATE",
      "DEACTIVATE",
      "CONFIRM_PAYMENT",
      "REGISTER",
      "RENEW",
      "CANCEL",
      "DELETE",
    ],
  },
];

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
  Class: "Lớp học",
  CLASS: "Lớp học",
  ClassSession: "Buổi học",
  CLASS_SESSION: "Buổi học",
  ClassRegistration: "Đăng ký buổi học",
  CLASS_REGISTRATION: "Đăng ký buổi học",
  Sport: "Bộ môn",
  SPORT: "Bộ môn",
  Discipline: "Bộ môn",
  DISCIPLINE: "Bộ môn",
  Room: "Phòng tập",
  ROOM: "Phòng tập",
};

export function AuditLogPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [actorId, setActorId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!currentUser) return;

    const dateError = v.dateRange(from)(to);
    if (dateError) {
      setItems([]);
      return;
    }

    try {
      const data = await auditApi.list({ query, action, from, to, classId, sessionId, actorId, entityType, page, pageSize: 50 });
      setItems(data);
      setError("");
    } catch (err) {
      setError(
        describeError(err),
      );
    }
  }, [currentUser, query, action, from, to, classId, sessionId, actorId, entityType, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearFilters = () => {
    setClassId(""); setSessionId(""); setActorId(""); setEntityType(""); setPage(1);
    setQuery("");
    setAction("");
    setFrom("");
    setTo("");
  };

  const hasActiveFilters = Boolean(query || action || from || to || classId || sessionId || actorId || entityType);
  const dateError = v.dateRange(from)(to);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Lịch sử thao tác hệ thống</h1>
          <p>
            Theo dõi, tra cứu toàn bộ các thay đổi quan trọng về thành viên,
            nhân sự, gói tập và thanh toán.
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
          <label className="field">ID lớp<input type="number" min="1" value={classId} onChange={e => {setClassId(e.target.value);setPage(1);}} /></label>
          <label className="field">ID buổi<input type="number" min="1" value={sessionId} onChange={e => {setSessionId(e.target.value);setPage(1);}} /></label>
          <label className="field">ID người thao tác<input value={actorId} onChange={e => {setActorId(e.target.value);setPage(1);}} /></label>
          <label className="field">Loại đối tượng<input value={entityType} placeholder="Class, ClassSession…" onChange={e => {setEntityType(e.target.value);setPage(1);}} /></label>
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
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả thao tác</option>
            {ACTION_GROUPS.map((group) => (
              <optgroup key={group.title} label={group.title}>
                {group.actions.map((code) => (
                  <option key={code} value={code}>
                    {ACTION_LABELS[code]?.label ?? code}
                  </option>
                ))}
              </optgroup>
            ))}
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
              aria-invalid={Boolean(dateError)}
              onChange={(e) => setTo(e.target.value)}
            />
            {dateError && <small className="field-error">{dateError}</small>}
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
                        <span
                          className={`audit-action-chip ${actionMeta.chipClass}`}
                        >
                          {actionMeta.label}
                        </span>
                      </td>

                      <td>
                        <span className="audit-entity-badge">{entityName}</span>
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
        <div className="table-footer"><button className="button secondary" disabled={page <= 1} onClick={() => setPage(page-1)}>Trước</button><span>Trang {page}</span><button className="button secondary" disabled={items.length < 50} onClick={() => setPage(page+1)}>Sau</button></div>
      </section>
    </>
  );
}
