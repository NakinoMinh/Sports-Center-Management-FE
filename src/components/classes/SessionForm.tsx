import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Clock3, Save, ShieldCheck } from "lucide-react";
import * as v from "../../utils/validation";
import {
  CENTER_TIME_SLOTS,
  centerToday,
  describeCapacityConflict,
  findTimeSlot,
  getCoachSlotAvailability,
  getRoomSlotAvailability,
  isCoachSuitableForSport,
  minutesOfDay,
} from "../../utils/classSchedule";
import type {
  ClassSession,
  ClassSessionInput,
  CoachOption,
  Room,
  TrainingClass,
} from "../../types/classes";

interface SessionFormProps {
  initialValues?: ClassSessionInput;
  classes: readonly TrainingClass[];
  coaches: readonly CoachOption[];
  rooms: readonly Room[];
  /** Các buổi học hiện có để kiểm tra sớm trùng phòng / trùng HLV theo slot. */
  existingSessions?: readonly ClassSession[];
  /** ID buổi đang sửa (để loại trừ chính nó khi kiểm tra trùng giờ). */
  editingSessionId?: string;
  /** Cố định lớp khi form được mở từ một lớp cụ thể. */
  lockedClassId?: string;
  /** Số người đã đăng ký buổi đang sửa; 0 khi tạo mới. */
  bookedCount?: number;
  onSubmit: (values: ClassSessionInput) => void;
  onCancel: () => void;
  error?: string;
  fieldErrors?: Record<string, string>;
  isSaving?: boolean;
}

const DEFAULT_SLOT = CENTER_TIME_SLOTS[1]; // Ca 2 (Sáng) · 08:00 – 09:00

/**
 * Form lập và sửa buổi học theo Khung giờ (Slot) có sẵn (UC21).
 *
 * Trung tâm vận hành theo mô hình lớp học theo Slot cố định có Huấn luyện viên
 * quản lý và Phòng tập chỉ định (không có giờ tập tự do). Form chỉ cho phép chọn
 * từ danh sách khung giờ có sẵn, lọc/đánh dấu phòng tập còn trống và huấn luyện
 * viên đúng chuyên môn bộ môn của lớp.
 */
