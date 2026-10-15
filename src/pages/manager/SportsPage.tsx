import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Dumbbell, Edit3, Plus, Power, RefreshCw, Search } from "lucide-react";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Dialog } from "../../components/common/Dialog";
import { useToast } from "../../hooks/useToast";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { classApi, isClassApiMocked } from "../../services/classApi";
import type { Sport, SportInput } from "../../types/classes";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const EMPTY_FORM: SportInput = { name: "", description: "" };

export function SportsPage() {
  const toast = useToast();
  const [sports, setSports] = useState<Sport[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [editing, setEditing] = useState<Sport | "new" | null>(null);
  const [confirming, setConfirming] = useState<Sport | null>(null);
  const [form, setForm] = useState<SportInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSports(await classApi.listSports());
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const visibleSports = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return sports.filter(
      (sport) =>
        (!keyword ||
          `${sport.name} ${sport.description}`
            .toLocaleLowerCase("vi")
            .includes(keyword)) &&
        (status === "ALL" ||
          (status === "ACTIVE" ? sport.isActive : !sport.isActive)),
    );
  }, [search, sports, status]);

  const openForm = (sport: Sport | "new") => {
    setEditing(sport);
    setFieldErrors({});
    setForm(
      sport === "new"
        ? EMPTY_FORM
        : { name: sport.name, description: sport.description },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên bộ môn.";
    if (form.name.trim().length > 80)
      nextErrors.name = "Tên bộ môn tối đa 80 ký tự.";
    if (form.description.trim().length > 500)
      nextErrors.description = "Mô tả tối đa 500 ký tự.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await classApi.saveSport(
        form,
        editing === "new" ? undefined : editing?.id,
      );
      toast.success(
        editing === "new"
          ? "Đã thêm bộ môn mới."
          : "Đã cập nhật bộ môn.",
      );
      setEditing(null);
      await refresh();
    } catch (caught) {
      setFieldErrors(fieldErrorsOf(caught));
      toast.error(describeError(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (sport: Sport) => {
    try {
      await classApi.setSportActive(sport.id, !sport.isActive);
      toast.success(
        sport.isActive
          ? "Đã ngừng hoạt động bộ môn."
          : "Đã kích hoạt bộ môn.",
      );
      setConfirming(null);
      await refresh();
    } catch (caught) {
      setConfirming(null);
      toast.error(describeError(caught));
    }
  };

  return (
    <div className="long-page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">UC17 · QUẢN LÝ TRUNG TÂM</span>
          <h1>Danh mục bộ môn</h1>
          <p>
            Thêm, chỉnh sửa và ngừng hoạt động bộ môn mà không xóa lịch sử lớp
            học đã tham chiếu.
          </p>
        </div>
        <span className="page-icon">
          <Dumbbell size={26} aria-hidden="true" />
        </span>
      </div>

      {isClassApiMocked() && (
        <p className="info-note">Đang hiển thị dữ liệu mẫu của Flow 2.</p>
      )}

      {error && (
        <div className="feedback error" role="alert">
          <span>{error}</span>
          <button type="button" className="button secondary" onClick={refresh}>
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="sports-title">
        <div className="panel-heading">
          <div>
            <h2 id="sports-title">Bộ môn đang quản lý</h2>
            <p>{visibleSports.length} bộ môn khớp bộ lọc hiện tại.</p>
          </div>
          <button
            type="button"
            className="button primary"
            onClick={() => openForm("new")}
          >
            <Plus size={17} aria-hidden="true" />
            Thêm bộ môn
          </button>
        </div>

        <div className="toolbar">
          <label className="long-search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc mô tả..."
            />
          </label>
          <select
            aria-label="Lọc trạng thái bộ môn"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
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

        {isLoading ? (
          <div className="empty-state" role="status">
            <p>Đang tải danh mục bộ môn...</p>
          </div>
        ) : visibleSports.length ? (
          <div className="table-wrap sports-table-wrap">
            <table className="data-table sports-table">
              <thead>
                <tr>
                  <th scope="col">Bộ môn</th>
                  <th scope="col">Mô tả</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleSports.map((sport) => (
                  <tr key={sport.id}>
                    <td data-label="Bộ môn">
                      <strong>{sport.name}</strong>
                    </td>
                    <td data-label="Mô tả">
                      {sport.description || "Chưa có mô tả"}
                    </td>
                    <td data-label="Trạng thái">
                      <span
                        className={`status-chip ${sport.isActive ? "active" : "expired"}`}
                      >
                        {sport.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td data-label="Thao tác">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => openForm(sport)}
                        >
                          <Edit3 size={15} aria-hidden="true" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setConfirming(sport)}
                        >
                          <Power size={15} aria-hidden="true" />
                          {sport.isActive ? "Ngừng" : "Kích hoạt"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" role="status">
            <Dumbbell size={34} aria-hidden="true" />
            <h3>Không có bộ môn phù hợp</h3>
            <p>Thử đổi từ khóa hoặc trạng thái đang lọc.</p>
          </div>
        )}
      </section>

      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm bộ môn" : "Chỉnh sửa bộ môn"}
          description="Tên được kiểm tra trùng sau khi chuẩn hóa dấu và khoảng trắng."
          onClose={() => !isSaving && setEditing(null)}
        >
          <form className="long-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Tên bộ môn *</span>
              <input
                value={form.name}
                maxLength={80}
                autoFocus
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                  setFieldErrors({ ...fieldErrors, name: "" });
                }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && (
                <small className="form-error">{fieldErrors.name}</small>
              )}
            </label>
            <label className="field">
              <span>Mô tả</span>
              <textarea
                rows={5}
                value={form.description}
                maxLength={500}
                onChange={(event) => {
                  setForm({ ...form, description: event.target.value });
                  setFieldErrors({ ...fieldErrors, description: "" });
                }}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description && (
                <small className="form-error">{fieldErrors.description}</small>
              )}
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button type="submit" className="button primary" disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu bộ môn"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {confirming && (
        <ConfirmDialog
          title={
            confirming.isActive
              ? "Ngừng hoạt động bộ môn?"
              : "Kích hoạt bộ môn?"
          }
          description={
            confirming.isActive
              ? `Các lớp cũ của “${confirming.name}” vẫn được giữ, nhưng không thể tạo lớp mới với bộ môn này.`
              : `Bộ môn “${confirming.name}” sẽ có thể được chọn cho lớp mới.`
          }
          confirmLabel={confirming.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
          destructive={confirming.isActive}
          onCancel={() => setConfirming(null)}
          onConfirm={() => handleToggle(confirming)}
        />
      )}
    </div>
  );
}
