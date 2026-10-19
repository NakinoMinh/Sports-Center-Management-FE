import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  MapPin,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { SessionRegistrationPanel } from "../../components/classes/SessionRegistrationPanel";
import { useAuth } from "../../hooks/useAuth";
import { describeError } from "../../services/apiErrors";
import { classApi } from "../../services/classApi";
import type {
  ClassRegistration,
  ClassSession,
  CoachOption,
  Sport,
  TrainingClass,
} from "../../types/classes";
import {
  addCalendarDays,
  byStartTime,
  centerToday,
  classStatusLabels,
  formatTimeRange,
  remainingSeats,
  sessionStatusLabels,
  weekRangeOf,
  weekdayLabel,
} from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";

type MemberClassView = "DISCOVER" | "SCHEDULE";
type ScheduleMode = "LIST" | "WEEK";

type Props = {
  view: MemberClassView;
};

const registrationFor = (
  registrations: readonly ClassRegistration[],
  sessionId: string,
): ClassRegistration | null =>
  registrations.find(
    (item) => item.sessionId === sessionId && item.status === "BOOKED",
  ) ?? null;

const byRegistrationStart = (
  first: ClassRegistration,
  second: ClassRegistration,
): number => byStartTime(first.session, second.session);

export function MemberClassesPage({ view }: Props) {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [search, setSearch] = useState("");
  const [sportId, setSportId] = useState("ALL");
  const [coachId, setCoachId] = useState("ALL");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("LIST");
  const [anchorDate, setAnchorDate] = useState(centerToday());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      if (view === "DISCOVER") {
        const [classList, sessionList, registrationList, sportList, coachList] =
          await Promise.all([
            classApi.listClasses({ status: "OPEN" }),
            classApi.listSessions({
              from: centerToday(),
              status: "SCHEDULED",
            }),
            classApi.listMyRegistrations(true),
            classApi.listSports(),
            classApi.listCoaches(),
          ]);
        setClasses(classList.filter((item) => item.status === "OPEN"));
        setSessions(
          sessionList
            .filter(
              (item) => item.status === "SCHEDULED" && item.date >= centerToday(),
            )
            .sort(byStartTime),
        );
        setRegistrations(registrationList);
        setSports(sportList.filter((item) => item.isActive));
        setCoaches(coachList.filter((item) => item.isActive));
      } else {
        setRegistrations(
          (await classApi.listMyRegistrations(true)).sort(
            byRegistrationStart,
          ),
        );
      }
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, view]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const visibleClasses = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return classes.filter((item) => {
      const classSessions = sessions.filter((session) => session.classId === item.id);
      const matchesSearch =
        !keyword ||
        `${item.name} ${item.sportName} ${item.description}`
          .toLocaleLowerCase("vi")
          .includes(keyword);
      const matchesSport = sportId === "ALL" || item.sportId === sportId;
      const matchesCoach =
        coachId === "ALL" ||
        classSessions.some((session) => session.coachId === coachId);
      return matchesSearch && matchesSport && matchesCoach && classSessions.length > 0;
    });
  }, [classes, coachId, search, sessions, sportId]);

  const week = useMemo(() => weekRangeOf(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addCalendarDays(week.from, index);
        return {
          date,
          items: registrations.filter((item) => item.session.date === date),
        };
      }),
    [registrations, week.from],
  );

  const isDiscover = view === "DISCOVER";

  return (
    <div className="long-page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {isDiscover ? "UC23 · THÀNH VIÊN" : "UC26 · THÀNH VIÊN"}
          </span>
          <h1>{isDiscover ? "Khám phá lớp học" : "Lịch học của tôi"}</h1>
          <p>
            {isDiscover
              ? "Xem các lớp đang mở, buổi sắp tới, huấn luyện viên, phòng và số chỗ còn lại."
              : "Theo dõi toàn bộ đăng ký của bạn, kể cả buổi hoặc đăng ký đã hủy."}
          </p>
        </div>
        <span className="page-icon">
          {isDiscover ? (
            <Compass size={26} aria-hidden="true" />
          ) : (
            <CalendarCheck size={26} aria-hidden="true" />
          )}
        </span>
      </div>

      <div className="long-section-tabs" aria-label="Điều hướng lớp học">
        <Link
          className={`button ${isDiscover ? "primary" : "secondary"}`}
          to="/member/classes"
        >
          Khám phá lớp
        </Link>
        <Link
          className={`button ${isDiscover ? "secondary" : "primary"}`}
          to="/member/class-schedule"
        >
          Lịch của tôi
        </Link>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          <span>{error}</span>
          <button type="button" className="button secondary" onClick={refresh}>
            Thử lại
          </button>
        </div>
      )}

      {isDiscover ? (
        <section className="panel" aria-labelledby="member-classes-title">
          <div className="panel-heading">
            <div>
              <h2 id="member-classes-title">Lớp đang nhận đăng ký</h2>
              <p>{visibleClasses.length} lớp có buổi học sắp tới.</p>
            </div>
          </div>
          <div className="toolbar">
            <label className="long-search-field">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên lớp hoặc bộ môn..."
              />
            </label>
            <select
              aria-label="Lọc lớp theo bộ môn"
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
              aria-label="Lọc lớp theo huấn luyện viên"
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
          </div>

          {isLoading ? (
            <div className="empty-state" role="status">
              <p>Đang tải lớp học...</p>
            </div>
          ) : visibleClasses.length ? (
            <div className="member-class-grid">
              {visibleClasses.map((item) => {
                const classSessions = sessions.filter(
                  (session) => session.classId === item.id,
                );
                return (
                  <article className="member-class-card" key={item.id}>
                    <header>
                      <div>
                        <span className="eyebrow">{item.sportName}</span>
                        <h2>{item.name}</h2>
                      </div>
                      <span className="status-chip active">
                        {classStatusLabels[item.status]}
                      </span>
                    </header>
                    <p>{item.description || "Chưa có mô tả cho lớp học này."}</p>
                    <div className="member-class-meta">
                      <span>
                        <Users size={15} aria-hidden="true" /> Tối đa {item.capacity}
                        người
                      </span>
                      <span>
                        <CalendarDays size={15} aria-hidden="true" /> {classSessions.length}
                        buổi sắp tới
                      </span>
                    </div>
                    <div className="member-session-stack">
                      {classSessions.map((session) => (
                        <section className="member-session-card" key={session.id}>
                          <div className="member-session-heading">
                            <strong>{formatDate(session.date)}</strong>
                            <span>{formatTimeRange(session.startTime, session.endTime)}</span>
                          </div>
                          <div className="member-session-details">
                            <span>
                              <UserRound size={14} aria-hidden="true" /> {session.coachName}
                            </span>
                            <span>
                              <MapPin size={14} aria-hidden="true" /> {session.roomName}
                            </span>
                            <span>
                              <Users size={14} aria-hidden="true" /> {remainingSeats(session)}
                              /{session.capacity} chỗ trống
                            </span>
                          </div>
                          <SessionRegistrationPanel
                            session={session}
                            registration={registrationFor(registrations, session.id)}
                            onChanged={refresh}
                          />
                        </section>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <Compass size={34} aria-hidden="true" />
              <h3>Không có lớp phù hợp</h3>
              <p>Thử đổi bộ lọc hoặc quay lại khi trung tâm mở lịch mới.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="panel" aria-labelledby="my-schedule-title">
          <div className="panel-heading">
            <div>
              <h2 id="my-schedule-title">Các buổi đã đăng ký</h2>
              <p>{registrations.length} đăng ký, bao gồm lịch sử đã hủy.</p>
            </div>
            <div className="long-view-actions">
              <div className="segmented-control" aria-label="Chế độ xem lịch cá nhân">
                <button
                  type="button"
                  className={scheduleMode === "LIST" ? "is-active" : ""}
                  onClick={() => setScheduleMode("LIST")}
                >
                  Danh sách
                </button>
                <button
                  type="button"
                  className={scheduleMode === "WEEK" ? "is-active" : ""}
                  onClick={() => setScheduleMode("WEEK")}
                >
                  Tuần
                </button>
              </div>
              {scheduleMode === "WEEK" && (
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
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state" role="status">
              <p>Đang tải lịch học của bạn...</p>
            </div>
          ) : registrations.length ? (
            scheduleMode === "WEEK" ? (
              <div className="week-grid">
                {weekDays.map((day) => (
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
                        {day.items.map((registration) => (
                          <li className="week-session" key={registration.id}>
                            <div className="week-session-time">
                              <Clock3 size={14} aria-hidden="true" />
                              {formatTimeRange(
                                registration.session.startTime,
                                registration.session.endTime,
                              )}
                            </div>
                            <div className="week-session-title">
                              <strong>{registration.session.className}</strong>
                              <span>{registration.session.coachName}</span>
                              <span>{registration.session.roomName}</span>
                            </div>
                            <span
                              className={`status-chip ${registration.status === "BOOKED" ? "active" : "canceled"}`}
                            >
                              {registration.status === "BOOKED"
                                ? sessionStatusLabels[registration.session.status]
                                : "Đã hủy đăng ký"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="week-day-empty">Không có lịch.</p>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="member-registration-list">
                {registrations.map((registration) => (
                  <article className="member-registration-card" key={registration.id}>
                    <div className="member-registration-main">
                      <div>
                        <span className="eyebrow">{registration.session.sportName}</span>
                        <h2>{registration.session.className}</h2>
                      </div>
                      <span
                        className={`status-chip ${registration.status === "BOOKED" ? "active" : "canceled"}`}
                      >
                        {registration.status === "BOOKED"
                          ? sessionStatusLabels[registration.session.status]
                          : "Đã hủy đăng ký"}
                      </span>
                    </div>
                    <div className="member-session-details">
                      <span>
                        <CalendarDays size={15} aria-hidden="true" /> {formatDate(registration.session.date)}
                      </span>
                      <span>
                        <Clock3 size={15} aria-hidden="true" /> {formatTimeRange(registration.session.startTime, registration.session.endTime)}
                      </span>
                      <span>
                        <UserRound size={15} aria-hidden="true" /> {registration.session.coachName}
                      </span>
                      <span>
                        <MapPin size={15} aria-hidden="true" /> {registration.session.roomName}
                      </span>
                    </div>
                    {registration.cancelReason && (
                      <p className="member-cancel-reason">
                        Lý do hủy: {registration.cancelReason}
                      </p>
                    )}
                    {registration.status === "BOOKED" && (
                      <SessionRegistrationPanel
                        session={registration.session}
                        registration={registration}
                        onChanged={refresh}
                        layout="inline"
                      />
                    )}
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="empty-state" role="status">
              <CalendarCheck size={34} aria-hidden="true" />
              <h3>Bạn chưa đăng ký buổi học nào</h3>
              <p>Khám phá lớp đang mở để bắt đầu lịch tập của mình.</p>
              <Link className="button primary" to="/member/classes">
                Khám phá lớp học
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
