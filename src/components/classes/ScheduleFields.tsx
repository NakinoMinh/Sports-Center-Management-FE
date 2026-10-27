import { useId } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import {
  CENTER_TIME_SLOTS,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT_NAMES,
  centerToday,
  countRecurrenceSessions,
  isCoachSuitableForSport,
  timeRangesOverlap,
} from "../../utils/classSchedule";
import {
  createEmptySessionItem,
  type ScheduleDraft,
  type ScheduleSessionItem,
} from "./scheduleDraft";
import type { CoachOption, Room, WeekDay } from "../../types/classes";

/**
 * Khối lịch học: tạo lớp (UC19) và gán thêm đợt lịch cho lớp đã có (UC21).
 * Hỗ trợ tạo nhiều buổi học với ca học và các thứ trong tuần khác nhau.
 * Sức chứa mỗi buổi tự động dựa theo sức chứa lớp nên đã bỏ ô sức chứa buổi.
 */

interface ScheduleFieldsProps {
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
  coaches: readonly CoachOption[];
  rooms: readonly Room[];
  /** Tên bộ môn của lớp, để đánh dấu HLV khác chuyên môn. */
  sportName?: string;
  /** Sức chứa lớp */
  classCapacity?: number;
  messageFor: (field: string) => string | undefined;
}

