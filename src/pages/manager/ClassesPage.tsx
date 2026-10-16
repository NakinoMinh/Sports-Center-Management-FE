import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  CalendarClock,
  GraduationCap,
  Layers3,
  Pencil,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { ClassForm } from "../../components/classes/ClassForm";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { classApi } from "../../services/classApi";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { classStatusLabels } from "../../utils/classSchedule";
import type { ClassInput, Sport, TrainingClass } from "../../types/classes";

type StatusFilter = "ALL" | TrainingClass["status"];

const STATUS_CHIP: Record<TrainingClass["status"], string> = {
  DRAFT: "pending",
  OPEN: "active",
  CLOSED: "suspended",
  ARCHIVED: "hidden",
};

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/**
 * Quản lý lớp học — UC19.
 *
 * Lớp không bao giờ bị xóa khỏi màn hình này: chuyển sang "Đã lưu trữ" để lịch
 * sử đăng ký còn nguyên, đúng yêu cầu "không xóa lịch sử đăng ký".
 */
export function ClassesPage() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [editing, setEditing] = useState<TrainingClass | "new" | null>(null);
  const [archiving, setArchiving] = useState<TrainingClass | null>(null);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Phân biệt lần tải đầu với lần làm mới sau thao tác, để không thay cả trang.
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [classList, sportList] = await Promise.all([
        classApi.listClasses(),
        classApi.listSports(),
      ]);
      setClasses(classList);
      setSports(sportList);
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    // Hoãn một nhịp như các trang khác trong repo: gọi setState đồng bộ ngay
    // trong effect làm React dựng lại ngay lần render đầu.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const visibleClasses = useMemo(() => {
    const needle = normalize(search.trim());
    return classes.filter((item) => {
      const matchesSearch =
        !needle ||
        normalize(`${item.name} ${item.sportName} ${item.description}`).includes(
          needle,
        );
      const matchesSport =
        sportFilter === "ALL" || item.sportId === sportFilter;
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesSport && matchesStatus;
    });
  }, [classes, search, sportFilter, statusFilter]);

  const openCount = classes.filter((item) => item.status === "OPEN").length;
  const registrationCount = classes.reduce(
    (total, item) => total + item.activeRegistrationCount,
    0,
  );
  const hasFilters =
    search.trim() !== "" || sportFilter !== "ALL" || statusFilter !== "ALL";

  async function saveClass(values: ClassInput) {
    if (!editing) return;
    setIsSaving(true);
    try {
      const classId = editing === "new" ? undefined : editing.id;
      const saved = await classApi.saveClass(values, classId);
      toast.success(
        editing === "new"
          ? `Đã tạo lớp “${saved.name}”. Lập lịch để mở đăng ký.`
          : `Đã cập nhật lớp “${saved.name}”. Lịch sử đăng ký được giữ nguyên.`,
      );
      setEditing(null);
      setFormError("");
      setFormFieldErrors({});
      await refresh();
    } catch (caught) {
      setFormError(describeError(caught));
      setFormFieldErrors(fieldErrorsOf(caught));
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveClass() {
    if (!archiving) return;
    setIsSaving(true);
    try {
      await classApi.setClassStatus(archiving.id, "ARCHIVED");
      toast.success(
        `Đã lưu trữ “${archiving.name}”. Lớp không nhận đăng ký mới, lịch sử vẫn còn.`,
      );
      setArchiving(null);
      setFormError("");
      await refresh();
    } catch (caught) {
      setFormError(describeError(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (currentUser?.role !== "CENTER_MANAGER") {
    return (
      <div className="empty-state">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ quản lý trung tâm có thể quản lý danh mục lớp học.</p>
      </div>
    );
  }

  // Chỉ lần tải đầu mới thay cả trang; làm mới sau thao tác giữ nguyên bố cục
  // để trình duyệt không kéo người dùng về đầu trang.
  if (isLoading && !hasLoaded) {
    return (
      <div className="empty-state" role="status">
        Đang tải danh mục lớp học…
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ TRUNG TÂM</p>
          <h1>Lớp học</h1>
          <p>
            Tạo lớp theo bộ môn, đặt sức chứa và quyết định lớp nào đang nhận
            đăng ký.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button secondary" to="/manager/class-schedule">
            <CalendarClock size={18} aria-hidden="true" />
            Lịch học
          </Link>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setEditing("new");
              setFormError("");
              setFormFieldErrors({});
            }}
          >
            <Plus size={18} aria-hidden="true" />
            Tạo lớp học
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Tổng số lớp</p>
            <strong>{String(classes.length).padStart(2, "0")}</strong>
            <small>Gồm cả lớp nháp và lớp đã lưu trữ</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Đang nhận đăng ký</p>
            <strong>{String(openCount).padStart(2, "0")}</strong>
            <small>Có buổi học hợp lệ ở tương lai</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet">
            <Users size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Đăng ký còn hiệu lực</p>
            <strong>{String(registrationCount).padStart(2, "0")}</strong>
            <small>Trên toàn bộ buổi học của các lớp</small>
          </div>
        </div>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          {error}
          <button
            type="button"
            className="button secondary"
            onClick={() => void refresh()}
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="class-list-title">
        <div className="panel-heading">
          <div>
            <h2 id="class-list-title">Danh mục lớp học</h2>
            <p>
              Lớp chỉ mở đặt chỗ khi đã có buổi học hợp lệ. Lớp không còn dùng
              nữa thì lưu trữ, không xóa.
            </p>
          </div>
          <span className="count-label">{classes.length} lớp</span>
        </div>

        <div className="toolbar">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Tìm kiếm lớp học"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên lớp, bộ môn hoặc mô tả..."
            />
          </div>
          <select
            aria-label="Lọc theo bộ môn"
            value={sportFilter}
            onChange={(event) => setSportFilter(event.target.value)}
          >
            <option value="ALL">Tất cả bộ môn</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo trạng thái lớp"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">{classStatusLabels.DRAFT}</option>
            <option value="OPEN">{classStatusLabels.OPEN}</option>
            <option value="CLOSED">{classStatusLabels.CLOSED}</option>
            <option value="ARCHIVED">{classStatusLabels.ARCHIVED}</option>
          </select>
        </div>

        {visibleClasses.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Lớp & bộ môn</th>
                  <th scope="col">Sức chứa</th>
                  <th scope="col">Buổi học</th>
                  <th scope="col">Đăng ký</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleClasses.map((item) => (
                  <tr
                    key={item.id}
                    className={item.status === "ARCHIVED" ? "row-inactive" : ""}
                  >
                    <td>
                      <div className="package-table-name">
                        <span className="package-icon">
                          <GraduationCap size={20} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{item.name}</strong>
                          <small className="cell-caption">
                            {item.sportName}
                          </small>
                          {item.description && (
                            <p className="schedule-cell">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{item.capacity}</strong>
                      <small className="cell-caption">người / buổi</small>
                    </td>
                    <td>
                      <strong>{item.upcomingSessionCount}</strong>
                      <small className="cell-caption">
                        sắp tới / {item.totalSessionCount} tổng
                      </small>
                    </td>
                    <td>
                      <span className="inline-icon">
                        <Users size={16} aria-hidden="true" />
                        {item.activeRegistrationCount}
                      </span>
                      <small className="cell-caption">còn hiệu lực</small>
                    </td>
                    <td>
                      <span className={`status-chip ${STATUS_CHIP[item.status]}`}>
                        {classStatusLabels[item.status]}
                      </span>
                      {item.status !== "OPEN" &&
                        item.upcomingSessionCount === 0 && (
                          <small className="cell-caption">
                            Chưa có buổi hợp lệ
                          </small>
                        )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Chỉnh sửa ${item.name}`}
                          title="Chỉnh sửa lớp học"
                          onClick={() => {
                            setEditing(item);
                            setFormError("");
                            setFormFieldErrors({});
                          }}
                        >
                          <Pencil size={17} aria-hidden="true" />
                        </button>
                        <Link
                          className="icon-button"
                          to={`/manager/class-schedule?classId=${item.id}`}
                          aria-label={`Lập lịch cho ${item.name}`}
                          title="Lập lịch buổi học"
                        >
                          <CalendarClock size={17} aria-hidden="true" />
                        </Link>
                        {item.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            className="icon-button danger"
                            aria-label={`Lưu trữ ${item.name}`}
                            title="Lưu trữ lớp học"
                            onClick={() => {
                              setArchiving(item);
                              setFormError("");
                            }}
                          >
                            <Archive size={17} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <GraduationCap size={36} aria-hidden="true" />
            <h3>
              {classes.length
                ? "Không tìm thấy lớp học"
                : "Bắt đầu với lớp học đầu tiên"}
            </h3>
            <p>
              {classes.length
                ? "Thử một từ khóa khác hoặc bỏ bộ lọc đang áp dụng."
                : "Tạo lớp theo bộ môn, sau đó lập lịch buổi học để mở đăng ký."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setSportFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setEditing("new");
                  setFormError("");
                  setFormFieldErrors({});
                }}
              >
                Tạo lớp học
              </button>
            )}
          </div>
        )}

        <div className="table-footer">
          <span>
            Hiển thị {visibleClasses.length} / {classes.length} lớp
          </span>
          <span>Lớp đã có đăng ký chỉ được lưu trữ, không xóa.</span>
        </div>
      </section>

      {editing && (
        <Dialog
          title={editing === "new" ? "Tạo lớp học mới" : "Chỉnh sửa lớp học"}
          description="Các trường có dấu * là bắt buộc. Sức chứa lớp là giới hạn trên cho từng buổi học."
          onClose={() => setEditing(null)}
        >
          <ClassForm
            initialValues={
              editing === "new"
                ? undefined
                : {
                    sportId: editing.sportId,
                    name: editing.name,
                    description: editing.description,
                    capacity: editing.capacity,
                    status: editing.status,
                  }
            }
            sports={sports}
            activeRegistrationCount={
              editing === "new" ? 0 : editing.activeRegistrationCount
            }
            upcomingSessionCount={
              editing === "new" ? 0 : editing.upcomingSessionCount
            }
            onSubmit={saveClass}
            onCancel={() => setEditing(null)}
            error={formError}
            fieldErrors={formFieldErrors}
            isSaving={isSaving}
          />
        </Dialog>
      )}

      {archiving && (
        <Dialog
          title="Lưu trữ lớp học?"
          onClose={() => setArchiving(null)}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setArchiving(null)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button danger"
                onClick={archiveClass}
                disabled={isSaving}
              >
                <Archive size={17} aria-hidden="true" />
                {isSaving ? "Đang lưu…" : "Lưu trữ lớp"}
              </button>
            </>
          }
        >
          <p>
            “{archiving.name}” sẽ ngừng nhận đăng ký mới và biến khỏi danh sách
            vận hành. Lịch sử đăng ký và các buổi đã diễn ra vẫn được giữ.
          </p>
          {archiving.activeRegistrationCount > 0 && (
            <p className="info-note">
              Lớp đang có {archiving.activeRegistrationCount} đăng ký còn hiệu
              lực. Hãy hủy các buổi tương lai ở trang Lịch học trước, để thành
              viên biết buổi của họ không còn diễn ra.
            </p>
          )}
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
