import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { SessionForm } from "../../components/classes/SessionForm";
import { CancelScopeDialog } from "../../components/classes/CancelScopeDialog";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { classApi, isClassApiMocked } from "../../services/classApi";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import {
  addCalendarDays,
  centerToday,
  classStatusLabels,
  formatTimeRange,
  hasSessionStarted,
  remainingSeats,
  sessionStatusLabels,
  weekRangeOf,
  weekdayLabel,
} from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";
import type {
  CancelScope,
  ClassRegistration,
  ClassSession,
  ClassSessionInput,
  ClassSessionStatus,
  CoachOption,
  Room,
  TrainingClass,
} from "../../types/classes";

type StatusFilter = ClassSessionStatus | "ALL";

const SESSION_CHIP: Record<ClassSessionStatus, string> = {
  SCHEDULED: "active",
  CANCELED: "canceled",
  COMPLETED: "expired",
};

/**
 * Lập và sửa lịch học, hủy buổi hoặc cả lớp — UC21 và UC30.
 *
 * Trang xem lịch theo tuần. Mọi quy tắc chống trùng Coach/phòng và kiểm tra
 * học viên đang đăng ký do server quyết định; ở đây lỗi được gắn vào đúng ô
 * của form để quản lý biết phải sửa gì.
 */
