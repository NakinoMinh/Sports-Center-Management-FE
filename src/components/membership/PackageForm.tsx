import { useId, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import type {
  MembershipDuration,
  MembershipPackageInput,
} from "../../types/membership";

export type PackageFormValues = MembershipPackageInput;

interface PackageFormProps {
  initialValues?: PackageFormValues;
  onSubmit: (values: PackageFormValues) => void;
  onCancel: () => void;
  error?: string;
}

export function PackageForm({
  initialValues,
  onSubmit,
  onCancel,
  error,
}: PackageFormProps) {
  const prefix = useId();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [price, setPrice] = useState(
    initialValues ? String(initialValues.price) : "",
  );
  const [durationMonths, setDurationMonths] = useState(
    initialValues?.durationMonths ?? 1,
  );
  const [benefits, setBenefits] = useState(
    initialValues?.benefits.join("\n") ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const amount = Number(price);
    const benefitList = benefits
      .split("\n")
      .map((benefit) => benefit.trim())
      .filter(Boolean);
    if (name.trim().length < 2)
      nextErrors.name = "Tên gói cần có ít nhất 2 ký tự.";
    if (!price.trim() || !Number.isSafeInteger(amount) || amount <= 0) {
      nextErrors.price = "Nhập giá gói là số nguyên lớn hơn 0.";
    }
    if (!benefitList.length)
      nextErrors.benefits = "Nhập ít nhất một quyền lợi của gói tập.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit({
      name: name.trim(),
      price: amount,
      durationMonths,
      benefits: benefitList,
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
        <div className="field field-full">
          <label htmlFor={`${prefix}-name`}>
            Tên gói tập <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Gói tập linh hoạt"
            maxLength={80}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
          />
          {errors.name && (
            <small className="form-error" id={`${prefix}-name-error`}>
              {errors.name}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-price`}>
            Giá gói (VNĐ) <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${prefix}-price`}
            value={price}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            onChange={(event) => setPrice(event.target.value)}
            placeholder="500000"
            required
            aria-invalid={Boolean(errors.price)}
            aria-describedby={
              errors.price ? `${prefix}-price-error` : undefined
            }
          />
          {errors.price && (
            <small className="form-error" id={`${prefix}-price-error`}>
              {errors.price}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-duration`}>
            Thời hạn sử dụng <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${prefix}-duration`}
            value={durationMonths}
            onChange={(event) =>
              setDurationMonths(
                Number(event.target.value) as MembershipDuration,
              )
            }
          >
            <option value={1}>1 tháng · Gói tháng</option>
            <option value={3}>3 tháng · Gói quý</option>
            <option value={12}>12 tháng · Gói năm</option>
          </select>
        </div>
        <div className="field field-full">
          <label htmlFor={`${prefix}-benefits`}>
            Quyền lợi <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${prefix}-benefits`}
            rows={4}
            value={benefits}
            onChange={(event) => setBenefits(event.target.value)}
            placeholder={"Sử dụng phòng gym\nTham gia các lớp nhóm"}
            maxLength={1500}
            required
            aria-invalid={Boolean(errors.benefits)}
            aria-describedby={`${prefix}-benefits-help${errors.benefits ? ` ${prefix}-benefits-error` : ""}`}
          />
          <small id={`${prefix}-benefits-help`}>
            Mỗi dòng là một quyền lợi. Quyền lợi được hiển thị cho thành viên
            khi chọn gói.
          </small>
          {errors.benefits && (
            <small className="form-error" id={`${prefix}-benefits-error`}>
              {errors.benefits}
            </small>
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="button primary">
          <Save size={17} aria-hidden="true" />
          {initialValues ? "Lưu thay đổi" : "Tạo gói tập"}
        </button>
      </div>
    </form>
  );
}
