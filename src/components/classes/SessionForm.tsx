import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Save } from "lucide-react";
import * as v from "../../utils/validation";
import {
  centerToday,
  describeCapacityConflict,
  minutesOfDay,
} from "../../utils/classSchedule";
import type {
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

const DEFAULT_START = "08:00";
const DEFAULT_END = "09:00";

/**
 * Form lập và sửa buổi học (UC21).
 *
 * Trùng Coach, trùng phòng và xung đột với học viên đang đăng ký chỉ server
 * biết chắc, nên form chỉ kiểm tra phần tự biết được (giờ, sức chứa, phòng/
 * Coach đang hoạt động) rồi để `fieldErrors` từ API đánh dấu đúng ô đã gây lỗi.
 */
export function SessionForm({
  initialValues,
  classes,
  coaches,
  rooms,
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
    initialValues?.startTime ?? DEFAULT_START,
  );
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? DEFAULT_END);
  const [capacity, setCapacity] = useState(
    initialValues ? String(initialValues.capacity) : "",
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageFor = (field: string): string | undefined =>
    errors[field] ?? fieldErrors?.[field];

  const selectedClass = classes.find((item) => item.id === classId);
  const selectedRoom = rooms.find((item) => item.id === roomId);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = v.validateForm(
      { classId, coachId, roomId, date, startTime, endTime, capacity, notes },
      {
        classId: v.selected("lớp học"),
        coachId: v.selected("huấn luyện viên"),
        roomId: v.selected("phòng tập"),
        date: v.required("Ngày học"),
        startTime: v.required("Giờ bắt đầu"),
        endTime: v.required("Giờ kết thúc"),
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

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {bookedCount > 0 && (
        <p className="info-note">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Buổi học đã có <strong>{bookedCount}</strong> người đăng ký. Đổi
            ngày hoặc giờ sẽ được kiểm tra lại quyền tham gia của từng học
            viên; nếu có người không còn hợp lệ, hệ thống từ chối toàn bộ thay
            đổi.
          </span>
        </p>
      )}

      <div className="field-grid">
        <div className="field field-full">
          <label htmlFor={`${prefix}-class`}>
            Lớp học <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-class`}
            value={classId}
            disabled={Boolean(lockedClassId)}
            onChange={(event) => setClassId(event.target.value)}
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
                  {item.name} · {item.sportName} · tối đa {item.capacity}
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
          <label htmlFor={`${prefix}-coach`}>
            Huấn luyện viên <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-coach`}
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
            aria-invalid={Boolean(messageFor("coachId"))}
            aria-describedby={
              messageFor("coachId") ? `${prefix}-coach-error` : undefined
            }
          >
            <option value="">— Chọn huấn luyện viên —</option>
            {selectableCoaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.fullName}
                {coach.specializations.length
                  ? ` · ${coach.specializations.join(", ")}`
                  : ""}
                {coach.isActive ? "" : " (đã ngừng hoạt động)"}
              </option>
            ))}
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
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            aria-invalid={Boolean(messageFor("roomId"))}
            aria-describedby={
              messageFor("roomId") ? `${prefix}-room-error` : undefined
            }
          >
            <option value="">— Chọn phòng —</option>
            {selectableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · {room.location || "chưa ghi vị trí"} · tối đa{" "}
                {room.capacity}
                {room.isActive ? "" : " (đã ngừng hoạt động)"}
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

        <div className="field">
          <label htmlFor={`${prefix}-start`}>
            Giờ bắt đầu <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-start`}
            type="time"
            value={startTime}
            step={300}
            onChange={(event) => setStartTime(event.target.value)}
            aria-invalid={Boolean(messageFor("startTime"))}
            aria-describedby={
              messageFor("startTime") ? `${prefix}-start-error` : undefined
            }
          />
          {messageFor("startTime") && (
            <small className="form-error" id={`${prefix}-start-error`}>
              {messageFor("startTime")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-end`}>
            Giờ kết thúc <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-end`}
            type="time"
            value={endTime}
            step={300}
            onChange={(event) => setEndTime(event.target.value)}
            aria-invalid={Boolean(messageFor("endTime"))}
            aria-describedby={`${prefix}-end-help${
              messageFor("endTime") ? ` ${prefix}-end-error` : ""
            }`}
          />
          <small id={`${prefix}-end-help`}>
            Khoảng giờ tính theo [bắt đầu, kết thúc): buổi kết thúc 09:00 không
            bị coi là trùng buổi bắt đầu 09:00.
          </small>
          {messageFor("endTime") && (
            <small className="form-error" id={`${prefix}-end-error`}>
              {messageFor("endTime")}
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
