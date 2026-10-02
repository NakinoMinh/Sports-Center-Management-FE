/**
 * Form validation rules shared by every screen.
 *
 * Validation used to be scattered across pages as bare `required` / `maxLength`
 * attributes plus a private `isValidEmail` inside authService, so the same field
 * was checked differently depending on where it appeared and the browser's own
 * English messages leaked into a Vietnamese UI.
 *
 * Every validator returns a Vietnamese message describing what is wrong, or
 * `null` when the value is acceptable. They never throw and never mutate input.
 */

export type ValidationResult = string | null;
export type Validator<T = string> = (value: T) => ValidationResult;

/** Field name -> message, for the fields that failed. */
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

// --- Primitives ---------------------------------------------------------

export const required =
  (label: string): Validator =>
  (value) =>
    value.trim() === "" ? `${label} không được để trống.` : null;

export const maxLength =
  (label: string, max: number): Validator =>
  (value) =>
    value.trim().length > max
      ? `${label} tối đa ${max} ký tự.`
      : null;

export const minLength =
  (label: string, min: number): Validator =>
  (value) =>
    value.trim().length < min
      ? `${label} cần ít nhất ${min} ký tự.`
      : null;

// --- Domain rules -------------------------------------------------------

/**
 * Deliberately permissive: a single @, no spaces, a dot in the domain. Stricter
 * patterns reject addresses that are valid in practice, and the server is the
 * authority on deliverability anyway.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const email: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Email không được để trống.";
  if (trimmed.length > 200) return "Email tối đa 200 ký tự.";
  if (!EMAIL_PATTERN.test(trimmed))
    return "Email không hợp lệ. Ví dụ: ten@sportscenter.com";
  return null;
};

/** Vietnamese mobile number: exactly 10 digits starting with 0. */
export const phone: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Số điện thoại không được để trống.";
  if (!/^\d+$/.test(trimmed))
    return "Số điện thoại chỉ được chứa chữ số.";
  if (trimmed.length !== 10)
    return `Số điện thoại phải gồm đúng 10 chữ số (đang có ${trimmed.length}).`;
  if (!trimmed.startsWith("0"))
    return "Số điện thoại phải bắt đầu bằng số 0.";
  return null;
};

/** Optional phone: blank is allowed, a value present must still be valid. */
export const optionalPhone: Validator = (value) =>
  value.trim() === "" ? null : phone(value);

/**
 * Mirrors the server rule: at least 8 characters and at most 72 bytes, because
 * BCrypt silently truncates anything longer than 72 bytes.
 */
export const password: Validator = (value) => {
  if (value === "") return "Mật khẩu không được để trống.";
  if (value.length < 8) return "Mật khẩu cần ít nhất 8 ký tự.";
  if (new TextEncoder().encode(value).length > 72)
    return "Mật khẩu quá dài (tối đa 72 byte).";
  return null;
};

export const confirmPassword =
  (original: string): Validator =>
  (value) =>
    value !== original ? "Mật khẩu xác nhận không khớp." : null;

/** Six-digit code used by the email verification and OTP flows. */
export const otpCode: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Mã xác nhận không được để trống.";
  if (!/^\d{6}$/.test(trimmed))
    return "Mã xác nhận gồm đúng 6 chữ số.";
  return null;
};

export const fullName: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Họ và tên không được để trống.";
  if (trimmed.length < 2) return "Họ và tên cần ít nhất 2 ký tự.";
  if (trimmed.length > 80) return "Họ và tên tối đa 80 ký tự.";
  if (/\d/.test(trimmed)) return "Họ và tên không được chứa chữ số.";
  return null;
};

export const username: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Tên đăng nhập không được để trống.";
  if (trimmed.length < 3) return "Tên đăng nhập cần ít nhất 3 ký tự.";
  if (trimmed.length > 50) return "Tên đăng nhập tối đa 50 ký tự.";
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed))
    return "Tên đăng nhập chỉ gồm chữ không dấu, số và các ký tự . _ -";
  return null;
};

const MIN_AGE_YEARS = 10;
const MAX_AGE_YEARS = 100;

