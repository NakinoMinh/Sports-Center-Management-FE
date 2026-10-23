import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  RefreshCw,
  Users,
} from "lucide-react";
import { SessionRegistrationPanel } from "./SessionRegistrationPanel";
import { SlotFilterBar } from "./SlotFilterBar";
import { classApi } from "../../services/classApi";
import { describeError } from "../../services/apiErrors";
import {
  CENTER_TIME_SLOTS,
  addCalendarDays,
  centerToday,
  classStatusLabels,
  formatSlotLabel,
  isClassBookable,
  matchesTimeSlot,
  remainingSeats,
  sessionStatusLabels,
} from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";
import type {
  ClassRegistration,
  ClassSession,
  SessionMemberOption,
  TrainingClass,
} from "../../types/classes";

interface CounterClassBookingProps {
  /** Thành viên đang được hỗ trợ; null khi lễ tân chưa chọn ai. */
  member: SessionMemberOption | null;
}

/**
 * Đăng ký và hủy lớp theo Khung giờ (Slot) tại quầy — UC29.
 *
 * Mọi thao tác đi qua `classApi`, dùng đúng component đăng ký của thành viên
 * (`SessionRegistrationPanel`) để luật UC24 và UC25 chỉ tồn tại ở một chỗ.
 */
export function CounterClassBooking({ member }: CounterClassBookingProps) {
  const [date, setDate] = useState(centerToday());
  const [slotFilter, setSlotFilter] = useState("ALL");
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const effectiveMember = member;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionList, classList] = await Promise.all([
        classApi.listSessions({ from: date, to: date, status: "SCHEDULED" }),
        classApi.listClasses(),
      ]);
      setSessions(sessionList);
      setClasses(classList);
      setRegistrations(
        effectiveMember
          ? await classApi.listMemberRegistrations(effectiveMember.id, true)
          : [],
      );
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [date, effectiveMember]);

  useEffect(() => {
    // Hoãn một nhịp như các trang khác trong repo: gọi setState đồng bộ ngay
    // trong effect làm React dựng lại ngay lần render đầu.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const filteredSessions = useMemo(
    () => sessions.filter((item) => matchesTimeSlot(item, slotFilter)),
    [sessions, slotFilter],
  );

  /** Đăng ký còn hiệu lực của thành viên này, tra theo buổi học. */
  const activeBySession = useMemo(() => {
    const map = new Map<string, ClassRegistration>();
    for (const item of registrations)
      if (item.status === "BOOKED") map.set(item.sessionId, item);
    return map;
  }, [registrations]);

  return (
    <>
      <section className="panel" aria-labelledby="counter-class-title">
        <div className="panel-heading">
          <div>
            <h2 id="counter-class-title">
              Lịch lớp học theo Khung giờ (Slot)
            </h2>
            <p>
              Các lớp tổ chức theo khung giờ (Slot) cố định có Huấn luyện viên
              quản lý tại phòng tập (không có giờ tự do). Gói tập phải còn hiệu
              lực vào ngày diễn ra buổi học.
            </p>
          </div>
          <div className="counter-class-toolbar">
            <label className="field" htmlFor="counter-class-date">
              <span>Ngày học</span>
              <input
                id="counter-class-date"
                type="date"
                value={date}
                min={centerToday()}
                max={addCalendarDays(centerToday(), 60)}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="counter-class-slot">
              <span>Khung giờ (Slot)</span>
              <select
                id="counter-class-slot"
                value={slotFilter}
                onChange={(event) => setSlotFilter(event.target.value)}
              >
                <option value="ALL">Tất cả khung giờ</option>
                {CENTER_TIME_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name} · {slot.startTime} – {slot.endTime}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} aria-hidden="true" /> Làm mới
            </button>
          </div>
        </div>

        <SlotFilterBar
          sessions={sessions}
          selectedSlotId={slotFilter}
          onSelectSlot={setSlotFilter}
        />

        {error && (
          <div className="error-notice" role="alert">
            {error}
            <button
              type="button"
              className="button secondary"
              onClick={() => void refresh()}
            >
              Tải lại
            </button>
          </div>
        )}

        {!member && (
          <p className="info-note">
            Chọn thành viên ở trên để đăng ký hoặc hủy lớp thay cho họ.
          </p>
        )}

        {isLoading && !hasLoaded ? (
          <div className="empty-state" role="status">
            Đang tải lịch lớp học…
          </div>
        ) : filteredSessions.length ? (
          <div className="reception-class-grid">
            {filteredSessions.map((session) => {
              const registration = activeBySession.get(session.id) ?? null;
              const owner = classes.find((item) => item.id === session.classId);
              const isBookable = !owner || isClassBookable(owner.status);
              return (
                <article className="reception-class-card" key={session.id}>
                  <span className="eyebrow">
                    {session.sportName} · Phòng: {session.roomName}
                  </span>
                  <h3>{session.className}</h3>
                  <p>
                    <Clock3 size={14} aria-hidden="true" />{" "}
                    {formatDate(session.date)} ·{" "}
                    {formatSlotLabel(session.startTime, session.endTime)}
                  </p>
                  <p>HLV quản lý: {session.coachName}</p>
                  <span
                    className={`status-chip ${remainingSeats(session) > 0 ? "active" : "expired"}`}
                  >
                    Còn {remainingSeats(session)} / {session.capacity} chỗ
                  </span>
                  {isBookable || registration ? (
                    <SessionRegistrationPanel
                      session={session}
                      registration={registration}
                      channel="RECEPTIONIST"
                      onBehalfOf={effectiveMember}
                      onChanged={refresh}
                      layout="inline"
                    />
                  ) : (
                    <p className="session-registration-reason">
                      Lớp “{owner?.name}” (trạng thái:{" "}
                      {classStatusLabels[owner?.status ?? "DRAFT"]}) chưa nhận
                      đăng ký mới.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <CalendarDays size={36} aria-hidden="true" />
            <h3>Chưa có buổi học trong ngày/khung giờ này</h3>
            <p>Chọn ngày hoặc khung giờ (Slot) khác để tra cứu lịch lớp.</p>
          </div>
        )}
      </section>

      <section
        className="panel reception-history"
        aria-labelledby="counter-class-history"
      >
        <div className="panel-heading">
          <div>
            <h2 id="counter-class-history">
              Đăng ký lớp{" "}
              {effectiveMember ? `· ${effectiveMember.fullName}` : ""}
            </h2>
            <p>Giữ cả lịch sử đã hủy kèm người thao tác và lý do.</p>
          </div>
          <span className="count-badge">{registrations.length} đăng ký</span>
        </div>

        {registrations.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Buổi học & Khung giờ (Slot)</th>
                  <th scope="col">Nguồn đăng ký</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.session.className}</strong>
                      <small className="cell-caption">
                        {formatDate(item.session.date)} ·{" "}
                        {formatSlotLabel(
                          item.session.startTime,
                          item.session.endTime,
                        )}{" "}
                        · Phòng: {item.session.roomName} · HLV:{" "}
                        {item.session.coachName}
                      </small>
                      {item.session.status !== "SCHEDULED" && (
                        <small className="cell-caption">
                          Buổi học: {sessionStatusLabels[item.session.status]}
                        </small>
                      )}
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
                          Lý do: {item.cancelReason}
                        </small>
                      )}
                      {item.canceledByName && (
                        <small className="cell-caption">
                          Người hủy: {item.canceledByName}
                        </small>
                      )}
                    </td>
                    <td>
                      {item.status === "BOOKED" ? (
                        <SessionRegistrationPanel
                          session={item.session}
                          registration={item}
                          channel="RECEPTIONIST"
                          onBehalfOf={effectiveMember}
                          onChanged={refresh}
                          layout="inline"
                        />
                      ) : (
                        <span className="cell-caption">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={32} aria-hidden="true" />
            <p>
              {effectiveMember
                ? "Thành viên này chưa có đăng ký lớp nào."
                : "Chọn thành viên để xem đăng ký lớp của họ."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
