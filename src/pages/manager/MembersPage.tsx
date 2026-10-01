import { useCallback, useEffect, useState } from "react";
import { Search, Users, Plus, RefreshCw, ArrowUpRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import { ApiError } from "../../services/apiClient";
import { memberApi, type CreateMemberInput } from "../../services/memberApi";
import { membershipApi, subscriptionFromInvoice } from "../../services/membershipApi";
import { getMembershipStatusSummary } from "../../services/membershipService";
import type { MembershipActor } from "../../types/membership";
import { formatDate } from "../../utils/format";
import { membershipStatusLabels } from "../../utils/membershipLabels";

const blank: CreateMemberInput & { isActive: boolean } = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  isActive: true,
};
export function MembersPage() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: MembershipActor[]; total: number; page: number; pages: number }>({
    items: [],
    total: 0,
    page: 1,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<MembershipActor | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [removing, setRemoving] = useState<MembershipActor | null>(null);
  // Set when the API refuses a hard delete because the member has membership
  // history; the dialog then offers deactivation instead.
  const [mustDeactivate, setMustDeactivate] = useState(false);
  const [detail, setDetail] = useState<MembershipActor | null>(null);
  const [password, setPassword] = useState<{
    email: string;
    value: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [summary, setSummary] = useState<ReturnType<
    typeof getMembershipStatusSummary
  > | null>(null);
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const result = await memberApi.listMembers(page, 20, query, status);
      setData(result);
      setError("");
    } catch (err) {
      setData({ items: [], total: 0, page: 1, pages: 1 });
      setError(
        err instanceof Error ? err.message : "Không thể tải thành viên.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, query, status, page]);
  useEffect(() => {
    // Synchronize with list controls and changes in other tabs.
    void refresh();
    const handleSync = () => { void refresh(); };
    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [refresh]);
  function edit(member: MembershipActor | "new") {
    setEditing(member);
    setFormError("");
    setForm(
      member === "new"
        ? blank
        : {
            fullName: member.fullName,
            email: member.email,
            phone: member.phone ?? "",
            dateOfBirth: member.dateOfBirth ?? "",
            isActive: member.isActive !== false,
          },
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Thành viên trung tâm</h1>
          <p>Mỗi hồ sơ, một hành trình tập luyện. Tra cứu và hỗ trợ thành viên tại đây.</p>
        </div>
        <div className="page-actions">
          <button className="button primary" onClick={() => edit("new")}>
            <Plus size={18} aria-hidden="true" /> Thêm thành viên
          </button>
        </div>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel" aria-labelledby="member-list-title">
        <div className="panel-heading">
          <div>
            <h2 id="member-list-title">Danh sách thành viên</h2>
            <p>{data.total} kết quả · Tối đa 20 hồ sơ mỗi trang</p>
          </div>
          <div className="counter-actions">
            <button className="button secondary" onClick={refresh}>
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm thành viên"
              placeholder="Tìm tên, email, số điện thoại..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Trạng thái thành viên"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
        {loading ? (
          <div className="empty-state" role="status">
            Đang tải...
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Thành viên</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Ngày sinh</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-identity">
                        <span className="member-initials" aria-hidden="true">
                          {member.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("")}
                        </span>
                        <div><strong>{member.fullName}</strong><small>{member.id}</small></div>
                      </div>
                    </td>
                    <td>
                      {member.email}
                      <small>{member.phone || "Chưa cập nhật"}</small>
                    </td>
                    <td>
                      {member.dateOfBirth
                        ? formatDate(member.dateOfBirth)
                        : "Chưa cập nhật"}
                    </td>
                    <td>
                      <span
                        className={`status-chip ${member.isActive === false ? "expired" : "active"}`}
                      >
                        {member.isActive === false
                          ? "Ngừng hoạt động"
                          : "Đang hoạt động"}
                      </span>
                      {member.isLocked && <small>Đăng nhập bị khóa</small>}
                    </td>
                    <td>
                      <div className="counter-actions">
                        <button
                          className="text-button"
                          aria-label={`Xem hồ sơ ${member.fullName}`}
                          onClick={async () => {
                            if (!currentUser) return;
                            try {
                              const subscriptions = (await membershipApi.listInvoices({ memberId: member.id }))
                                .map(subscriptionFromInvoice);
                              setSummary(
                                getMembershipStatusSummary(subscriptions),
                              );
                              setDetail(member);
                            } catch (err) {
                              setError((err as Error).message);
                            }
                          }}
                        >
                          Chi tiết <ArrowUpRight size={14} aria-hidden="true" />
                        </button>
                        <button
                          className="text-button"
                          aria-label={`Chỉnh sửa ${member.fullName}`}
                          onClick={() => edit(member)}
                        >
                          Sửa
                        </button>
                        <button
                          className="text-button"
                          aria-label={`Xóa ${member.fullName}`}
                          onClick={() => {
                            setRemoving(member);
                            setMustDeactivate(false);
                            setFormError("");
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !data.items.length && !error && (
          <div className="empty-state">
            <Users size={32} aria-hidden="true" />
            <h3>{query || status !== "ALL" ? "Không tìm thấy thành viên" : "Chưa có thành viên"}</h3>
            <p>{query || status !== "ALL" ? "Thử tên, email khác hoặc xóa bộ lọc để xem tất cả hồ sơ." : "Thêm hồ sơ đầu tiên để bắt đầu quản lý thành viên trung tâm."}</p>
            <button className="button secondary" onClick={() => {
              if (query || status !== "ALL") { setQuery(""); setStatus("ALL"); setPage(1); }
              else edit("new");
            }}>
              {query || status !== "ALL" ? "Xóa bộ lọc" : "Thêm thành viên"}
            </button>
          </div>
        )}
        <div className="table-footer">
          <span>
            Trang {data.page} / {data.pages}
          </span>
          <div className="counter-actions">
            <button
              className="button secondary"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Trang trước
            </button>
            <button
              className="button secondary"
              disabled={data.page >= data.pages}
              onClick={() => setPage(data.page + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </section>
      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm thành viên" : "Cập nhật thành viên"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            className="reception-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentUser || busy) return;
              setBusy(true);
              setFormError("");
              try {
                if (editing === "new") {
                  const initialPassword = "Test@12345";
                  await memberApi.createMember(form, initialPassword);
                  setPassword({
                    email: form.email,
                    value: initialPassword,
                  });
                } else {
                  const hasProfileChanges =
                    form.fullName.trim() !== editing.fullName.trim() ||
                    form.phone.trim() !== (editing.phone ?? "").trim() ||
                    form.dateOfBirth !== (editing.dateOfBirth ?? "");
                  if (hasProfileChanges) {
                    await memberApi.updateMember(editing.id, form);
                  }
                  if (editing.isActive !== form.isActive) {
                    await memberApi.setMemberStatus(editing.id, form.isActive);
                  }
                }
                setEditing(null);
                setNotice("Đã lưu hồ sơ thành viên.");
                void refresh();
              } catch (err) {
                setFormError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset className="counter-fieldset" disabled={busy}>
              <div className="field-grid">
                {(["fullName", "email", "phone", "dateOfBirth"] as const).map(
                  (field) => (
                    <label className="field" key={field}>
                      <span>
                        {
                          {
                            fullName: "Họ và tên",
                            email: "Email",
                            phone: "Số điện thoại",
                            dateOfBirth: "Ngày sinh",
                          }[field]
                        }{" "}
                        *
                      </span>
                      <input
                        required
                        maxLength={
                          field === "fullName"
                            ? 80
                            : field === "phone"
                              ? 10
                              : 254
                        }
                        type={
                          field === "dateOfBirth"
                            ? "date"
                            : field === "email"
                              ? "email"
                              : field === "phone"
                                ? "tel"
                                : "text"
                        }
                        value={form[field]}
                        onInput={(e) => {
                          const value = e.currentTarget.value;
                          setForm((previous) => ({
                            ...previous,
                            [field]: value,
                          }));
                        }}
                        onChange={(e) =>
                          setForm({ ...form, [field]: e.target.value })
                        }
                      />
                    </label>
                  ),
                )}
                <label className="field">
                  <span>Trạng thái</span>
                  <select
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.value === "true" })
                    }
                  >
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Ngừng hoạt động</option>
                  </select>
                </label>
              </div>
            </fieldset>
            {editing === "new" && (
              <p>Mật khẩu được tạo tự động. Thành viên mới chưa có gói tập.</p>
            )}
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu thành viên"}
            </button>
          </form>
        </Dialog>
      )}
      {removing && (
        <Dialog
          title={mustDeactivate ? "Chuyển sang ngừng hoạt động?" : "Xóa thành viên khỏi hệ thống?"}
          onClose={() => {
            if (busy) return;
            setRemoving(null);
            setMustDeactivate(false);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setRemoving(null);
                  setMustDeactivate(false);
                }}
              >
                Quay lại
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  if (!currentUser || busy) return;
                  setBusy(true);
                  setFormError("");
                  try {
                    if (mustDeactivate) {
                      await memberApi.setMemberStatus(removing.id, false);
                      setNotice(
                        `${removing.fullName} đã chuyển sang ngừng hoạt động. Lịch sử gói tập và hóa đơn được giữ nguyên.`,
                      );
                    } else {
                      await memberApi.deleteMember(removing.id);
                      setNotice(`Đã xóa ${removing.fullName} khỏi hệ thống.`);
                    }
                    setRemoving(null);
                    setMustDeactivate(false);
                    void refresh();
                  } catch (err) {
                    // The member turned out to have membership history, so the
                    // only safe action left is deactivating: switch the dialog
                    // over instead of leaving the manager at a dead end.
                    if (
                      err instanceof ApiError &&
                      err.code === "MEMBER_HAS_MEMBERSHIP_HISTORY"
                    ) {
                      setMustDeactivate(true);
                      setFormError(
                        "Thành viên này đã có gói tập hoặc hóa đơn nên không thể xóa vĩnh viễn. Bấm lần nữa để chuyển sang ngừng hoạt động.",
                      );
                    } else {
                      setFormError((err as Error).message);
                    }
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? "Đang xử lý..."
                  : mustDeactivate
                    ? "Ngừng hoạt động"
                    : "Xác nhận xóa"}
              </button>
            </>
          }
        >
          <p>
            {mustDeactivate ? (
              <>
                <strong>{removing.fullName}</strong> sẽ bị ngừng truy cập. Lịch
                sử gói tập và hóa đơn được giữ nguyên.
              </>
            ) : (
              <>
                <strong>{removing.fullName}</strong> sẽ bị xóa vĩnh viễn khỏi hệ
                thống. Thao tác này không thể hoàn tác. Thành viên đã từng đăng
                ký gói tập sẽ không xóa được — hệ thống sẽ đề nghị ngừng hoạt
                động thay thế.
              </>
            )}
          </p>
          {formError && <p role="alert">{formError}</p>}
        </Dialog>
      )}
      {password && (
        <Dialog
          title="Thông tin đăng nhập mới"
          onClose={() => setPassword(null)}
        >
          <p>{password.email}</p>
          <code className="initial-password">{password.value}</code>
          <p>
            Bàn giao riêng mật khẩu này trước khi đóng. Email chưa được gửi vì
            dịch vụ chưa kết nối.
          </p>
          <button className="button primary" onClick={() => setPassword(null)}>
            Đã bàn giao
          </button>
        </Dialog>
      )}
      {detail && (
        <Dialog title="Hồ sơ thành viên" onClose={() => setDetail(null)}>
          <div className="order-summary">
            <h3>{detail.fullName}</h3>
            <dl>
              <div>
                <dt>Mã thành viên</dt>
                <dd>{detail.id}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{detail.email}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{detail.phone || "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Ngày sinh</dt>
                <dd>
                  {detail.dateOfBirth
                    ? formatDate(detail.dateOfBirth)
                    : "Chưa cập nhật"}
                </dd>
              </div>
              <div>
                <dt>Ngày đăng ký</dt>
                <dd>{formatDate(detail.createdAt)}</dd>
              </div>
              <div>
                <dt>Gói tập</dt>
                <dd>{summary?.subscription?.packageName ?? "Chưa có gói"}</dd>
              </div>
              <div>
                <dt>Trạng thái gói</dt>
                <dd>
                  {summary ? (
                    <span className={`status-chip ${summary.status.toLowerCase()}`}>
                      {membershipStatusLabels[summary.status] ?? summary.status}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Thời hạn sử dụng</dt>
                <dd>
                  {summary?.subscription
                    ? `${formatDate(summary.subscription.startDate)} → ${formatDate(summary.subscription.endDate)}`
                    : "—"}
                </dd>
              </div>
              {summary?.status === "ACTIVE" && (
                <div>
                  <dt>Số ngày còn lại</dt>
                  <dd>{summary.remainingDays} ngày</dd>
                </div>
              )}
              {summary?.upcoming &&
                summary.upcoming !== summary.subscription && (
                  <div>
                    <dt>Kỳ tiếp theo</dt>
                    <dd>
                      {summary.upcoming.packageName} ·{" "}
                      {formatDate(summary.upcoming.startDate)} →{" "}
                      {formatDate(summary.upcoming.endDate)}
                    </dd>
                  </div>
                )}
            </dl>
          </div>
        </Dialog>
      )}
    </>
  );
}
