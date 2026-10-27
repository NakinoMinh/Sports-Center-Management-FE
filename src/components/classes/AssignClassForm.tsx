import { useId, useState, type FormEvent } from "react";
import { CalendarPlus } from "lucide-react";
import { classStatusLabels } from "../../utils/classSchedule";
import { ScheduleFields } from "./ScheduleFields";
import {
  emptyScheduleDraft,
  toScheduleInput,
  validateScheduleDraft,
  type ScheduleDraft,
} from "./scheduleDraft";
import type {
  ClassScheduleInput,
  CoachOption,
  Room,
  TrainingClass,
} from "../../types/classes";

interface AssignClassFormProps {
  classes: readonly TrainingClass[];
  coaches: readonly CoachOption[];
  rooms: readonly Room[];
  /** Lớp đã chọn sẵn từ bộ lọc của trang lịch. */
  lockedClassId?: string;
  onSubmit: (classId: string, schedule: ClassScheduleInput) => void;
  onCancel: () => void;
  error?: string;
  fieldErrors?: Record<string, string>;
  isSaving?: boolean;
}

/**
 * Gán một lớp đã có vào lịch học (UC21): chọn lớp, giáo viên đứng lớp, phòng,
 * khoảng ngày, các thứ và ca học — server sinh ra cả đợt buổi học trong một
 * lượt. Thay cho việc lập từng buổi một; sửa một buổi lẻ vẫn dùng form buổi học.
 */
export function AssignClassForm({
  classes,
  coaches,
  rooms,
  lockedClassId,
  onSubmit,
  onCancel,
  error,
  fieldErrors,
  isSaving = false,
}: AssignClassFormProps) {
  const prefix = useId();
  const [classId, setClassId] = useState(lockedClassId ?? "");
  const [schedule, setSchedule] = useState<ScheduleDraft>(emptyScheduleDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageFor = (field: string): string | undefined =>
    errors[field] ?? fieldErrors?.[field];

  // Lớp đã lưu trữ không nhận lịch mới; lớp nháp vẫn nhận, vì gán lịch xong là
  // điều kiện để mở đăng ký.
  const selectableClasses = classes.filter(
    (item) => item.status !== "ARCHIVED",
  );
  const selectedClass = classes.find((item) => item.id === classId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!classId) nextErrors.classId = "Chọn lớp học cần gán lịch.";
    Object.assign(
      nextErrors,
      validateScheduleDraft(schedule, {
        classCapacity: selectedClass?.capacity ?? 0,
        roomCapacity: rooms.find((room) => room.id === schedule.roomId)
          ?.capacity,
      }),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const scheduleInput = toScheduleInput(schedule);
    if (!scheduleInput) {
      setErrors({ ...nextErrors, slotId: "Chọn ca học." });
      return;
    }
    onSubmit(classId, scheduleInput);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
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
            onChange={(event) => setClassId(event.target.value)}
            disabled={Boolean(lockedClassId)}
            aria-invalid={Boolean(messageFor("classId"))}
            aria-describedby={`${prefix}-class-help${
              messageFor("classId") ? ` ${prefix}-class-error` : ""
            }`}
          >
            <option value="">— Chọn lớp —</option>
            {selectableClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.sportName} ·{" "}
                {classStatusLabels[item.status]}
              </option>
            ))}
          </select>
          <small id={`${prefix}-class-help`}>
            {selectedClass
              ? `Sức chứa lớp ${selectedClass.capacity} người, đang có ${selectedClass.totalSessionCount} buổi.`
              : "Lớp đã lưu trữ không nhận thêm lịch."}
          </small>
          {messageFor("classId") && (
            <small className="form-error" id={`${prefix}-class-error`}>
              {messageFor("classId")}
            </small>
          )}
        </div>
      </div>

      <ScheduleFields
        value={schedule}
        onChange={setSchedule}
        coaches={coaches}
        rooms={rooms}
        sportName={selectedClass?.sportName}
        classCapacity={selectedClass?.capacity}
        messageFor={messageFor}
      />

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
          <CalendarPlus size={17} aria-hidden="true" />
          {isSaving ? "Đang gán…" : "Gán lớp vào lịch"}
        </button>
      </div>
    </form>
  );
}
