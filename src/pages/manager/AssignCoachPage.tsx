import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  UserRoundCheck,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { describeError } from "../../services/apiErrors";
import { assignCoachApi } from "../../services/assignCoachApi";
import type { ClassSession, CoachOption } from "../../types/assignCoach";
import "../../styles/assign-coach.css";
const statusLabels: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  COMPLETED: "Đã hoàn thành",
  CANCELED: "Đã hủy",
  CANCELLED: "Đã hủy",
  ONGOING: "Đang diễn ra",
};

const formatDate = (date: string): string => {
  if (!date) return "—";

  const parts = date.slice(0, 10).split("-");
  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export function AssignCoachPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(
    null,
  );
  const [selectedCoachId, setSelectedCoachId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [sessionData, coachData] = await Promise.all([
        assignCoachApi.getSessions(),
        assignCoachApi.getCoaches(),
      ]);

      setSessions(sessionData);
      setCoaches(coachData);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesSearch =
        !keyword ||
        session.className.toLowerCase().includes(keyword) ||
        session.coachName.toLowerCase().includes(keyword) ||
        session.roomName.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || session.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sessions, search, statusFilter]);

  const openAssignDialog = (session: ClassSession) => {
    setSelectedSession(session);
    setSelectedCoachId(session.coachId ?? "");
    setFormError("");
    setNotice("");
  };

  const closeAssignDialog = () => {
    if (saving) return;

    setSelectedSession(null);
    setSelectedCoachId("");
    setFormError("");
  };

  const handleAssignCoach = async () => {
    if (!selectedSession) return;

    if (!selectedCoachId) {
      setFormError("Vui lòng chọn huấn luyện viên.");
      return;
    }

    if (selectedCoachId === selectedSession.coachId) {
      setFormError("Huấn luyện viên này đã được phân công cho buổi học.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await assignCoachApi.assignCoach(selectedSession.id, selectedCoachId);

      const updatedSessions = await assignCoachApi.getSessions();
      setSessions(updatedSessions);

      setNotice("Phân công huấn luyện viên thành công.");
      setSelectedSession(null);
      setSelectedCoachId("");
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ TRUNG TÂM</span>
          <h1>Phân công huấn luyện viên</h1>
          <p>
            Quản lý và thay đổi huấn luyện viên phụ trách các buổi học tại trung
            tâm.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Làm mới
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

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Danh sách buổi học</h2>
            <p>
              Hiển thị {filteredSessions.length}/{sessions.length} buổi học
            </p>
          </div>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Tìm lớp, huấn luyện viên, phòng..."
              aria-label="Tìm kiếm buổi học"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            value={statusFilter}
            aria-label="Lọc trạng thái buổi học"
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELED">Đã hủy</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state" role="status">
            Đang tải danh sách buổi học...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={32} aria-hidden="true" />
            <p>
              {error
                ? "Không thể tải danh sách buổi học."
                : sessions.length === 0
                  ? "Chưa có buổi học nào trong hệ thống."
                  : "Không tìm thấy buổi học phù hợp."}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buổi học</th>
                  <th>Ngày học</th>
                  <th>Giờ học</th>
                  <th>Phòng tập</th>
                  <th>HLV phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>
                        {session.className || `Buổi học #${session.id}`}
                      </strong>{" "}
                      <div>
                        <small>{session.sportName}</small>
                      </div>
                    </td>

                    <td>
                      <CalendarDays size={15} aria-hidden="true" />{" "}
                      {formatDate(session.date)}
                    </td>

                    <td>
                      <Clock3 size={15} aria-hidden="true" />{" "}
                      {session.startTime} - {session.endTime}
                    </td>

                    <td>
                      <MapPin size={15} aria-hidden="true" /> {session.roomName}
                    </td>

                    <td>{session.coachName || "Chưa phân công"}</td>

                    <td>{statusLabels[session.status] ?? session.status}</td>

                    <td>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => openAssignDialog(session)}
                        disabled={session.status !== "SCHEDULED"}
                      >
                        <UserRoundCheck size={15} aria-hidden="true" />
                        Phân công
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSession && (
        <Dialog
          title="Phân công huấn luyện viên"
          description={`Buổi học: ${selectedSession.className}`}
          onClose={closeAssignDialog}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={closeAssignDialog}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="button"
                className="button primary"
                onClick={() => void handleAssignCoach()}
                disabled={saving || !selectedCoachId}
              >
                {saving ? "Đang lưu..." : "Lưu phân công"}
              </button>
            </>
          }
        >
          <div className="assign-coach-form">
            <div className="assign-coach-info">
              <span className="assign-coach-label">Buổi học</span>
              <strong>
                {selectedSession.className || `Buổi học #${selectedSession.id}`}
              </strong>

              <span className="assign-coach-meta">
                <CalendarDays size={15} aria-hidden="true" />
                {formatDate(selectedSession.date)}
                <Clock3 size={15} aria-hidden="true" />
                {selectedSession.startTime} - {selectedSession.endTime}
              </span>
            </div>

            <div className="assign-coach-field">
              <label htmlFor="assigned-coach">
                Huấn luyện viên phụ trách *
              </label>

              <select
                id="assigned-coach"
                value={selectedCoachId}
                onChange={(event) => {
                  setSelectedCoachId(event.target.value);
                  setFormError("");
                }}
                disabled={saving}
              >
                <option value="">-- Chọn huấn luyện viên --</option>

                {coaches.map((coach) => (
                  <option key={coach.accountId} value={coach.accountId}>
                    {coach.fullName}
                    {coach.specialization ? ` — ${coach.specialization}` : ""}
                  </option>
                ))}
              </select>

              {coaches.length === 0 && (
                <p className="assign-coach-hint">
                  Chưa có huấn luyện viên đang hoạt động.
                </p>
              )}
            </div>

            {formError && (
              <div className="error-notice" role="alert">
                {formError}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
