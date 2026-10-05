import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Edit2,
  Mail,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import * as v from "../../utils/validation";
import { Dialog } from "../../components/common/Dialog";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import {
  personnelApi,
  type PersonnelInput,
  type PersonnelRole,
} from "../../services/personnelApi";
import type { User } from "../../types/auth";

type Person = Omit<User, "passwordHash">;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SortKey = "fullName" | "status";
type SortDirection = "asc" | "desc";

const blankInput: PersonnelInput = {
  fullName: "",
  phone: "",
  specialization: "",
  workSchedule: "",
  isActive: true,
};

const isActive = (person: Person): boolean => person.isActive !== false;

interface SortButtonProps {
  label: string;
  sorted: boolean;
  direction: SortDirection;
  onToggle: () => void;
}

/** Declared at module scope so it is not recreated on every parent render. */
function SortButton({ label, sorted, direction, onToggle }: SortButtonProps) {
  const Icon = !sorted
    ? ChevronsUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <button
      type="button"
      className={`th-sort ${sorted ? "is-sorted" : ""}`}
      onClick={onToggle}
    >
      {label}
      <Icon size={13} aria-hidden="true" />
    </button>
  );
}

export function PersonnelPage({ role }: { role: PersonnelRole }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [confirming, setConfirming] = useState<Person | null>(null);
  const [form, setForm] = useState<PersonnelInput>(blankInput);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [error, setError] = useState("");
  const [credential, setCredential] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<v.FieldErrors>({});

  const isCoach = role === "COACH";
  const title = isCoach ? "Huấn luyện viên" : "Nhân viên lễ tân";
  const lowerTitle = title.toLowerCase();

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const data = await personnelApi.list(role, searchQuery, statusFilter);
      setItems(data);
      setError("");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [currentUser, role, searchQuery, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenEdit = (item: Person | "new") => {
    setEditing(item);
    setError("");
    setFieldErrors({});
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
        isActive: isActive(item),
      });
    }
  };

  const handleToggleActive = async (item: Person) => {
    if (!currentUser) return;
    const nextActive = !isActive(item);
    const actionLabel = nextActive ? "kích hoạt" : "vô hiệu hóa";
    try {
      await personnelApi.setActive(role, item.id, nextActive);
      setConfirming(null);
      toast.success(`Đã ${actionLabel} tài khoản của ${item.fullName}.`);
      void refresh();
    } catch (err) {
      setConfirming(null);
      toast.error(describeError(err));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setError("");

    // Client-side first so the user is not charged a round-trip for a typo;
    // the server stays the authority and its field errors are merged below.
    const errors = v.validateForm(
      {
        fullName: form.fullName,
        email,
        username,
        phone: form.phone,
        specialization: form.specialization,
        workSchedule: form.workSchedule,
      },
      {
        fullName: v.fullName,
        phone: v.phone,
        specialization: v.text("Chuyên môn", 200),
        workSchedule: v.text("Lịch làm việc / Ca làm việc", 300),
        ...(editing === "new" ? { email: v.email, username: v.username } : {}),
      },
    );
    if (v.hasErrors(errors)) {
      setFieldErrors(errors);
      setError(v.firstError(errors) ?? "");
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      if (editing === "new") {
        const result = await personnelApi.create(role, email, form);
        setCredential(
          `Tài khoản: ${result.user.email}\nMật khẩu khởi tạo: ${result.initialPassword}`,
        );
        toast.success(`Đã tạo hồ sơ cho ${result.user.fullName}.`);
      } else if (editing) {
        const hasProfileChanges =
          form.fullName.trim() !== editing.fullName.trim() ||
          form.phone.trim() !== (editing.phone ?? "").trim() ||
          (isCoach &&
            (form.specialization ?? "").trim() !==
              (editing.specialization ?? "").trim()) ||
          (form.workSchedule ?? "").trim() !==
            (editing.workSchedule ?? "").trim();
        if (hasProfileChanges) {
          await personnelApi.update(role, editing.id, form);
        }
        toast.success(`Đã cập nhật hồ sơ cho ${form.fullName}.`);
      }
      setEditing(null);
      void refresh();
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = items.filter(isActive).length;
  const hasFilters = searchQuery.trim() !== "" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch =
        !query ||
        item.fullName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.phone && item.phone.includes(query)) ||
        (item.specialization &&
          item.specialization.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && isActive(item)) ||
        (statusFilter === "INACTIVE" && !isActive(item));

      return matchesSearch && matchesStatus;
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "status") {
        return (Number(isActive(b)) - Number(isActive(a))) * direction;
      }
      // Vietnamese collation so diacritics sort the way a reader expects.
      return a.fullName.localeCompare(b.fullName, "vi") * direction;
    });
  }, [items, searchQuery, statusFilter, sortKey, sortDirection]);

  const sortState = (column: SortKey) =>
    sortKey === column
      ? sortDirection === "asc"
        ? "ascending"
        : "descending"
      : "none";

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Quản lý {lowerTitle}</h1>
          <p>
            {isCoach
              ? "Theo dõi chuyên môn giảng dạy, thông tin liên lạc và lịch làm việc của từng huấn luyện viên."
              : "Quản lý hồ sơ nhân viên lễ tân trực quầy, ca làm việc và phân công nhiệm vụ."}
          </p>
        </div>
        <div className="page-actions">
          <button
            className="button primary"
            onClick={() => handleOpenEdit("new")}
          >
            <Plus size={18} aria-hidden="true" /> Thêm {lowerTitle}
          </button>
        </div>
      </div>

      {/* The summary doubles as a filter: on a wide screen clicking a card is
          faster than reaching for the select in the toolbar. */}
      <div className="stats-grid">
        <button
          type="button"
          className={`stat-card stat-card-button ${statusFilter === "ALL" ? "is-selected" : ""}`}
          onClick={() => setStatusFilter("ALL")}
          aria-pressed={statusFilter === "ALL"}
        >
          <span className="stat-icon">
            <UsersRound size={20} aria-hidden="true" />
          </span>
          <div>
            <p>Tổng số hồ sơ</p>
            <strong>{items.length.toString().padStart(2, "0")}</strong>
            <small>Toàn bộ {lowerTitle} của trung tâm</small>
          </div>
        </button>
        <button
          type="button"
          className={`stat-card stat-card-button ${statusFilter === "ACTIVE" ? "is-selected" : ""}`}
          onClick={() => setStatusFilter("ACTIVE")}
          aria-pressed={statusFilter === "ACTIVE"}
        >
          <span className="stat-icon">
            <UserCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <p>Đang hoạt động</p>
            <strong>{activeCount.toString().padStart(2, "0")}</strong>
            <small>Có thể đăng nhập và nhận phân công</small>
          </div>
        </button>
        <button
          type="button"
          className={`stat-card stat-card-button ${statusFilter === "INACTIVE" ? "is-selected" : ""}`}
          onClick={() => setStatusFilter("INACTIVE")}
          aria-pressed={statusFilter === "INACTIVE"}
        >
          <span className="stat-icon">
            <UserMinus size={20} aria-hidden="true" />
          </span>
          <div>
            <p>Ngừng hoạt động</p>
            <strong>
              {(items.length - activeCount).toString().padStart(2, "0")}
            </strong>
            <small>Giữ lại hồ sơ và lịch sử</small>
          </div>
        </button>
      </div>

      <section className="panel" aria-labelledby="personnel-list-title">
        <div className="panel-heading">
          <div>
            <h2 id="personnel-list-title">Danh sách {lowerTitle}</h2>
            <p>
              Hiển thị {visibleItems.length} trên tổng số {items.length} hồ sơ
            </p>
          </div>
          <button className="button secondary" onClick={refresh}>
            <RefreshCw size={16} aria-hidden="true" /> Làm mới
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              placeholder={`Tìm theo tên, email, số điện thoại${isCoach ? ", chuyên môn" : ""}...`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {error && (
          <div className="feedback error" role="alert">
            {error}
            <button
              type="button"
              className="button secondary"
              onClick={refresh}
            >
              Thử lại
            </button>
          </div>
        )}

        {isLoading && !hasLoaded ? (
          <div className="table-loading" role="status">
            <RefreshCw size={18} aria-hidden="true" className="spin" />
            Đang tải danh sách {lowerTitle}...
          </div>
        ) : visibleItems.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table data-table-fixed">
              {/* Fixed layout: the column widths are declared here instead of
                  being inferred from the longest cell, so a long schedule or
                  email truncates instead of widening the table. */}
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "7rem" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" aria-sort={sortState("fullName")}>
                    <SortButton
                      label="Họ tên & Định danh"
                      sorted={sortKey === "fullName"}
                      direction={sortDirection}
                      onToggle={() => toggleSort("fullName")}
                    />
                  </th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">{isCoach ? "Chuyên môn" : "Vai trò"}</th>
                  <th scope="col">Lịch làm việc / Ca làm</th>
                  <th scope="col" aria-sort={sortState("status")}>
                    <SortButton
                      label="Trạng thái"
                      sorted={sortKey === "status"}
                      direction={sortDirection}
                      onToggle={() => toggleSort("status")}
                    />
                  </th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const initials = item.fullName
                    ? item.fullName
                        .trim()
                        .split(/\s+/)
                        .slice(-2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    : "SC";
                  const active = isActive(item);

                  return (
                    <tr key={item.id} className={active ? "" : "row-inactive"}>
                      <td>
                        <div className="member-identity">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt=""
                              className="member-avatar-img"
                            />
                          ) : (
                            <span
                              className="member-initials"
                              aria-hidden="true"
                            >
                              {initials}
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
                            <Mail size={13} aria-hidden="true" />
                            <span title={item.email}>{item.email}</span>
                          </span>
                          <span className="contact-line">
                            <Phone size={13} aria-hidden="true" />
                            <span>{item.phone || "Chưa cập nhật"}</span>
                          </span>
                        </div>
                      </td>

                      <td>
                        {isCoach ? (
                          item.specialization ? (
                            <span className="specialization-tag">
                              <Sparkles size={12} aria-hidden="true" />
                              {item.specialization}
                            </span>
                          ) : (
                            <span className="text-muted">Chưa cập nhật</span>
                          )
                        ) : (
                          <span className="role-chip receptionist">
                            Receptionist
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="schedule-cell">
                          {item.workSchedule ? (
                            <span title={item.workSchedule}>
                              {item.workSchedule}
                            </span>
                          ) : (
                            <span className="text-muted">Chưa cập nhật</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-chip ${active ? "active" : "expired"}`}
                        >
                          {active ? "Đang hoạt động" : "Ngừng hoạt động"}
                        </span>
                      </td>

                      <td>
                        {/* Icon controls keep the pinned action column narrow;
                            each one still carries an accessible name. */}
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => handleOpenEdit(item)}
                            title={`Chỉnh sửa ${item.fullName}`}
                            aria-label={`Chỉnh sửa ${item.fullName}`}
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`icon-button ${active ? "is-danger" : "is-success"}`}
                            onClick={() => setConfirming(item)}
                            title={
                              active
                                ? `Vô hiệu hóa ${item.fullName}`
                                : `Kích hoạt lại ${item.fullName}`
                            }
                            aria-label={
                              active
                                ? `Vô hiệu hóa ${item.fullName}`
                                : `Kích hoạt lại ${item.fullName}`
                            }
                          >
                            <Power size={16} aria-hidden="true" />
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
            <h3>Chưa tìm thấy {lowerTitle} phù hợp</h3>
            <p>
              {hasFilters
                ? "Thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc trạng thái."
                : `Bắt đầu bằng việc thêm ${lowerTitle} đầu tiên cho trung tâm.`}
            </p>
            <button
              className="button secondary"
              onClick={() =>
                hasFilters ? clearFilters() : handleOpenEdit("new")
              }
            >
              {hasFilters ? "Xóa bộ lọc" : `Thêm ${lowerTitle}`}
            </button>
          </div>
        )}
      </section>

      {confirming && (
        <ConfirmDialog
          title={
            isActive(confirming)
              ? `Vô hiệu hóa ${lowerTitle}?`
              : `Kích hoạt lại ${lowerTitle}?`
          }
          description={
            isActive(confirming)
              ? `${confirming.fullName} sẽ không đăng nhập được và không nhận phân công mới. Hồ sơ và lịch sử vẫn được giữ lại.`
              : `${confirming.fullName} sẽ đăng nhập lại được và có thể nhận phân công mới.`
          }
          confirmLabel={isActive(confirming) ? "Vô hiệu hóa" : "Kích hoạt"}
          destructive={isActive(confirming)}
          onConfirm={() => handleToggleActive(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}

      {editing && (
        <Dialog
          title={
            editing === "new"
              ? `Thêm ${lowerTitle} mới`
              : `Cập nhật thông tin ${lowerTitle}`
          }
          onClose={() => setEditing(null)}
        >
          <form
            className="reception-form"
            onSubmit={handleSubmit}
            /* The browser's own constraint validation fires before our handler
               and shows an English bubble ("Please include an '@'..."), so it
               is turned off and utils/validation is the single source of truth. */
            noValidate
          >
            {error && (
              <div className="feedback error" role="alert">
                {error}
              </div>
            )}
            <div className="field-grid">
              <label className="field field-full">
                <span>Họ và tên đầy đủ *</span>
                <input
                  maxLength={80}
                  value={form.fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  placeholder={`Nhập họ tên ${lowerTitle}`}
                />
                {fieldErrors.fullName && (
                  <small className="field-error">{fieldErrors.fullName}</small>
                )}
              </label>

              {editing === "new" ? (
                <>
                  <label className="field">
                    <span>Email liên hệ & đăng nhập *</span>
                    <input
                      type="email"
                      value={email}
                      aria-invalid={Boolean(fieldErrors.email)}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email@sportscenter.com"
                    />
                    {fieldErrors.email && (
                      <small className="field-error">{fieldErrors.email}</small>
                    )}
                  </label>
                  <label className="field">
                    <span>Tên đăng nhập *</span>
                    <input
                      value={username}
                      aria-invalid={Boolean(fieldErrors.username)}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="VD: coach_nguyen"
                    />
                    {fieldErrors.username && (
                      <small className="field-error">
                        {fieldErrors.username}
                      </small>
                    )}
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
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="0xxxxxxxxx"
                />
                {fieldErrors.phone ? (
                  <small className="field-error">{fieldErrors.phone}</small>
                ) : (
                  <small>10 chữ số, bắt đầu bằng số 0</small>
                )}
              </label>

              {isCoach && (
                <label className="field field-full">
                  <span>Chuyên môn & Bộ môn huấn luyện</span>
                  <input
                    maxLength={200}
                    value={form.specialization}
                    aria-invalid={Boolean(fieldErrors.specialization)}
                    onChange={(event) =>
                      setForm({ ...form, specialization: event.target.value })
                    }
                    placeholder="Ví dụ: Gym, Fitness, Yoga, Bơi lội, Pilates..."
                  />

                  {fieldErrors.specialization ? (
                    <small className="field-error">
                      {fieldErrors.specialization}
                    </small>
                  ) : (
                    <small>Các bộ môn chính HLV phụ trách giảng dạy</small>
                  )}
                </label>
              )}

              <label className="field field-full">
                <span>Lịch làm việc / Ca làm việc</span>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={form.workSchedule}
                  aria-invalid={Boolean(fieldErrors.workSchedule)}
                  onChange={(event) =>
                    setForm({ ...form, workSchedule: event.target.value })
                  }
                  placeholder="Ví dụ: Ca sáng: Thứ 2 - Thứ 7 (06:00 - 14:00)..."
                />

                {fieldErrors.workSchedule && (
                  <small className="field-error">
                    {fieldErrors.workSchedule}
                  </small>
                )}
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

      {credential && (
        <Dialog
          title="Thông tin tài khoản khởi tạo"
          onClose={() => setCredential(null)}
        >
          <div className="credential-notice-box">
            <ShieldCheck
              size={22}
              className="text-success"
              aria-hidden="true"
            />
            <div>
              <strong>Tài khoản đã được tạo thành công</strong>
              <p>
                Hãy lưu lại hoặc bàn giao thông tin đăng nhập bên dưới cho nhân
                viên:
              </p>
            </div>
          </div>
          <pre className="initial-password reception-preserve-text">
            {credential}
          </pre>
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
