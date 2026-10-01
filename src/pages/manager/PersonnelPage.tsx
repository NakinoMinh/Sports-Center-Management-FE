import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  UsersRound,
  Search,
  RefreshCw,
  Edit2,
  Power,
  ShieldCheck,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import {
  personnelApi,
  type PersonnelInput,
  type PersonnelRole,
} from "../../services/personnelApi";
import type { User } from "../../types/auth";

const blankInput: PersonnelInput = {
  fullName: "",
  phone: "",
  specialization: "",
  workSchedule: "",
  isActive: true,
};

export function PersonnelPage({ role }: { role: PersonnelRole }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Omit<User, "passwordHash">[]>([]);
  const [editing, setEditing] = useState<Omit<User, "passwordHash"> | "new" | null>(null);
  const [form, setForm] = useState<PersonnelInput>(blankInput);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [credential, setCredential] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCoach = role === "COACH";
  const title = isCoach ? "Huấn luyện viên" : "Nhân viên lễ tân";

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await personnelApi.list(role, searchQuery, statusFilter);
      setItems(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách.");
    }
  }, [currentUser, role, searchQuery, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenEdit = (item: Omit<User, "passwordHash"> | "new") => {
    setEditing(item);
    setError("");
    setNotice("");
    if (item === "new") {
      setEmail("");
      setUsername("");
      setForm(blankInput);
    } else {
      setEmail(item.email);
      setUsername(item.username);
      setForm({
        fullName: item.fullName,
        phone: item.phone ?? "",
        specialization: item.specialization ?? "",
        workSchedule: item.workSchedule ?? "",
        isActive: item.isActive !== false,
      });
    }
  };

  const handleToggleActive = async (item: Omit<User, "passwordHash">) => {
    if (!currentUser) return;
    const targetStatus = item.isActive === false;
    const actionLabel = targetStatus ? "kích hoạt" : "vô hiệu hóa";
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn ${actionLabel} tài khoản của ${item.fullName}?`,
      )
    ) {
      return;
    }

    try {
      await personnelApi.setActive(role, item.id, targetStatus);
      setNotice(`Đã ${actionLabel} tài khoản của ${item.fullName}.`);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại.");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setError("");
    setIsSubmitting(true);
    try {
      if (editing === "new") {
        const result = await personnelApi.create(
          role,
          email,
          form,
        );
        setCredential(
          `Tài khoản: ${result.user.email}\nMật khẩu khởi tạo: ${result.initialPassword}`,
        );
        setNotice(`Đã tạo hồ sơ cho ${result.user.fullName}.`);
      } else if (editing) {
        const hasProfileChanges =
          form.fullName.trim() !== editing.fullName.trim() ||
          form.phone.trim() !== (editing.phone ?? "").trim() ||
          (isCoach && (form.specialization ?? "").trim() !== (editing.specialization ?? "").trim()) ||
          (form.workSchedule ?? "").trim() !== (editing.workSchedule ?? "").trim();
        if (hasProfileChanges) {
          await personnelApi.update(role, editing.id, form);
        }
        setNotice(`Đã cập nhật hồ sơ cho ${form.fullName}.`);
      }
      setEditing(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu hồ sơ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items by search query and active status
  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      (item.specialization && item.specialization.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && item.isActive !== false) ||
      (statusFilter === "INACTIVE" && item.isActive === false);

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Quản lý {title.toLowerCase()}</h1>
          <p>
            {isCoach
              ? "Theo dõi chuyên môn giảng dạy, thông tin liên lạc và lịch làm việc của từng huấn luyện viên."
              : "Quản lý hồ sơ nhân viên lễ tân trực quầy, ca làm việc và phân công nhiệm vụ."}
          </p>
        </div>
        <div className="page-actions">
          <button className="button primary" onClick={() => handleOpenEdit("new")}>
            <Plus size={18} aria-hidden="true" /> Thêm {title.toLowerCase()}
          </button>
        </div>
      </div>

      {notice && (
        <div className="success-notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}

      <section className="panel" aria-labelledby="personnel-list-title">
        <div className="panel-heading">
          <div>
            <h2 id="personnel-list-title">Danh sách {title.toLowerCase()}</h2>
            <p>
              {filteredItems.length} / {items.length} hồ sơ trong hệ thống
            </p>
          </div>
          <div className="counter-actions">
            <button className="button secondary" onClick={refresh}>
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Status Filter */}
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder={`Tìm ${title.toLowerCase()} theo tên, email, SĐT${isCoach ? ", chuyên môn..." : "..."}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>

        {filteredItems.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Họ tên & Định danh</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">{isCoach ? "Chuyên môn" : "Vai trò"}</th>
                  <th scope="col">Lịch làm việc / Ca làm</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const itemInitials = item.fullName
                    ? item.fullName
                        .trim()
                        .split(/\s+/)
                        .slice(-2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    : "SC";

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="member-identity">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.fullName}
                              className="member-avatar-img"
                            />
                          ) : (
                            <span className="member-initials" aria-hidden="true">
                              {itemInitials}
                            </span>
                          )}
                          <div>
                            <strong>{item.fullName}</strong>
                            <small>{item.username}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="cell-contact">
                          <span className="contact-line">
                            <Mail size={13} className="text-muted" />
                            <span>{item.email}</span>
                          </span>
                          <span className="contact-line">
                            <Phone size={13} className="text-muted" />
                            <span>{item.phone || "Chưa cập nhật"}</span>
                          </span>
                        </div>
                      </td>

                      <td>
                        {isCoach ? (
                          item.specialization ? (
                            <span className="specialization-tag">
                              <Sparkles size={12} />
                              {item.specialization}
                            </span>
                          ) : (
                            <span className="text-muted">Chưa cập nhật</span>
                          )
                        ) : (
                          <span className="role-chip receptionist">Receptionist</span>
                        )}
                      </td>

                      <td>
                        <div className="schedule-cell">
                          {item.workSchedule ? (
                            <span>{item.workSchedule}</span>
                          ) : (
                            <span className="text-muted">Chưa cập nhật</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-chip ${item.isActive === false ? "expired" : "active"}`}
                        >
                          {item.isActive === false ? "Ngừng hoạt động" : "Đang hoạt động"}
                        </span>
                      </td>

                      <td>
                        <div className="table-row-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => handleOpenEdit(item)}
                            title={`Chỉnh sửa thông tin ${item.fullName}`}
                          >
                            <Edit2 size={14} /> Sửa
                          </button>
                          <button
                            type="button"
                            className={`text-button ${item.isActive === false ? "text-success" : "text-danger"}`}
                            onClick={() => handleToggleActive(item)}
                            title={
                              item.isActive === false
                                ? "Kích hoạt lại tài khoản"
                                : "Vô hiệu hóa tài khoản"
                            }
                          >
                            <Power size={14} />
                            {item.isActive === false ? "Kích hoạt" : "Vô hiệu hóa"}
                          </button>
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
            <UsersRound size={36} aria-hidden="true" />
            <h3>Chưa tìm thấy {title.toLowerCase()} phù hợp</h3>
            <p>
              {searchQuery || statusFilter !== "ALL"
                ? "Thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc trạng thái."
                : `Bắt đầu bằng việc thêm ${title.toLowerCase()} đầu tiên cho trung tâm.`}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                if (searchQuery || statusFilter !== "ALL") {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                } else {
                  handleOpenEdit("new");
                }
              }}
            >
              {searchQuery || statusFilter !== "ALL" ? "Xóa bộ lọc" : `Thêm ${title.toLowerCase()}`}
            </button>
          </div>
        )}
      </section>

      {/* Edit / Create Dialog */}
      {editing && (
        <Dialog
          title={
            editing === "new"
              ? `Thêm ${title.toLowerCase()} mới`
              : `Cập nhật thông tin ${title.toLowerCase()}`
          }
          onClose={() => setEditing(null)}
        >
          <form className="reception-form" onSubmit={handleSubmit}>
            <div className="field-grid">
              <label className="field field-full">
                <span>Họ và tên đầy đủ *</span>
                <input
                  required
                  maxLength={80}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder={`Nhập họ tên ${title.toLowerCase()}`}
                />
              </label>

              {editing === "new" ? (
                <>
                  <label className="field">
                    <span>Email liên hệ & đăng nhập *</span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@sportscenter.com"
                    />
                  </label>
                  <label className="field">
                    <span>Tên đăng nhập *</span>
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="VD: coach_nguyen"
                    />
                  </label>
                </>
              ) : (
                <label className="field field-full field-disabled">
                  <span>Email (Định danh cố định)</span>
                  <input disabled value={email} />
                  <small>Email không thể thay đổi sau khi tạo tài khoản</small>
                </label>
              )}

              <label className="field field-full">
                <span>Số điện thoại liên hệ *</span>
                <input
                  required
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0xxxxxxxxx"
                />
                <small>10 chữ số, bắt đầu bằng số 0</small>
              </label>

              {isCoach && (
                <label className="field field-full">
                  <span>Chuyên môn & Bộ môn huấn luyện</span>
                  <input
                    maxLength={200}
                    value={form.specialization}
                    onChange={(e) =>
                      setForm({ ...form, specialization: e.target.value })
                    }
                    placeholder="Ví dụ: Gym, Fitness, Yoga, Bơi lội, Pilates..."
                  />
                  <small>Các bộ môn chính HLV phụ trách giảng dạy</small>
                </label>
              )}

              <label className="field field-full">
                <span>Lịch làm việc / Ca làm việc</span>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={form.workSchedule}
                  onChange={(e) =>
                    setForm({ ...form, workSchedule: e.target.value })
                  }
                  placeholder="Ví dụ: Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)..."
                />
              </label>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Credential Delivery Dialog */}
      {credential && (
        <Dialog
          title="Thông tin tài khoản khởi tạo"
          onClose={() => setCredential(null)}
        >
          <div className="credential-notice-box">
            <ShieldCheck size={22} className="text-success" />
            <div>
              <strong>Tài khoản đã được tạo thành công</strong>
              <p>Hãy lưu lại hoặc bàn giao thông tin đăng nhập bên dưới cho nhân viên:</p>
            </div>
          </div>
          <pre className="initial-password reception-preserve-text">{credential}</pre>
          <div className="modal-actions-bar">
            <button
              type="button"
              className="button primary"
              onClick={() => setCredential(null)}
            >
              Đã ghi nhận thông tin
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