export function ClassSchedulePage() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [anchorDate, setAnchorDate] = useState(centerToday());
  const [classFilter, setClassFilter] = useState(
    searchParams.get("classId") ?? "ALL",
  );
  const [coachFilter, setCoachFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [editing, setEditing] = useState<ClassSession | "new" | null>(null);
  const [canceling, setCanceling] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<{
    session: ClassSession;
    items: ClassRegistration[];
  } | null>(null);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<
    Record<string, string>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const week = useMemo(() => weekRangeOf(anchorDate), [anchorDate]);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [sessionList, classList, coachList, roomList] = await Promise.all([
        classApi.listSessions({
          from: week.from,
          to: week.to,
          classId: classFilter === "ALL" ? undefined : classFilter,
          coachId: coachFilter === "ALL" ? undefined : coachFilter,
          roomId: roomFilter === "ALL" ? undefined : roomFilter,
          status: statusFilter,
        }),
        classApi.listClasses(),
        classApi.listCoaches(),
        classApi.listRooms(),
      ]);
      setSessions(sessionList);
      setClasses(classList);
      setCoaches(coachList);
      setRooms(roomList);
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [
    currentUser,
    week.from,
    week.to,
    classFilter,
    coachFilter,
    roomFilter,
    statusFilter,
  ]);

  useEffect(() => {
    // Hoãn một nhịp như các trang khác trong repo: gọi setState đồng bộ ngay
    // trong effect làm React dựng lại ngay lần render đầu.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  /** Bảy ngày của tuần, mỗi ngày kèm buổi học đã sắp theo giờ. */
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, offset) => {
        const date = addCalendarDays(week.from, offset);
        return {
          date,
          items: sessions.filter((item) => item.date === date),
        };
      }),
    [sessions, week.from],
  );

  const selectedClass =
    classFilter === "ALL"
      ? undefined
      : classes.find((item) => item.id === classFilter);
  const scheduledCount = sessions.filter(
    (item) => item.status === "SCHEDULED",
  ).length;
  const bookedCount = sessions.reduce((total, item) => total + item.bookedCount, 0);

  function updateClassFilter(value: string) {
    setClassFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "ALL") next.delete("classId");
    else next.set("classId", value);
    // replace: đổi bộ lọc không nên tạo thêm một bước back cho người dùng.
    setSearchParams(next, { replace: true });
  }

  async function saveSession(values: ClassSessionInput) {
    if (!editing) return;
    setIsSaving(true);
    try {
      const sessionId = editing === "new" ? undefined : editing.id;
      const saved = await classApi.saveSession(values, sessionId);
      toast.success(
        editing === "new"
          ? `Đã thêm buổi ${saved.startTime}–${saved.endTime} ngày ${formatDate(saved.date)}.`
          : `Đã cập nhật buổi học ngày ${formatDate(saved.date)}.`,
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

  async function openRoster(session: ClassSession) {
    setRoster({ session, items: [] });
    try {
      const items = await classApi.listSessionRegistrations(session.id);
      setRoster({ session, items });
    } catch (caught) {
      toast.error(describeError(caught));
      setRoster(null);
    }
  }

  async function cancelSessions(scope: CancelScope, reason: string) {
    if (!canceling || !currentUser) return 0;
    return classApi.cancelSessions(
      scope,
      scope === "SESSION"
        ? { sessionId: canceling.id }
        : { classId: canceling.classId },
      reason,
      currentUser,
    );
  }

  if (currentUser?.role !== "CENTER_MANAGER") {
    return (
      <div className="empty-state">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ quản lý trung tâm có thể lập và sửa lịch học.</p>
      </div>
    );
  }

  if (isLoading && !hasLoaded) {
    return (
      <div className="empty-state" role="status">
        Đang tải lịch học…
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ TRUNG TÂM</p>
          <h1>Lịch học</h1>
          <p>
            Lập buổi học cho từng lớp, phân công huấn luyện viên và phòng, hủy
            khi có thay đổi.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button secondary" to="/manager/classes">
            Danh mục lớp
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
            Thêm buổi học
          </button>
        </div>
      </div>

      {isClassApiMocked() && (
        <p className="info-note" role="status">
          <FlaskConical size={16} aria-hidden="true" />
          {/* .info-note là flex: gói nội dung trong một span để chữ không bị
              tách thành nhiều cột trên màn hình hẹp. */}
          <span>
            Đang dùng <strong>dữ liệu mẫu</strong> vì chưa cấu hình{" "}
            <code>VITE_API_BASE_URL</code>. Thao tác chỉ tồn tại trong tab này
            và mất khi tải lại trang.
          </span>
        </p>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <CalendarDays size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Buổi học trong tuần</p>
            <strong>{String(sessions.length).padStart(2, "0")}</strong>
            <small>
              {formatDate(week.from)} – {formatDate(week.to)}
            </small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <CalendarClock size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Còn hiệu lực</p>
            <strong>{String(scheduledCount).padStart(2, "0")}</strong>
            <small>Chưa bị hủy</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet">
            <Users size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Chỗ đã đặt</p>
            <strong>{String(bookedCount).padStart(2, "0")}</strong>
            <small>Tổng trên các buổi của tuần</small>
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

      <section className="panel" aria-labelledby="schedule-title">
        <div className="panel-heading">
          <div>
            <h2 id="schedule-title">Lịch theo tuần</h2>
            <p>
              Khoảng giờ tính theo [bắt đầu, kết thúc): hai buổi liền kề không
              bị coi là trùng.
            </p>
          </div>
          <div className="week-switcher">
            <button
              type="button"
              className="icon-button"
              aria-label="Tuần trước"
              onClick={() => setAnchorDate(addCalendarDays(week.from, -7))}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setAnchorDate(centerToday())}
            >
              Tuần này
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Tuần sau"
              onClick={() => setAnchorDate(addCalendarDays(week.from, 7))}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="toolbar">
          <select
            aria-label="Lọc theo lớp"
            value={classFilter}
            onChange={(event) => updateClassFilter(event.target.value)}
          >
            <option value="ALL">Tất cả lớp</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {classStatusLabels[item.status]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo huấn luyện viên"
            value={coachFilter}
            onChange={(event) => setCoachFilter(event.target.value)}
          >
            <option value="ALL">Tất cả huấn luyện viên</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.fullName}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo phòng"
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="ALL">Tất cả phòng</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo trạng thái buổi học"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCHEDULED">{sessionStatusLabels.SCHEDULED}</option>
            <option value="CANCELED">{sessionStatusLabels.CANCELED}</option>
            <option value="COMPLETED">{sessionStatusLabels.COMPLETED}</option>
          </select>
        </div>

        {selectedClass && (
          <p className="info-note">
            Lớp “{selectedClass.name}” · sức chứa {selectedClass.capacity} ·{" "}
            {classStatusLabels[selectedClass.status]} ·{" "}
            {selectedClass.upcomingSessionCount} buổi sắp tới
          </p>
        )}

        <div className="week-grid">
          {days.map((day) => (
            <section
              key={day.date}
              className={`week-day ${day.date === centerToday() ? "is-today" : ""}`}
              aria-label={`${weekdayLabel(day.date)} ${formatDate(day.date)}`}
            >
              <header>
                <strong>{weekdayLabel(day.date)}</strong>
                <span>{formatDate(day.date)}</span>
              </header>
              {day.items.length ? (
                <ul>
                  {day.items.map((session) => {
                    const seatsLeft = remainingSeats(session);
                    const isLocked =
                      session.status !== "SCHEDULED" ||
                      hasSessionStarted(session);
                    return (
                      <li key={session.id} className="week-session">
                        <p className="week-session-time">
                          {formatTimeRange(session.startTime, session.endTime)}
                          <span
                            className={`status-chip ${SESSION_CHIP[session.status]}`}
                          >
                            {sessionStatusLabels[session.status]}
                          </span>
                        </p>
                        <p className="week-session-title">
                          <strong>{session.className}</strong>
                          <small>
                            {session.coachName} · {session.roomName}
                          </small>
                        </p>
                        <p className="week-session-seats">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => void openRoster(session)}
                          >
                            <Users size={14} aria-hidden="true" />
                            {session.bookedCount}/{session.capacity} chỗ
                          </button>
                          {session.status === "SCHEDULED" && (
                            <span>
                              {seatsLeft > 0 ? `còn ${seatsLeft}` : "đã đủ"}
                            </span>
                          )}
                        </p>
                        {session.cancelReason && (
                          <p className="week-session-reason">
                            Lý do hủy: {session.cancelReason}
                          </p>
                        )}
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Sửa buổi ${session.startTime} ngày ${session.date}`}
                            title={
                              isLocked
                                ? "Buổi đã hủy hoặc đã bắt đầu, không sửa được"
                                : "Sửa buổi học"
                            }
                            disabled={isLocked}
                            onClick={() => {
                              setEditing(session);
                              setFormError("");
                              setFormFieldErrors({});
                            }}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="icon-button danger"
                            aria-label={`Hủy buổi ${session.startTime} ngày ${session.date}`}
                            title={
                              isLocked
                                ? "Buổi đã hủy hoặc đã bắt đầu, không hủy được"
                                : "Hủy buổi học"
                            }
                            disabled={isLocked}
                            onClick={() => setCanceling(session)}
                          >
                            <CalendarX size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="week-day-empty">Không có buổi học</p>
              )}
            </section>
          ))}
        </div>

        <div className="table-footer">
          <span>
            {sessions.length} buổi trong tuần {formatDate(week.from)} –{" "}
            {formatDate(week.to)}
          </span>
          <span>Buổi đã bắt đầu hoặc đã hủy không nhận thao tác nữa.</span>
        </div>
      </section>

      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm buổi học" : "Sửa buổi học"}
          description="Server sẽ kiểm tra lại trùng huấn luyện viên, trùng phòng và quyền tham gia của học viên đang đăng ký."
          onClose={() => setEditing(null)}
        >
          <SessionForm
            initialValues={
              editing === "new"
                ? undefined
                : {
                    classId: editing.classId,
                    coachId: editing.coachId,
                    roomId: editing.roomId,
                    date: editing.date,
                    startTime: editing.startTime,
                    endTime: editing.endTime,
                    capacity: editing.capacity,
                    notes: editing.notes,
                  }
            }
            classes={classes}
            coaches={coaches}
            rooms={rooms}
            lockedClassId={
              editing === "new" && classFilter !== "ALL" ? classFilter : undefined
            }
            bookedCount={editing === "new" ? 0 : editing.bookedCount}
            onSubmit={saveSession}
            onCancel={() => setEditing(null)}
            error={formError}
            fieldErrors={formFieldErrors}
            isSaving={isSaving}
          />
        </Dialog>
      )}

      {canceling && (
        <CancelScopeDialog
          session={canceling}
          owningClass={classes.find((item) => item.id === canceling.classId)}
          onClose={() => setCanceling(null)}
          onSubmit={cancelSessions}
          onCanceled={(scope, count) => {
            setCanceling(null);
            toast.success(
              scope === "SESSION"
                ? "Đã hủy buổi học và các đăng ký liên quan."
                : `Đã hủy ${count} buổi tương lai của lớp và các đăng ký liên quan.`,
            );
            void refresh();
          }}
        />
      )}

      {roster && (
        <Dialog
          title="Danh sách đăng ký"
          description={`${roster.session.className} · ${formatDate(roster.session.date)} · ${formatTimeRange(roster.session.startTime, roster.session.endTime)}`}
          onClose={() => setRoster(null)}
        >
          {roster.items.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Thành viên</th>
                    <th scope="col">Nguồn đăng ký</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.memberName}</strong>
                        <small className="cell-caption">{item.memberCode}</small>
                      </td>
                      <td>
                        {item.registeredVia === "RECEPTIONIST"
                          ? "Quầy lễ tân"
                          : "Thành viên tự đăng ký"}
                        <small className="cell-caption">
                          {item.registeredByName}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`status-chip ${item.status === "BOOKED" ? "active" : "canceled"}`}
                        >
                          {item.status === "BOOKED" ? "Đang giữ chỗ" : "Đã hủy"}
                        </span>
                        {item.cancelReason && (
                          <small className="cell-caption">
                            {item.cancelReason}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p role="status">Chưa có ai đăng ký buổi học này.</p>
          )}
        </Dialog>
      )}
    </>
  );
}
