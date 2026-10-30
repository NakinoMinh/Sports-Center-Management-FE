import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";
import { SlotFilterBar } from "../../components/classes/SlotFilterBar";
import { useAuth } from "../../hooks/useAuth";
import { describeError } from "../../services/apiErrors";
import { classApi } from "../../services/classApi";
import type {
  ClassSession,
  ClassSessionStatus,
  CoachOption,
  Room,
  Sport,
} from "../../types/classes";
import {
  CENTER_TIME_SLOTS,
  addCalendarDays,
  byStartTime,
  centerToday,
  deriveCoachOptionsFromSessions,
  formatSlotLabel,
  matchesTimeSlot,
  remainingSeats,
  sessionStatusLabels,
  weekRangeOf,
  weekdayLabel,
} from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";

type ViewMode = "DAY" | "WEEK";
type StatusFilter = ClassSessionStatus | "ALL";

const chipFor = (status: ClassSessionStatus): string =>
  status === "SCHEDULED"
    ? "active"
    : status === "CANCELED"
      ? "canceled"
      : "expired";

export function CenterSchedulePage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [anchorDate, setAnchorDate] = useState(centerToday());
  const [viewMode, setViewMode] = useState<ViewMode>("WEEK");
  const [sportId, setSportId] = useState("ALL");
  const [coachId, setCoachId] = useState("ALL");
  const [roomId, setRoomId] = useState("ALL");
  const [slotFilter, setSlotFilter] = useState("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(
    () =>
      viewMode === "DAY"
        ? { from: anchorDate, to: anchorDate }
        : weekRangeOf(anchorDate),
    [anchorDate, viewMode],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const canReadCoaches = currentUser?.role === "CENTER_MANAGER";
      const [sessionList, sportList, coachList, roomList] = await Promise.all([
        classApi.listSessions({
          from: range.from,
          to: range.to,
          sportId: sportId === "ALL" ? undefined : sportId,
          coachId: coachId === "ALL" ? undefined : coachId,
          roomId: roomId === "ALL" ? undefined : roomId,
          status,
        }),
        classApi.listSports(),
        canReadCoaches
          ? classApi.listCoaches().catch(() => [])
          : Promise.resolve([]),
        classApi.listRooms(),
      ]);
      const sortedSessions = sessionList.sort(byStartTime);
      setSessions(sortedSessions);
      setSports(sportList);
      setCoaches(deriveCoachOptionsFromSessions(sortedSessions, coachList));
      setRooms(roomList);
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [coachId, currentUser, range.from, range.to, roomId, sportId, status]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const filteredSessions = useMemo(
    () => sessions.filter((item) => matchesTimeSlot(item, slotFilter)),
    [sessions, slotFilter],
  );

  const days = useMemo(() => {
    const count = viewMode === "DAY" ? 1 : 7;
    return Array.from({ length: count }, (_, index) => {
      const date = addCalendarDays(range.from, index);
      return {
        date,
        items: filteredSessions.filter((item) => item.date === date),
      };
    });
  }, [filteredSessions, range.from, viewMode]);

  const shift = viewMode === "DAY" ? 1 : 7;
  const audience =
    currentUser?.role === "RECEPTIONIST" ? "QUẦY LỄ TÂN" : "QUẢN LÝ TRUNG TÂM";

  return (
    <div className="long-page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{audience}</span>
          <h1>Lịch hoạt động trung tâm theo Khung giờ (Slot)</h1>
          <p>
            Tra cứu các lớp học theo ngày hoặc tuần, khung giờ (Slot) có sẵn,
            bộ môn, huấn luyện viên quản lý và phòng tập (không có giờ tự do).
          </p>
        </div>
        <span className="page-icon">
          <CalendarDays size={26} aria-hidden="true" />
        </span>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <span>{error}</span>
          <button type="button" className="button secondary" onClick={refresh}>
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="center-schedule-title">
        <div className="panel-heading">
          <div>
            <h2 id="center-schedule-title">
              {viewMode === "DAY" ? "Lịch trong ngày" : "Lịch theo tuần"}
            </h2>
            <p>
              {formatDate(range.from)}
              {range.from !== range.to ? ` – ${formatDate(range.to)}` : ""}
            </p>
          </div>
          <div className="long-view-actions">
            <div className="segmented-control" aria-label="Chế độ xem lịch">
              <button
                type="button"
                className={viewMode === "DAY" ? "is-active" : ""}
                onClick={() => setViewMode("DAY")}
              >
                Ngày
              </button>
              <button
                type="button"
                className={viewMode === "WEEK" ? "is-active" : ""}
                onClick={() => setViewMode("WEEK")}
              >
                Tuần
              </button>
            </div>
            <div className="week-switcher">
              <button
                type="button"
                className="icon-button"
                aria-label={viewMode === "DAY" ? "Ngày trước" : "Tuần trước"}
                onClick={() => setAnchorDate(addCalendarDays(anchorDate, -shift))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setAnchorDate(centerToday())}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={viewMode === "DAY" ? "Ngày sau" : "Tuần sau"}
                onClick={() => setAnchorDate(addCalendarDays(anchorDate, shift))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <SlotFilterBar
          sessions={sessions}
          selectedSlotId={slotFilter}
          onSelectSlot={setSlotFilter}
        />

        <div className="toolbar">
          <select
            aria-label="Lọc theo khung giờ"
            value={slotFilter}
            onChange={(event) => setSlotFilter(event.target.value)}
          >
            <option value="ALL">Tất cả khung giờ (Slot)</option>
            {CENTER_TIME_SLOTS.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name} · {slot.startTime} – {slot.endTime}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo bộ môn"
            value={sportId}
            onChange={(event) => setSportId(event.target.value)}
          >
            <option value="ALL">Tất cả bộ môn</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc theo huấn luyện viên"
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
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
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <option value="ALL">Tất cả phòng</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái buổi học"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCHEDULED">{sessionStatusLabels.SCHEDULED}</option>
            <option value="CANCELED">{sessionStatusLabels.CANCELED}</option>
            <option value="COMPLETED">{sessionStatusLabels.COMPLETED}</option>
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
            <p>Đang tải lịch trung tâm...</p>
          </div>
        ) : filteredSessions.length ? (
          <div className="week-grid">
            {days.map((day) => (
              <section
                className={`week-day ${day.date === centerToday() ? "is-today" : ""}`}
                key={day.date}
              >
                <header>
                  <strong>{weekdayLabel(day.date)}</strong>
                  <span>{formatDate(day.date)}</span>
                </header>
                {day.items.length ? (
                  <ul>
                    {day.items.map((session) => (
                      <li className="week-session" key={session.id}>
                        <div className="week-session-time">
                          <Clock3 size={14} aria-hidden="true" />
                          {formatSlotLabel(session.startTime, session.endTime)}
                        </div>
                        <div className="week-session-title">
                          <strong>{session.className}</strong>
                          <span>Bộ môn: {session.sportName}</span>
                        </div>
                        <span>
                          <UserRound size={14} aria-hidden="true" /> HLV quản lý:{" "}
                          {session.coachName}
                        </span>
                        <span>
                          <MapPin size={14} aria-hidden="true" /> Phòng:{" "}
                          {session.roomName}
                        </span>
                        <div className="week-session-seats">
                          <span>
                            <Users size={14} aria-hidden="true" />{" "}
                            {remainingSeats(session)}/{session.capacity} chỗ
                            trống
                          </span>
                          <span
                            className={`status-chip ${chipFor(session.status)}`}
                          >
                            {sessionStatusLabels[session.status]}
                          </span>
                        </div>
                        {session.cancelReason && (
                          <p className="week-session-reason">
                            Lý do hủy: {session.cancelReason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="week-day-empty">Không có buổi học.</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <CalendarDays size={34} aria-hidden="true" />
            <h3>Không có buổi học trong khoảng này</h3>
            <p>Thử đổi ngày hoặc bỏ bớt bộ lọc.</p>
          </div>
        )}
      </section>
    </div>
  );
}