export function SessionForm({
  initialValues,
  classes,
  coaches,
  rooms,
  existingSessions = [],
  editingSessionId,
  lockedClassId,
  bookedCount = 0,
  onSubmit,
  onCancel,
  error,
  fieldErrors,
  isSaving = false,
}: SessionFormProps) {
  const prefix = useId();
  const [classId, setClassId] = useState(
    initialValues?.classId ?? lockedClassId ?? "",
  );
  const [coachId, setCoachId] = useState(initialValues?.coachId ?? "");
  const [roomId, setRoomId] = useState(initialValues?.roomId ?? "");
  const [date, setDate] = useState(initialValues?.date ?? centerToday());
  const [startTime, setStartTime] = useState(
    initialValues?.startTime ?? DEFAULT_SLOT.startTime,
  );
  const [endTime, setEndTime] = useState(
    initialValues?.endTime ?? DEFAULT_SLOT.endTime,
  );
  const [capacity, setCapacity] = useState(
    initialValues ? String(initialValues.capacity) : "",
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageFor = (field: string): string | undefined =>
    errors[field] ?? fieldErrors?.[field];

  const selectedClass = classes.find((item) => item.id === classId);
  const selectedRoom = rooms.find((item) => item.id === roomId);
  const matchedSlot = findTimeSlot(startTime, endTime);
  const selectedSlotId = matchedSlot?.id ?? "CUSTOM";

  // Giữ lại Coach/phòng đã gán trước đó dù nay ngừng hoạt động, để sửa giờ của
  // một buổi cũ không bị chặn chỉ vì danh mục đã thay đổi.
  const selectableCoaches = coaches.filter(
    (coach) => coach.isActive || coach.id === initialValues?.coachId,
  );
  const selectableRooms = rooms.filter(
    (room) => room.isActive || room.id === initialValues?.roomId,
  );
  const capacityCeiling = Math.min(
    selectedClass?.capacity ?? 200,
    selectedRoom?.capacity ?? 200,
  );

  function handleSelectSlot(slotId: string) {
    const slot = CENTER_TIME_SLOTS.find((item) => item.id === slotId);
    if (slot) {
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
    } else if (initialValues) {
      setStartTime(initialValues.startTime);
      setEndTime(initialValues.endTime);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = v.validateForm(
      { classId, coachId, roomId, date, startTime, endTime, capacity, notes },
      {
        classId: v.selected("lớp học"),
        coachId: v.selected("huấn luyện viên"),
        roomId: v.selected("phòng tập"),
        date: v.required("Ngày học"),
        startTime: v.required("Khung giờ bắt đầu"),
        endTime: v.required("Khung giờ kết thúc"),
        capacity: v.positiveInteger("Sức chứa buổi học", {
          min: Math.max(1, bookedCount),
          max: 200,
        }),
        notes: v.text("Ghi chú", 500),
      },
    ) as Record<string, string>;

    const start = minutesOfDay(startTime);
    const end = minutesOfDay(endTime);
    if (start !== null && end !== null && start >= end)
      nextErrors.endTime = "Giờ kết thúc phải sau giờ bắt đầu.";
    if (date && date < centerToday())
      nextErrors.date = "Không lập buổi học cho ngày đã qua.";

    const chosenCoach = coaches.find((item) => item.id === coachId);
    if (chosenCoach && selectedClass && !nextErrors.coachId) {
      if (
        initialValues?.coachId !== coachId &&
        !isCoachSuitableForSport(chosenCoach, selectedClass.sportName)
      ) {
        nextErrors.coachId = `Huấn luyện viên ${chosenCoach.fullName} không phụ trách bộ môn ${selectedClass.sportName}. Hãy chọn huấn luyện viên phù hợp.`;
      } else {
        const coachAvail = getCoachSlotAvailability(chosenCoach, {
          sportName: selectedClass.sportName,
          date,
          startTime,
          endTime,
          sessions: existingSessions,
          excludeSessionId: editingSessionId,
        });
        if (!coachAvail.isTimeFree) {
          nextErrors.coachId = `Huấn luyện viên đã có lịch dạy trong khung giờ này (${coachAvail.reason}).`;
        }
      }
    }

    if (selectedRoom && !nextErrors.roomId) {
      const roomAvail = getRoomSlotAvailability(selectedRoom, {
        date,
        startTime,
        endTime,
        sessions: existingSessions,
        excludeSessionId: editingSessionId,
      });
      if (!roomAvail.isTimeFree) {
        nextErrors.roomId = `Phòng tập đã có lớp trong khung giờ này (${roomAvail.reason}).`;
      }
    }

    const capacityProblem =
      selectedClass && selectedRoom
        ? describeCapacityConflict({
            capacity: Number(capacity),
            classCapacity: selectedClass.capacity,
            roomCapacity: selectedRoom.capacity,
            bookedCount,
          })
        : null;
    if (capacityProblem && !nextErrors.capacity)
      nextErrors.capacity = capacityProblem;

    setErrors(nextErrors);
    if (v.hasErrors(nextErrors)) return;
    onSubmit({
      classId,
      coachId,
      roomId,
      date,
      startTime,
      endTime,
      capacity: Number(capacity),
      notes: notes.trim(),
    });
  }

  const slotError = messageFor("startTime") ?? messageFor("endTime");

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="info-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          <strong>Quy định xếp lớp:</strong> Mọi buổi tập đều mở theo{" "}
          <strong>Khung giờ (Slot) có sẵn</strong>, gắn với{" "}
          <strong>Phòng tập</strong> và <strong>Huấn luyện viên đúng chuyên môn</strong>{" "}
          trực tiếp quản lý — trung tâm không tổ chức giờ tập tự do.
        </span>
      </p>
      {bookedCount > 0 && (
        <p className="info-note">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Buổi học đã có <strong>{bookedCount}</strong> người đăng ký. Đổi
            ngày hoặc khung giờ sẽ được kiểm tra lại quyền tham gia của từng học
            viên; nếu có người không còn hợp lệ, hệ thống từ chối toàn bộ thay
            đổi.
          </span>
        </p>
      )}

      <div className="field-grid">
        <div className="field field-full">
          <label htmlFor={`${prefix}-class`}>
            Lớp học (theo bộ môn) <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-class`}
            value={classId}
            disabled={Boolean(lockedClassId)}
            onChange={(event) => {
              const nextClassId = event.target.value;
              setClassId(nextClassId);
              const nextClass = classes.find((item) => item.id === nextClassId);
              const currentCoach = coaches.find((item) => item.id === coachId);
              if (
                nextClass &&
                currentCoach &&
                !isCoachSuitableForSport(currentCoach, nextClass.sportName)
              ) {
                setCoachId("");
              }
            }}
            aria-invalid={Boolean(messageFor("classId"))}
            aria-describedby={
              messageFor("classId") ? `${prefix}-class-error` : undefined
            }
          >
            <option value="">— Chọn lớp —</option>
            {classes
              .filter((item) => item.status !== "ARCHIVED")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · Bộ môn: {item.sportName} · tối đa {item.capacity}{" "}
                  học viên
                </option>
              ))}
          </select>
          {messageFor("classId") && (
            <small className="form-error" id={`${prefix}-class-error`}>
              {messageFor("classId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-date`}>
            Ngày học <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-date`}
            type="date"
            value={date}
            min={centerToday()}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(messageFor("date"))}
            aria-describedby={
              messageFor("date") ? `${prefix}-date-error` : undefined
            }
          />
          {messageFor("date") && (
            <small className="form-error" id={`${prefix}-date-error`}>
              {messageFor("date")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-slot`}>
            Khung giờ (Slot) có sẵn <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-slot`}
            value={selectedSlotId}
            onChange={(event) => handleSelectSlot(event.target.value)}
            aria-invalid={Boolean(slotError)}
            aria-describedby={`${prefix}-slot-help${
              slotError ? ` ${prefix}-slot-error` : ""
            }`}
          >
            {CENTER_TIME_SLOTS.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.name} · {slot.startTime} – {slot.endTime}
              </option>
            ))}
            {!matchedSlot && initialValues && (
              <option value="CUSTOM">
                Khung giờ hiện tại · {initialValues.startTime} –{" "}
                {initialValues.endTime}
              </option>
            )}
          </select>
          <small id={`${prefix}-slot-help`}>
            <Clock3 size={13} aria-hidden="true" /> Đang chọn:{" "}
            <strong>
              {startTime} – {endTime}
            </strong>{" "}
            (chỉ xếp lớp theo khung giờ cố định, không có giờ tự do).
          </small>
          {slotError && (
            <small className="form-error" id={`${prefix}-slot-error`}>
              {slotError}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-room`}>
            Phòng tập <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-room`}
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            aria-invalid={Boolean(messageFor("roomId"))}
            aria-describedby={
              messageFor("roomId") ? `${prefix}-room-error` : undefined
            }
          >
            <option value="">— Chọn phòng tập —</option>
            {selectableRooms.map((room) => {
              const availability = getRoomSlotAvailability(room, {
                date,
                startTime,
                endTime,
                sessions: existingSessions,
                excludeSessionId: editingSessionId,
              });
              const isDisabled =
                !availability.isAvailable && room.id !== initialValues?.roomId;
              return (
                <option key={room.id} value={room.id} disabled={isDisabled}>
                  {room.name} · {room.location || "chưa ghi vị trí"} · tối đa{" "}
                  {room.capacity} chỗ — {availability.reason}
                </option>
              );
            })}
          </select>
          {messageFor("roomId") && (
            <small className="form-error" id={`${prefix}-room-error`}>
              {messageFor("roomId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-coach`}>
            Huấn luyện viên phụ trách (theo bộ môn){" "}
            <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-coach`}
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
            aria-invalid={Boolean(messageFor("coachId"))}
            aria-describedby={`${prefix}-coach-help${
              messageFor("coachId") ? ` ${prefix}-coach-error` : ""
            }`}
          >
            <option value="">— Chọn huấn luyện viên phù hợp —</option>
            {selectableCoaches.map((coach) => {
              const availability = getCoachSlotAvailability(coach, {
                sportName: selectedClass?.sportName,
                date,
                startTime,
                endTime,
                sessions: existingSessions,
                excludeSessionId: editingSessionId,
              });
              const isDisabled =
                !availability.isAvailable &&
                coach.id !== initialValues?.coachId;
              return (
                <option key={coach.id} value={coach.id} disabled={isDisabled}>
                  {coach.fullName}
                  {coach.specializations.length
                    ? ` · [${coach.specializations.join(", ")}]`
                    : ""}{" "}
                  — {availability.reason}
                </option>
              );
            })}
          </select>
          <small id={`${prefix}-coach-help`}>
            {selectedClass
              ? `Chỉ phân công HLV phụ trách bộ môn ${selectedClass.sportName} và còn trống lịch ở khung giờ đã chọn.`
              : "Chọn lớp học trước để hệ thống lọc huấn luyện viên phù hợp theo bộ môn."}
          </small>
          {messageFor("coachId") && (
            <small className="form-error" id={`${prefix}-coach-error`}>
              {messageFor("coachId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-capacity`}>
            Sức chứa buổi học <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-capacity`}
            type="number"
            inputMode="numeric"
            min={Math.max(1, bookedCount)}
            max={capacityCeiling}
            step={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder={String(capacityCeiling)}
            aria-invalid={Boolean(messageFor("capacity"))}
            aria-describedby={`${prefix}-capacity-help${
              messageFor("capacity") ? ` ${prefix}-capacity-error` : ""
            }`}
          />
          <small id={`${prefix}-capacity-help`}>
            {selectedClass && selectedRoom
              ? `Tối đa ${capacityCeiling} (nhỏ hơn giữa lớp ${selectedClass.capacity} và phòng ${selectedRoom.capacity}).`
              : "Chọn lớp và phòng để biết giới hạn sức chứa."}
          </small>
          {messageFor("capacity") && (
            <small className="form-error" id={`${prefix}-capacity-error`}>
              {messageFor("capacity")}
            </small>
          )}
        </div>

        <div className="field field-full">
          <label htmlFor={`${prefix}-notes`}>Ghi chú cho buổi học</label>
          <textarea
            id={`${prefix}-notes`}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Dụng cụ cần mang, lưu ý cho huấn luyện viên…"
            maxLength={500}
            aria-invalid={Boolean(messageFor("notes"))}
            aria-describedby={
              messageFor("notes") ? `${prefix}-notes-error` : undefined
            }
          />
          {messageFor("notes") && (
            <small className="form-error" id={`${prefix}-notes-error`}>
              {messageFor("notes")}
            </small>
          )}
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy
        </button>
        <button type="submit" className="button primary" disabled={isSaving}>
          {isSaving ? (
            "Đang lưu…"
          ) : (
            <>
              {initialValues ? (
                <Save size={17} aria-hidden="true" />
              ) : (
                <CalendarClock size={17} aria-hidden="true" />
              )}
              {initialValues ? "Lưu lịch học" : "Thêm buổi học"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
