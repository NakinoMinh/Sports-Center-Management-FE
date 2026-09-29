import { useCallback, useEffect, useState } from "react";
import { Search, Users, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import { memberService, type MemberInput } from "../../services/memberService";
import {
  membershipService,
  getMembershipStatusSummary,
} from "../../services/membershipService";
import type { MembershipActor } from "../../types/membership";
import { formatDate } from "../../utils/format";

const blank: MemberInput = {
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
  const [data, setData] = useState<ReturnType<typeof memberService.list>>({
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
  const refresh = useCallback(() => {
    if (!currentUser) return;
    try {
      setData(memberService.list(currentUser, query, status, page));
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
    // Synchronize the local adapter with list controls and changes in other tabs.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
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
          <h1>Danh sách thành viên</h1>
          <p>Quản lý hồ sơ, trạng thái hoạt động và thông tin gói tập.</p>
        </div>
        <span className="page-icon">
          <Users size={26} />
        </span>
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
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{data.total} thành viên</h2>
            <p>20 thành viên mỗi trang</p>
          </div>
          <div className="counter-actions">
            <button className="button secondary" onClick={refresh}>
              <RefreshCw size={16} /> Làm mới
            </button>
            <button className="button primary" onClick={() => edit("new")}>
              <Plus size={17} /> Thêm thành viên
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
                  <th>Thành viên</th>
                  <th>Liên hệ</th>
                  <th>Ngày sinh</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.fullName}</strong>
                      <small>{member.id}</small>
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
                          onClick={() => {
                            if (!currentUser) return;
                            try {
                              setSummary(
                                getMembershipStatusSummary(
                                  membershipService.getMemberSubscriptions(
                                    currentUser,
                                    member.id,
                                  ),
                                ),
                              );
                              setDetail(member);
                            } catch (err) {
                              setError((err as Error).message);
                            }
                          }}
                        >
                          Chi tiết
                        </button>
                        <button
                          className="text-button"
                          onClick={() => edit(member)}
                        >
                          Sửa
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            setRemoving(member);
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
          <div className="empty-state">Không có thành viên phù hợp.</div>
        )}
        <div className="panel-heading">
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
                  const created = await memberService.create(currentUser, form);
                  setPassword({
                    email: created.member.email,
                    value: created.initialPassword,
                  });
                } else memberService.update(currentUser, editing.id, form);
                setEditing(null);
                setNotice("Đã lưu hồ sơ thành viên.");
                refresh();
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
          title="Xóa thành viên khỏi danh sách?"
          onClose={() => setRemoving(null)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setRemoving(null)}
              >
                Quay lại
              </button>
              <button
                className="button danger"
                onClick={() => {
                  if (!currentUser) return;
                  try {
                    memberService.remove(currentUser, removing.id);
                    setRemoving(null);
                    setNotice(
                      "Đã xóa thành viên khỏi danh sách và ngừng quyền truy cập.",
                    );
                    refresh();
                  } catch (err) {
                    setFormError((err as Error).message);
                  }
                }}
              >
                Xác nhận xóa
              </button>
            </>
          }
        >
          <p>
            <strong>{removing.fullName}</strong> sẽ bị ngừng truy cập. Lịch sử
            gói, hóa đơn và điểm danh được giữ nguyên.
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
                <dt>Thời hạn</dt>
                <dd>
                  {summary?.subscription
                    ? formatDate(summary.subscription.endDate)
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </Dialog>
      )}
    </>
  );
}