/** Optional date of birth: blank passes, a value must be a plausible past date. */
export const dateOfBirth: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "Ngày sinh không hợp lệ.";

  const today = new Date();
  if (parsed > today) return "Ngày sinh không thể ở tương lai.";

  const age = (today.getTime() - parsed.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < MIN_AGE_YEARS)
    return `Thành viên phải từ ${MIN_AGE_YEARS} tuổi trở lên.`;
  if (age > MAX_AGE_YEARS) return "Ngày sinh không hợp lệ.";
  return null;
};

/** Package price and any other money amount, in VND. */
export const money =
  (label: string, { min = 0, max = 1_000_000_000 } = {}): Validator<number | string> =>
  (raw) => {
    const value = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (String(raw).trim() === "") return `${label} không được để trống.`;
    if (!Number.isFinite(value)) return `${label} phải là một số.`;
    if (!Number.isInteger(value)) return `${label} phải là số nguyên (đồng).`;
    if (value < min) return `${label} không được nhỏ hơn ${min.toLocaleString("vi-VN")} đ.`;
    if (value > max) return `${label} không được lớn hơn ${max.toLocaleString("vi-VN")} đ.`;
    return null;
  };

export const positiveInteger =
  (label: string, { min = 1, max = 120 } = {}): Validator<number | string> =>
  (raw) => {
    const value = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (String(raw).trim() === "") return `${label} không được để trống.`;
    if (!Number.isInteger(value)) return `${label} phải là số nguyên.`;
    if (value < min) return `${label} tối thiểu là ${min}.`;
    if (value > max) return `${label} tối đa là ${max}.`;
    return null;
  };

export const packageName: Validator = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return "Tên gói tập không được để trống.";
  if (trimmed.length < 2) return "Tên gói tập cần ít nhất 2 ký tự.";
  if (trimmed.length > 80) return "Tên gói tập tối đa 80 ký tự.";
  return null;
};

/** Benefits are authored one per line in a textarea. */
export const benefitLines: Validator = (value) => {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "Nhập ít nhất một quyền lợi của gói tập.";
  if (lines.length > 20) return "Tối đa 20 quyền lợi cho mỗi gói tập.";
  const tooLong = lines.find((line) => line.length > 200);
  if (tooLong) return "Mỗi quyền lợi tối đa 200 ký tự.";
  return null;
};

/** Free-text note or description that may be left empty. */
export const text =
  (label: string, max: number): Validator =>
  (value) =>
    value.trim().length > max ? `${label} tối đa ${max} ký tự.` : null;

/** A choice that must be made, for selects whose empty option means "chưa chọn". */
export const selected =
  (label: string): Validator =>
  (value) =>
    value.trim() === "" ? `Vui lòng chọn ${label}.` : null;

// --- Composition --------------------------------------------------------

/** Runs validators in order and returns the first failure. */
export const all =
  <T>(...validators: Validator<T>[]): Validator<T> =>
  (value) => {
    for (const validate of validators) {
      const message = validate(value);
      if (message) return message;
    }
    return null;
  };

/** Blank passes; otherwise the wrapped rules apply. */
export const optional =
  (validator: Validator): Validator =>
  (value) =>
    value.trim() === "" ? null : validator(value);

/**
 * Validates a whole form.
 *
 * @example
 *   const errors = validateForm(form, {
 *     fullName: v.fullName,
 *     phone: v.phone,
 *   });
 *   if (hasErrors(errors)) { setErrors(errors); return; }
 */
export function validateForm<T extends object>(
  values: T,
  rules: Partial<{ [K in keyof T]: Validator<T[K]> }>,
): FieldErrors<Extract<keyof T, string>> {
  const errors: FieldErrors<Extract<keyof T, string>> = {};
  for (const key of Object.keys(rules) as Array<Extract<keyof T, string>>) {
    const validate = rules[key];
    if (!validate) continue;
    const message = validate(values[key]);
    if (message) errors[key] = message;
  }
  return errors;
}

export const hasErrors = (errors: FieldErrors): boolean =>
  Object.keys(errors).length > 0;

/** First message in field order, for a form-level summary. */
export const firstError = (errors: FieldErrors): string | null =>
  Object.values(errors).find((message): message is string => Boolean(message)) ??
  null;