export function ScheduleFields({
  value,
  onChange,
  coaches,
  rooms,
  sportName,
  classCapacity: _classCapacity,
  messageFor,
}: ScheduleFieldsProps) {
  const prefix = useId();
  const today = centerToday();
  const selectedRoom = rooms.find((room) => room.id === value.roomId);

  const sessions: ScheduleSessionItem[] =
    value.sessions && value.sessions.length > 0
      ? value.sessions
      : [createEmptySessionItem()];

  const totalSessionCount = sessions.reduce((acc, sess) => {
    return (
      acc +
      countRecurrenceSessions(value.startDate, value.endDate, sess.daysOfWeek)
    );
  }, 0);

  const patch = (changes: Partial<ScheduleDraft>) =>
    onChange({ ...value, ...changes });

  const patchSessions = (nextSessions: ScheduleSessionItem[]) => {
    patch({
      sessions: nextSessions,
      slotId: nextSessions[0]?.slotId ?? "",
      daysOfWeek: nextSessions[0]?.daysOfWeek ?? [],
    });
  };

  /**
   * Kiểm tra xem thứ `day` có bị trùng khung giờ với bất kỳ buổi học nào khác không.
   */
  const checkConflict = (
    day: WeekDay,
    currentSlotId: string,
    sessionIndex: number,
  ) => {
    if (!currentSlotId) return { conflict: false };
    const currentSlot = CENTER_TIME_SLOTS.find((s) => s.id === currentSlotId);
    if (!currentSlot) return { conflict: false };

    for (let i = 0; i < sessions.length; i++) {
      if (i === sessionIndex) continue;
      const other = sessions[i];
      if (!other.slotId || !other.daysOfWeek.includes(day)) continue;

      const otherSlot = CENTER_TIME_SLOTS.find((s) => s.id === other.slotId);
      if (!otherSlot) continue;

      if (
        currentSlot.id === otherSlot.id ||
        timeRangesOverlap(currentSlot, otherSlot)
      ) {
        return {
          conflict: true,
          conflictingSessionIndex: i + 1,
          conflictingSlotName: otherSlot.name,
        };
      }
    }
    return { conflict: false };
  };

  const updateSessionSlot = (index: number, nextSlotId: string) => {
    const nextSessions = sessions.map((sess, i) => {
      if (i !== index) return sess;
      // Khi chọn ca học mới, tự động bỏ chọn các thứ bị trùng khung giờ với buổi khác
      const validDays = sess.daysOfWeek.filter((day) => {
        const conflict = checkConflict(day, nextSlotId, index);
        return !conflict.conflict;
      });
      return {
        ...sess,
        slotId: nextSlotId,
        daysOfWeek: validDays,
      };
    });
    patchSessions(nextSessions);
  };

  const toggleDayInSession = (index: number, day: WeekDay) => {
    const nextSessions = sessions.map((sess, i) => {
      if (i !== index) return sess;
      const isChecked = sess.daysOfWeek.includes(day);
      return {
        ...sess,
        daysOfWeek: isChecked
          ? sess.daysOfWeek.filter((item) => item !== day)
          : [...sess.daysOfWeek, day],
      };
    });
    patchSessions(nextSessions);
  };

  const addSession = () => {
    patchSessions([...sessions, createEmptySessionItem()]);
  };

  const removeSession = (index: number) => {
    if (sessions.length <= 1) return;
    patchSessions(sessions.filter((_, i) => i !== index));
  };

  const getSessionError = (index: number, field: string) => {
    return (
      messageFor(`sessions[${index}].${field}`) ||
      (sessions.length === 1 ? messageFor(field) : undefined)
    );
  };

  const selectableCoaches = coaches.filter((coach) => coach.isActive);
  const selectableRooms = rooms.filter((room) => room.isActive);

  return (
    <fieldset className="field-group">
      <legend>Lịch học</legend>
      <p className="form-hint">
        Lớp được tạo kèm lịch: toàn bộ buổi học sinh ra ngay và hiện trên lịch
        trung tâm. Thành viên đăng ký cả lớp, không chọn từng buổi.
      </p>

      <div className="field-grid">
        <div className="field">
          <label htmlFor={`${prefix}-coach`}>
            Giáo viên đứng lớp <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-coach`}
            value={value.coachId}
            onChange={(event) => patch({ coachId: event.target.value })}
            aria-invalid={Boolean(messageFor("coachId"))}
            aria-describedby={
              messageFor("coachId") ? `${prefix}-coach-error` : undefined
            }
          >
            <option value="">— Chọn giáo viên —</option>
            {selectableCoaches.map((coach) => {
              const matched = isCoachSuitableForSport(coach, sportName);
              return (
                <option key={coach.id} value={coach.id}>
                  {coach.fullName}
                  {matched
                    ? ""
                    : ` (khác chuyên môn${sportName ? ` ${sportName}` : ""})`}
                </option>
              );
            })}
          </select>
          {messageFor("coachId") && (
            <small className="form-error" id={`${prefix}-coach-error`}>
              {messageFor("coachId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-room`}>
            Phòng tập <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-room`}
            value={value.roomId}
            onChange={(event) => patch({ roomId: event.target.value })}
            aria-invalid={Boolean(messageFor("roomId"))}
            aria-describedby={
              messageFor("roomId") ? `${prefix}-room-error` : undefined
            }
          >
            <option value="">— Chọn phòng —</option>
            {selectableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · {room.capacity} chỗ
              </option>
            ))}
          </select>
          {messageFor("roomId") && (
            <small className="form-error" id={`${prefix}-room-error`}>
              {messageFor("roomId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-start-date`}>
            Ngày bắt đầu <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-start-date`}
            type="date"
            min={today}
            value={value.startDate}
            onChange={(event) => patch({ startDate: event.target.value })}
            aria-invalid={Boolean(messageFor("startDate"))}
            aria-describedby={
              messageFor("startDate") ? `${prefix}-start-date-error` : undefined
            }
          />
          {messageFor("startDate") && (
            <small className="form-error" id={`${prefix}-start-date-error`}>
              {messageFor("startDate")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-end-date`}>
            Ngày kết thúc <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-end-date`}
            type="date"
            min={value.startDate || today}
            value={value.endDate}
            onChange={(event) => patch({ endDate: event.target.value })}
            aria-invalid={Boolean(messageFor("endDate"))}
            aria-describedby={
              messageFor("endDate") ? `${prefix}-end-date-error` : undefined
            }
          />
          {messageFor("endDate") && (
            <small className="form-error" id={`${prefix}-end-date-error`}>
              {messageFor("endDate")}
            </small>
          )}
        </div>
      </div>

      <div className="field-full" style={{ marginTop: "8px" }}>
        <div className="field-label" style={{ fontWeight: 600, marginBottom: "8px" }}>
          Các buổi học trong tuần <span aria-hidden="true">*</span>
        </div>

        <div className="schedule-sessions-container">
          {sessions.map((session, index) => {
            const sessionCount = countRecurrenceSessions(
              value.startDate,
              value.endDate,
              session.daysOfWeek,
            );

            return (
              <div key={session.id || index} className="schedule-session-card">
                <div className="schedule-session-header">
                  <div className="schedule-session-title">
                    <Clock size={15} aria-hidden="true" />
                    <span>Buổi học #{index + 1}</span>
                    {sessionCount > 0 && (
                      <span className="schedule-session-badge">
                        {sessionCount} buổi
                      </span>
                    )}
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-session"
                      onClick={() => removeSession(index)}
                      title={`Xóa buổi học #${index + 1}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label htmlFor={`${prefix}-slot-${index}`}>
                      Ca học <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id={`${prefix}-slot-${index}`}
                      value={session.slotId}
                      onChange={(event) =>
                        updateSessionSlot(index, event.target.value)
                      }
                      aria-invalid={Boolean(getSessionError(index, "slotId"))}
                    >
                      <option value="">— Chọn ca học —</option>
                      {CENTER_TIME_SLOTS.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.name} · {slot.startTime}–{slot.endTime}
                        </option>
                      ))}
                    </select>
                    {getSessionError(index, "slotId") && (
                      <small className="form-error">
                        {getSessionError(index, "slotId")}
                      </small>
                    )}
                  </div>

                  <div className="field field-full">
                    <span className="field-label">
                      Các thứ trong tuần <span aria-hidden="true">*</span>
                    </span>
                    <div
                      className="checkbox-row"
                      role="group"
                      aria-label={`Các thứ trong tuần cho buổi học ${index + 1}`}
                    >
                      {WEEKDAY_ORDER.map((day) => {
                        const conflict = checkConflict(day, session.slotId, index);
                        const isChecked = session.daysOfWeek.includes(day);
                        const isDisabled = conflict.conflict;

                        return (
                          <label
                            key={day}
                            className={`checkbox-chip${isDisabled ? " is-disabled" : ""}`}
                            title={
                              isDisabled
                                ? `Thứ này đã có ở Buổi ${conflict.conflictingSessionIndex} (${conflict.conflictingSlotName}) cùng khung giờ`
                                : WEEKDAY_NAMES[day]
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isDisabled}
                              onChange={() => toggleDayInSession(index, day)}
                            />
                            <span>{WEEKDAY_SHORT_NAMES[day]}</span>
                          </label>
                        );
                      })}
                    </div>
                    {getSessionError(index, "daysOfWeek") && (
                      <small className="form-error">
                        {getSessionError(index, "daysOfWeek")}
                      </small>
                    )}
                    {getSessionError(index, "conflict") && (
                      <small className="form-error">
                        {getSessionError(index, "conflict")}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn-add-session"
            onClick={addSession}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Thêm buổi học</span>
          </button>
        </div>

        {messageFor("scheduleConflict") && (
          <small className="form-error" style={{ display: "block", marginTop: "4px" }}>
            {messageFor("scheduleConflict")}
          </small>
        )}
      </div>

      <div className="field-grid" style={{ marginTop: "8px" }}>
        <div className="field field-full">
          <label htmlFor={`${prefix}-notes`}>Ghi chú cho buổi học</label>
          <input
            id={`${prefix}-notes`}
            value={value.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            placeholder="Mang theo thảm tập, đến trước 10 phút…"
            maxLength={500}
          />
        </div>
      </div>

      <p className="form-hint" aria-live="polite" style={{ marginTop: "12px" }}>
        {totalSessionCount > 0
          ? `Lịch này sinh ra tổng cộng ${totalSessionCount} buổi học trên lịch trung tâm.`
          : "Chọn khoảng ngày, ca học và các thứ để xem số buổi sẽ được tạo."}
        {selectedRoom
          ? ` Phòng tập: ${selectedRoom.name} (${selectedRoom.capacity} chỗ).`
          : ""}
      </p>
    </fieldset>
  );
}
