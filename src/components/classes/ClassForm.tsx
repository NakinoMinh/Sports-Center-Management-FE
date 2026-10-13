import { useId, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import * as v from "../../utils/validation";
import { classStatusLabels } from "../../utils/classSchedule";
import type { ClassInput, ClassStatus, Sport } from "../../types/classes";

interface ClassFormProps {
  initialValues?: ClassInput;
  sports: readonly Sport[];
  /** Số đăng ký còn hiệu lực, dùng làm sàn cho sức chứa khi sửa lớp. */
  activeRegistrationCount?: number;
  /** Lớp chỉ được mở đăng ký khi đã có buổi học hợp lệ ở tương lai (UC19). */
  upcomingSessionCount?: number;
  onSubmit: (values: ClassInput) => void;
  onCancel: () => void;
  error?: string;
  /** Lỗi theo từng ô do server trả về, hiển thị ngay dưới ô tương ứng. */
  fieldErrors?: Record<string, string>;
  isSaving?: boolean;
}

const STATUS_ORDER: readonly ClassStatus[] = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "ARCHIVED",
];

/** Form tạo và sửa lớp học (UC19). */
export function ClassForm({
  initialValues,
  sports,
  activeRegistrationCount = 0,
  upcomingSessionCount = 0,
  onSubmit,
  onCancel,
  error,
  fieldErrors,
  isSaving = false,
}: ClassFormProps) {
  const prefix = useId();
  const [sportId, setSportId] = useState(initialValues?.sportId ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [capacity, setCapacity] = useState(
    initialValues ? String(initialValues.capacity) : "",
  );
  const [status, setStatus] = useState<ClassStatus>(
    initialValues?.status ?? "DRAFT",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageFor = (field: string): string | undefined =>
    errors[field] ?? fieldErrors?.[field];

  // Bộ môn đã ngừng hoạt động không dùng cho lớp mới, nhưng lớp cũ đang trỏ
  // vào nó vẫn phải chọn lại được chính nó, nếu không form sẽ không lưu nổi.
  const selectableSports = sports.filter(
    (sport) => sport.isActive || sport.id === initialValues?.sportId,
  );
  const canOpenForBooking = upcomingSessionCount > 0 || status === "OPEN";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = v.validateForm(
      { sportId, name, description, capacity },
      {
        sportId: v.selected("bộ môn"),
        name: v.all(
          v.required("Tên lớp"),
          v.minLength("Tên lớp", 3),
          v.maxLength("Tên lớp", 120),
        ),
        description: v.text("Mô tả", 1000),
        capacity: v.positiveInteger("Sức chứa", {
          min: Math.max(1, activeRegistrationCount),
          max: 200,
        }),
      },
    ) as Record<string, string>;
    if (status === "OPEN" && upcomingSessionCount === 0)
      nextErrors.status =
        "Lớp chưa có buổi học nào ở tương lai nên chưa thể mở đăng ký.";
    setErrors(nextErrors);
    if (v.hasErrors(nextErrors)) return;
    onSubmit({
      sportId,
      name: name.trim(),
      description: description.trim(),
      capacity: Number(capacity),
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="field-grid">
        <div className="field">
          <label htmlFor={`${prefix}-sport`}>
            Bộ môn <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-sport`}
            value={sportId}
            onChange={(event) => setSportId(event.target.value)}
            aria-invalid={Boolean(messageFor("sportId"))}
            aria-describedby={
              messageFor("sportId") ? `${prefix}-sport-error` : undefined
            }
          >
            <option value="">— Chọn bộ môn —</option>
            {selectableSports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
                {sport.isActive ? "" : " (đã ngừng hoạt động)"}
              </option>
            ))}
          </select>
          {messageFor("sportId") && (
            <small className="form-error" id={`${prefix}-sport-error`}>
              {messageFor("sportId")}
            </small>
          )}
        </div>

        <div className="field">
          <label htmlFor={`${prefix}-capacity`}>
            Sức chứa lớp <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-capacity`}
            type="number"
            inputMode="numeric"
            min={Math.max(1, activeRegistrationCount)}
            max={200}
            step={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="15"
            aria-invalid={Boolean(messageFor("capacity"))}
            aria-describedby={`${prefix}-capacity-help${
              messageFor("capacity") ? ` ${prefix}-capacity-error` : ""
            }`}
          />
          <small id={`${prefix}-capacity-help`}>
            {activeRegistrationCount > 0
              ? `Đang có ${activeRegistrationCount} đăng ký còn hiệu lực nên không hạ xuống dưới mức này.`
              : "Giới hạn trên cho sức chứa của từng buổi học."}
          </small>
          {messageFor("capacity") && (
            <small className="form-error" id={`${prefix}-capacity-error`}>
              {messageFor("capacity")}
            </small>
          )}
        </div>

        <div className="field field-full">
          <label htmlFor={`${prefix}-name`}>
            Tên lớp <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Yoga cân bằng cơ bản"
            maxLength={120}
            aria-invalid={Boolean(messageFor("name"))}
            aria-describedby={
              messageFor("name") ? `${prefix}-name-error` : undefined
            }
          />
          {messageFor("name") && (
            <small className="form-error" id={`${prefix}-name-error`}>
              {messageFor("name")}
            </small>
          )}
        </div>

        <div className="field field-full">
          <label htmlFor={`${prefix}-description`}>Mô tả</label>
          <textarea
            id={`${prefix}-description`}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Đối tượng phù hợp, yêu cầu trình độ, dụng cụ cần mang…"
            maxLength={1000}
            aria-invalid={Boolean(messageFor("description"))}
            aria-describedby={
              messageFor("description")
                ? `${prefix}-description-error`
                : undefined
            }
          />
          {messageFor("description") && (
            <small className="form-error" id={`${prefix}-description-error`}>
              {messageFor("description")}
            </small>
          )}
        </div>

        <div className="field field-full">
          <label htmlFor={`${prefix}-status`}>
            Trạng thái <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value as ClassStatus)}
            aria-invalid={Boolean(messageFor("status"))}
            aria-describedby={`${prefix}-status-help${
              messageFor("status") ? ` ${prefix}-status-error` : ""
            }`}
          >
            {STATUS_ORDER.map((value) => (
              <option
                key={value}
                value={value}
                disabled={value === "OPEN" && !canOpenForBooking}
              >
                {classStatusLabels[value]}
                {value === "OPEN" && !canOpenForBooking
                  ? " (cần có buổi học)"
                  : ""}
              </option>
            ))}
          </select>
          <small id={`${prefix}-status-help`}>
            Chỉ trạng thái “{classStatusLabels.OPEN}” mới cho thành viên đặt
            chỗ. Lưu trữ giữ nguyên toàn bộ lịch sử đăng ký.
          </small>
          {messageFor("status") && (
            <small className="form-error" id={`${prefix}-status-error`}>
              {messageFor("status")}
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
          <Save size={17} aria-hidden="true" />
          {isSaving
            ? "Đang lưu…"
            : initialValues
              ? "Lưu thay đổi"
              : "Tạo lớp học"}
        </button>
      </div>
    </form>
  );
}
