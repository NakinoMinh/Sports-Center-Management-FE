import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { classRosterApi } from "../../services/classRosterApi";
import { describeError } from "../../services/apiErrors";
import {
  trainingOperationsApi,
  type AttendanceStatus,
  type SessionAttendanceItem,
} from "../../services/trainingOperationsApi";
import { isApiConfigured } from "../../services/apiClient";
import type { ClassRegistration } from "../../types/classRoster";
import { formatDate } from "../../utils/format";

const PAGE_SIZE = 20;

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Có mặt",
  LATE: "Đi muộn",
  ABSENT: "Vắng mặt",
};

const ACTIVE_CLASS_BY_STATUS: Record<AttendanceStatus, string> = {
  PRESENT: "active-present",
  LATE: "active-late",
  ABSENT: "active-absent",
};

export function ClassRosterPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const parsedSessionId = Number(sessionId);

  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<number, SessionAttendanceItem>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [search, setSearch] = useState("");
  const requestId = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isValidSessionId =
    Number.isInteger(parsedSessionId) && parsedSessionId > 0;

  const loadRoster = useCallback(async () => {
    const id = ++requestId.current;
    if (!isValidSessionId) {
      setError("ID buổi học không hợp lệ.");
      setRegistrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [result, attList] = await Promise.all([
        classRosterApi.getRegistrations(parsedSessionId, {
          page,
          pageSize: PAGE_SIZE,
          includeCanceled,
          search,
        }),
        isApiConfigured()
          ? trainingOperationsApi
              .getSessionAttendance(parsedSessionId)
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      if (id !== requestId.current) return;
      setRegistrations(result.items);
      setTotalPages(Math.max(1, result.totalPages));
      setTotalItems(result.totalItems);

      const nextMap: Record<number, SessionAttendanceItem> = {};
      for (const item of attList) {
        nextMap[item.registrationId] = item;
      }
      setAttendanceMap(nextMap);
    } catch (err) {
      if (id !== requestId.current) return;
      setRegistrations([]);
      setTotalItems(0);
      setTotalPages(1);
      setError(describeError(err));
    } finally {
      if (id === requestId.current) {
        setHasLoaded(true);
        setLoading(false);
      }
    }
  }, [parsedSessionId, isValidSessionId, page, includeCanceled, search]);

  useEffect(() => {
    const timer = setTimeout(() => void loadRoster(), 150);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
    };
  }, [loadRoster]);

  const sampleMeta = Object.values(attendanceMap)[0];
  const canTakeAttendance = sampleMeta?.canTakeAttendance ?? true;
  const attendanceBlockedReason = sampleMeta?.attendanceBlockedReason;

  async function handleMarkAttendance(
    registrationId: number,
    status: AttendanceStatus,
  ) {
    if (savingId !== null || !canTakeAttendance) return;
    setSavingId(registrationId);
    setNotice("");
    setError("");
    try {
      const updated = await trainingOperationsApi.recordSessionAttendance(
        parsedSessionId,
        registrationId,
        { status },
      );
      setAttendanceMap((prev) => ({
        ...prev,
        [registrationId]: {
          ...(prev[registrationId] ?? {
            registrationId,
            memberId: updated.memberId,
            fitnessGoal: "Nâng cao thể lực & sức bền",
            fitnessLevel: "BEGINNER",
          }),
          ...updated,
        },
      }));
      setNotice(`Đã ghi nhận điểm danh: ${ATTENDANCE_LABELS[status]}.`);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleMarkAllPresent() {
    if (markingAll || !canTakeAttendance) return;
    setMarkingAll(true);
    setNotice("");
    setError("");
    try {
      const res =
        await trainingOperationsApi.markAllSessionAttendancePresent(
          parsedSessionId,
        );
      await loadRoster();
      setNotice(
        res.markedCount > 0
          ? `Đã điểm danh "Có mặt" cho ${res.markedCount} học viên chưa điểm danh.`
          : "Tất cả học viên trong buổi học đã được điểm danh trước đó.",
      );
    } catch (err) {
      setError(describeError(err));
    } finally {
      setMarkingAll(false);
    }
  }

  const bookedRegistrations = registrations.filter(
    (r) => r.status === "BOOKED",
  );
  const presentCount = bookedRegistrations.filter(
    (r) => attendanceMap[r.id]?.attendanceStatus === "PRESENT",
  ).length;
  const lateCount = bookedRegistrations.filter(
    (r) => attendanceMap[r.id]?.attendanceStatus === "LATE",
  ).length;
  const absentCount = bookedRegistrations.filter(
    (r) => attendanceMap[r.id]?.attendanceStatus === "ABSENT",
  ).length;
  const unmarkedCount =
    bookedRegistrations.length - presentCount - lateCount - absentCount;

  return (
    <section className="panel class-roster-page">
      <div className="page-header">
        <div>
          <h1>
            {sampleMeta?.sessionClassName
              ? `Điểm danh: ${sampleMeta.sessionClassName}`
              : `Danh sách học viên & Điểm danh buổi tập #${sessionId}`}
          </h1>
          <p>
            {sampleMeta?.sessionDate
              ? `Ngày học: ${formatDate(sampleMeta.sessionDate)} · Khung giờ: ${sampleMeta.sessionTimeRange} · Phòng: ${sampleMeta.sessionRoomName}`
              : `Xem học viên đăng ký, mục tiêu tập luyện và thực hiện điểm danh cho buổi học #${sessionId}.`}
          </p>
        </div>

        <div className="header-actions-group">
          {canTakeAttendance && bookedRegistrations.length > 0 && (
            <button
              type="button"
              className="button secondary"
              disabled={markingAll || unmarkedCount === 0}
              onClick={() => void handleMarkAllPresent()}
            >
              <CheckCheck size={16} aria-hidden="true" />
              Điểm danh tất cả Có mặt ({unmarkedCount})
            </button>
          )}
          <Link to="/training/coach" className="button primary">
            <ClipboardList size={16} aria-hidden="true" />
            Kế hoạch & Đánh giá
          </Link>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/coach/my-schedule")}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại lịch dạy
          </button>
        </div>
      </div>

      {attendanceBlockedReason && (
        <div
          className="training-homework-box"
          role="status"
          style={{ marginBottom: "1.25rem" }}
        >
          <AlertTriangle size={18} />
          <div>
            <strong>Quy tắc điểm danh:</strong> {attendanceBlockedReason}
          </div>
        </div>
      )}

      <div className="attendance-summary-grid">
        <div className="attendance-stat-box">
          <span>Giữ chỗ / Tổng ĐK</span>
          <strong>
            {bookedRegistrations.length} / {totalItems}
          </strong>
        </div>
        <div className="attendance-stat-box is-present">
          <span>Có mặt</span>
          <strong>{presentCount}</strong>
        </div>
        <div className="attendance-stat-box is-late">
          <span>Đi muộn</span>
          <strong>{lateCount}</strong>
        </div>
        <div className="attendance-stat-box is-absent">
          <span>Vắng mặt</span>
          <strong>{absentCount}</strong>
        </div>
        <div className="attendance-stat-box">
          <span>Chưa điểm danh</span>
          <strong>{unmarkedCount}</strong>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm tên hoặc mã học viên..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={includeCanceled}
            onChange={(event) => {
              setIncludeCanceled(event.target.checked);
              setPage(1);
            }}
          />
          Bao gồm đăng ký đã hủy
        </label>

        <button
          type="button"
          className="button secondary"
          onClick={() => void loadRoster()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="error-notice" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {loading && !hasLoaded ? (
        <div className="empty-state">Đang tải danh sách học viên...</div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã học viên</th>
                <th>Họ và tên</th>
                <th>Mục tiêu & Trình độ tập luyện</th>
                <th>Trạng thái đăng ký</th>
                <th>Điểm danh buổi tập</th>
              </tr>
            </thead>

            <tbody>
              {registrations.map((registration, index) => {
                const info = attendanceMap[registration.id];
                const currentAtt = info?.attendanceStatus;
                const isBooked = registration.status === "BOOKED";
                return (
                  <tr key={registration.id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>{registration.memberCode}</td>
                    <td>
                      <strong>{registration.memberName}</strong>
                      <small>{registration.registeredVia}</small>
                    </td>
                    <td>
                      <div>
                        {info?.fitnessGoal ?? "Nâng cao thể lực & sức bền nền tảng"}
                      </div>
                      <small className="muted">
                        Trình độ:{" "}
                        {LEVEL_LABELS[info?.fitnessLevel ?? "BEGINNER"] ??
                          "Cơ bản"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`status-chip ${isBooked ? "active" : "canceled"}`}
                      >
                        {isBooked ? "Đã đăng ký" : "Đã hủy"}
                      </span>
                    </td>
                    <td>
                      {isBooked ? (
                        canTakeAttendance ? (
                          <div className="attendance-pill-group">
                            {(["PRESENT", "LATE", "ABSENT"] as const).map(
                              (st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={savingId === registration.id}
                                  className={`attendance-pill-btn ${
                                    currentAtt === st
                                      ? ACTIVE_CLASS_BY_STATUS[st]
                                      : ""
                                  }`}
                                  onClick={() =>
                                    void handleMarkAttendance(
                                      registration.id,
                                      st,
                                    )
                                  }
                                >
                                  {ATTENDANCE_LABELS[st]}
                                </button>
                              ),
                            )}
                          </div>
                        ) : (
                          <span className="muted">
                            Chưa đến ngày học / Đã khóa điểm danh
                          </span>
                        )
                      ) : (
                        <span className="muted">Đã hủy đăng ký</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {registrations.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {search.trim()
                      ? "Không tìm thấy học viên phù hợp trong buổi học."
                      : "Không có học viên đăng ký."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => current - 1)}
        >
          Trang trước
        </button>

        <span>
          Trang {page}/{totalPages}
        </span>

        <button
          type="button"
          className="button secondary"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
