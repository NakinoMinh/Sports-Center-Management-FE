import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { useToast } from "../../hooks/useToast";
import { describeError } from "../../services/apiErrors";
import { assignCoachApi } from "../../services/assignCoachApi";
import { classApi } from "../../services/classApi";
import type { ClassSession, CoachOption } from "../../types/assignCoach";
import type { TrainingClass } from "../../types/classes";
import {
  CLASS_ASSIGNMENT_STATUS_LABELS,
  getClassAssignmentSummary,
  getClassCoachAvailability,
} from "../../utils/coachAssignment";
import { formatDate } from "../../utils/format";
import * as v from "../../utils/validation";
import "../../styles/assign-coach.css";

export function AssignCoachPage() {
  const toast = useToast();
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [coachError, setCoachError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [classData, sessionData, coachData] = await Promise.all([
        classApi.listClasses(),
        assignCoachApi.getSessions(),
        assignCoachApi.getCoaches(),
      ]);
      setClasses(classData);
      setSessions(sessionData);
      setCoaches(coachData);
      setHasLoadError(false);
    } catch (error) {
      setHasLoadError(true);
      toast.error(describeError(error));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const classAssignments = useMemo(
    () => classes.map((trainingClass) => ({
      trainingClass,
      ...getClassAssignmentSummary(trainingClass.id, sessions),
    })),
    [classes, sessions],
  );

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return classAssignments.filter(({ trainingClass, coachName, roomNames, status }) => {
      const matchesSearch = !keyword ||
        [trainingClass.name, trainingClass.sportName, coachName, ...roomNames].some(
          (value) => value.toLocaleLowerCase("vi").includes(keyword),
        );
      return matchesSearch && (statusFilter === "ALL" || status === statusFilter);
    });
  }, [classAssignments, search, statusFilter]);

  const selectedAssignment = classAssignments.find(
    ({ trainingClass }) => trainingClass.id === selectedClassId,
  );
  const selectedClass = selectedAssignment?.trainingClass;
  const coachOptions = useMemo(
    () => {
      const trainingClass = classes.find((item) => item.id === selectedClassId);
      return trainingClass ? coaches.map((coach) => ({
        coach,
        ...getClassCoachAvailability(coach, trainingClass, sessions),
      })) : [];
    },
    [classes, coaches, selectedClassId, sessions],
  );
  const hasAvailableCoach = coachOptions.some((option) => option.isAvailable);

  function handleOpenAssignDialog(classId: string, currentCoachId: string) {
    setSelectedClassId(classId);
    setSelectedCoachId(currentCoachId);
    setCoachError("");
  }

  function handleCloseAssignDialog() {
    if (isSaving) return;
    setSelectedClassId(null);
    setSelectedCoachId("");
    setCoachError("");
  }

  async function handleAssignCoach() {
    if (!selectedClass || isSaving) return;
    const errors = v.validateForm(
      { coachId: selectedCoachId },
      { coachId: v.required("Huấn luyện viên phụ trách") },
    );
    if (v.hasErrors(errors)) {
      setCoachError(errors.coachId ?? "");
      return;
    }
    const selectedOption = coachOptions.find(
      (option) => option.coach.accountId === selectedCoachId,
    );
    if (!selectedOption?.isAvailable) {
      setCoachError(selectedOption?.reason ?? "Vui lòng chọn huấn luyện viên trong danh sách.");
      return;
    }

    setIsSaving(true);
    setCoachError("");
    try {
      await assignCoachApi.assignClassCoach(
        selectedClass,
        selectedCoachId,
      );
      setSelectedClassId(null);
      setSelectedCoachId("");
      toast.success("Phân công huấn luyện viên thành công.");
    } catch (error) {
      const message = describeError(error);
      setCoachError(message);
      toast.error(message);
    } finally {
      await refresh();
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Phân công huấn luyện viên</h1>
          <p>
            Quản lý và phân công huấn luyện viên đúng chuyên môn phụ trách từng lớp học.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => void refresh()}
            disabled={isLoading || isSaving}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Làm mới
          </button>
        </div>
      </div>

      <section className="panel" aria-busy={isLoading}>
        <div className="panel-heading">
          <div>
            <h2>Danh sách lớp học</h2>
            <p>
              Hiển thị {filteredClasses.length}/{classes.length} lớp học.
            </p>
          </div>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Tìm lớp, bộ môn, huấn luyện viên, phòng..."
              aria-label="Tìm kiếm lớp học"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            value={statusFilter}
            aria-label="Lọc trạng thái"
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELED">Đã hủy</option>
          </select>
        </div>

        {isLoading && !hasLoaded ? (
          <div className="empty-state" role="status">
            Đang tải danh sách lớp học...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={32} aria-hidden="true" />
            <p>
              {hasLoadError
                ? "Không thể tải danh sách lớp học. Vui lòng bấm Làm mới để thử lại."
                : classes.length === 0
                  ? "Chưa có lớp học nào trong hệ thống."
                  : "Không tìm thấy lớp học phù hợp."}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lớp học &amp; Bộ môn</th>
                  <th>Ngày học</th>
                  <th>Phòng tập</th>
                  <th>HLV quản lý</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map(({ trainingClass, upcomingSessions, coachId, coachName, roomName, roomNames, startDate, endDate, status }) => {
                  const canAssign = trainingClass.status !== "ARCHIVED" && upcomingSessions.length > 0;
                  return (
                    <tr key={trainingClass.id}>
                      <td>
                        <strong>{trainingClass.name}</strong>
                        <small className="cell-caption">Bộ môn: {trainingClass.sportName}</small>
                      </td>
                      <td>
                        <CalendarDays size={15} aria-hidden="true" />{" "}
                        {formatDate(startDate)}
                        {endDate !== startDate && ` – ${formatDate(endDate)}`}
                      </td>
                      <td title={roomNames.join(", ")}>
                        <MapPin size={15} aria-hidden="true" /> {roomName}
                      </td>
                      <td>{coachName || "Chưa phân công"}</td>
                      <td>{CLASS_ASSIGNMENT_STATUS_LABELS[status]}</td>
                      <td>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => handleOpenAssignDialog(trainingClass.id, coachId)}
                          disabled={!canAssign || isSaving || isLoading}
                        >
                          <UserRoundCheck size={15} aria-hidden="true" />
                          Phân công
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClass && selectedAssignment && (
        <Dialog
          title="Phân công huấn luyện viên phù hợp"
          description={`Lớp: ${selectedClass.name} · Bộ môn: ${selectedClass.sportName}`}
          onClose={handleCloseAssignDialog}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={handleCloseAssignDialog}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => void handleAssignCoach()}
                disabled={isSaving || !selectedCoachId}
              >
                {isSaving ? "Đang lưu..." : "Lưu phân công"}
              </button>
            </>
          }
        >
          <div className="assign-coach-form">
            <div className="assign-coach-info">
              <span className="assign-coach-label">Lớp học · Bộ môn {selectedClass.sportName}</span>
              <strong>{selectedClass.name}</strong>
              <span className="assign-coach-meta">
                <CalendarDays size={15} aria-hidden="true" />
                {formatDate(selectedAssignment.startDate)}
                {selectedAssignment.endDate !== selectedAssignment.startDate &&
                  ` – ${formatDate(selectedAssignment.endDate)}`}
                <MapPin size={15} aria-hidden="true" />
                {selectedAssignment.roomName}
              </span>
            </div>
            <p className="info-note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Chỉ những huấn luyện viên đang hoạt động, có chuyên môn{" "}
                <strong>{selectedClass.sportName}</strong> và không trùng lịch
                mới được phép phân công phụ trách lớp này.
              </span>
            </p>
            <div className="assign-coach-field">
              <label htmlFor="assigned-coach">
                Huấn luyện viên phụ trách (chuyên môn {selectedClass.sportName}) *
              </label>
              <select
                id="assigned-coach"
                value={selectedCoachId}
                onChange={(event) => {
                  setSelectedCoachId(event.target.value);
                  setCoachError("");
                }}
                disabled={isSaving}
                aria-invalid={Boolean(coachError)}
                aria-describedby={`assigned-coach-help${coachError ? " assigned-coach-error" : ""}`}
              >
                <option value="">-- Chọn huấn luyện viên phù hợp --</option>
                {coachOptions.map(({ coach, isAvailable, reason }) => {
                  const expertise = coach.disciplines
                    .filter((discipline) => discipline.isActive)
                    .map((discipline) => discipline.disciplineName)
                    .join(", ");
                  return (
                    <option key={coach.accountId} value={coach.accountId} disabled={!isAvailable}>
                      {coach.fullName}{expertise ? ` [${expertise}]` : ""} — {reason}
                    </option>
                  );
                })}
              </select>
              <small id="assigned-coach-help" className="assign-coach-hint">
                {hasAvailableCoach
                  ? "Chỉ chọn HLV đang hoạt động, đúng chuyên môn và không trùng bất kỳ buổi học nào của lớp."
                  : "Chưa có HLV khác phù hợp với toàn bộ lịch học của lớp. Vui lòng kiểm tra chuyên môn và lịch dạy."}
              </small>
              {coachError && (
                <p id="assigned-coach-error" className="form-error" role="alert">
                  {coachError}
                </p>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
