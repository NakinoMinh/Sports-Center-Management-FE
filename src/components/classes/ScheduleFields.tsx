import { useId } from "react";
import {
  CENTER_TIME_SLOTS,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT_NAMES,
  centerToday,
  countRecurrenceSessions,
  isCoachSuitableForSport,
} from "../../utils/classSchedule";
import type { ScheduleDraft } from "./scheduleDraft";
import type { CoachOption, Room, WeekDay } from "../../types/classes";

/**
 * Khối lịch học dùng chung cho hai chỗ: tạo lớp (UC19) và gán thêm đợt lịch cho
 * lớp đã có (UC21). Một lớp luôn có giáo viên đứng lớp, phòng, ngày bắt đầu,
 * ngày kết thúc, các thứ trong tuần và một ca học — nên hai luồng dùng đúng một
 * bộ trường, không nơi nào thiếu trường so với nơi kia.
 */

interface ScheduleFieldsProps {
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
  coaches: readonly CoachOption[];
  rooms: readonly Room[];
  /** Tên bộ môn của lớp, để đánh dấu HLV khác chuyên môn. */
  sportName?: string;
  /** Sức chứa lớp — trần cho sức chứa từng buổi. */
  classCapacity?: number;
  messageFor: (field: string) => string | undefined;
}

export function ScheduleFields({
  value,
  onChange,
  coaches,
  rooms,
  sportName,
  classCapacity,
  messageFor,
}: ScheduleFieldsProps) {
  const prefix = useId();
  const today = centerToday();
  const selectedRoom = rooms.find((room) => room.id === value.roomId);
  const sessionCount = countRecurrenceSessions(
    value.startDate,
    value.endDate,
    value.daysOfWeek,
  );

  const patch = (changes: Partial<ScheduleDraft>) =>
    onChange({ ...value, ...changes });

  const toggleDay = (day: WeekDay) =>
    patch({
      daysOfWeek: value.daysOfWeek.includes(day)
        ? value.daysOfWeek.filter((item) => item !== day)
        : [...value.daysOfWeek, day],
    });

  // HLV đã ngừng hoạt động không nhận lớp mới; HLV khác chuyên môn vẫn hiện
  // nhưng được đánh dấu, vì server mới là nơi chốt theo dữ liệu chuyên môn.
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
                  {matched ? "" : ` (khác chuyên môn${sportName ? ` ${sportName}` : ""})`}
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

        <div className="field field-full">
          <span className="field-label">
            Các thứ trong tuần <span aria-hidden="true">*</span>
          </span>
          <div
            className="checkbox-row"
            role="group"
            aria-label="Các thứ trong tuần có buổi học"
            aria-describedby={
              messageFor("daysOfWeek") ? `${prefix}-days-error` : undefined
            }
          >
            {WEEKDAY_ORDER.map((day) => (
              <label key={day} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={value.daysOfWeek.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                <span title={WEEKDAY_NAMES[day]}>
                  {WEEKDAY_SHORT_NAMES[day]}
                </span>
              </label>
            ))}
          </div>
          {messageFor("daysOfWeek") && (
            <small className="form-error" id={`${prefix}-days-error`}>
              {messageFor("daysOfWeek")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-slot`}>
            Ca học <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-slot`}
            value={value.slotId}
            onChange={(event) => patch({ slotId: event.target.value })}
            aria-invalid={Boolean(messageFor("slotId"))}
            aria-describedby={
              messageFor("slotId") ? `${prefix}-slot-error` : undefined
            }
          >
            <option value="">— Chọn ca học —</option>
            {CENTER_TIME_SLOTS.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name} · {slot.startTime}–{slot.endTime}
              </option>
            ))}
          </select>
          {messageFor("slotId") && (
            <small className="form-error" id={`${prefix}-slot-error`}>
              {messageFor("slotId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-session-capacity`}>Sức chứa mỗi buổi</label>
          <input
            id={`${prefix}-session-capacity`}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.min(
              classCapacity || 200,
              selectedRoom?.capacity ?? 200,
            )}
            step={1}
            value={value.sessionCapacity}
            onChange={(event) => patch({ sessionCapacity: event.target.value })}
            placeholder={classCapacity ? String(classCapacity) : "Theo sức chứa lớp"}
            aria-invalid={Boolean(messageFor("sessionCapacity"))}
            aria-describedby={`${prefix}-session-capacity-help${
              messageFor("sessionCapacity")
                ? ` ${prefix}-session-capacity-error`
                : ""
            }`}
          />
          <small id={`${prefix}-session-capacity-help`}>
            Bỏ trống để dùng sức chứa lớp
            {selectedRoom ? `; phòng ${selectedRoom.name} chứa tối đa ${selectedRoom.capacity} chỗ.` : "."}
          </small>
          {messageFor("sessionCapacity") && (
            <small
              className="form-error"
              id={`${prefix}-session-capacity-error`}
            >
              {messageFor("sessionCapacity")}
            </small>
          )}
        </div>

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

      <p className="form-hint" aria-live="polite">
        {sessionCount > 0
          ? `Lịch này sinh ra ${sessionCount} buổi học.`
          : "Chọn khoảng ngày và các thứ để xem số buổi sẽ được tạo."}
      </p>
    </fieldset>
  );
}
