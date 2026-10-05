import { ApiError } from "./apiClient";

/**
 * Maps the backend error codes onto messages a Vietnamese user can act on.
 *
 * The server answers with `{ success, error: { code, message, details }, traceId }`
 * where `message` is English ("Authentication is required or the access token is
 * invalid."). Surfacing that raw string put developer English in front of end
 * users and never said what to do next, so every known code is translated here
 * and anything unknown falls back to the server text.
 *
 * Codes are taken from the controllers, services and middleware of
 * SportsCenterManagement; keep this table in sync when the backend adds one.
 */
const MESSAGES: Record<string, string> = {
  // --- Authentication and session ---
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Tài khoản của bạn không có quyền thực hiện thao tác này.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  INVALID_TOKEN_CLAIMS: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  TOKEN_REVOKED: "Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.",
  ACCOUNT_LOCKED:
    "Tài khoản đang bị khóa do nhập sai mật khẩu nhiều lần. Liên hệ quản lý trung tâm để mở khóa.",
  ACCOUNT_INACTIVE:
    "Tài khoản đã ngừng hoạt động. Liên hệ quản lý trung tâm để được hỗ trợ.",
  ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản này trong hệ thống.",

  // --- Registration ---
  EMAIL_ALREADY_EXISTS:
    "Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.",
  PHONE_ALREADY_EXISTS:
    "Số điện thoại đã tồn tại. Vui lòng dùng số khác.",

  // --- Email verification ---
  EMAIL_VERIFICATION_REQUIRED:
    "Cần xác thực email trước khi tiếp tục. Hãy bấm “Gửi mã” và nhập mã trong hộp thư.",
  EMAIL_VERIFICATION_NOT_FOUND:
    "Chưa có mã xác thực nào được gửi. Hãy bấm “Gửi mã” trước.",
  EMAIL_VERIFICATION_EXPIRED:
    "Mã xác thực đã hết hạn. Hãy bấm “Gửi mã” để nhận mã mới.",
  INVALID_EMAIL_VERIFICATION_CODE:
    "Mã xác thực không đúng. Kiểm tra lại mã trong email.",
  EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED:
    "Bạn đã nhập sai mã quá số lần cho phép. Hãy yêu cầu mã mới.",

  // --- Password change OTP ---
  OTP_NOT_FOUND: "Chưa có mã OTP nào được gửi. Hãy yêu cầu mã trước.",
  OTP_EXPIRED: "Mã OTP đã hết hạn. Hãy yêu cầu mã mới.",
  INVALID_OTP: "Mã OTP không đúng. Kiểm tra lại mã trong email.",
  OTP_ATTEMPTS_EXCEEDED:
    "Bạn đã nhập sai OTP quá số lần cho phép. Hãy yêu cầu mã mới.",
  OTP_COOLDOWN_ACTIVE:
    "Mã vừa được gửi. Vui lòng đợi hết thời gian chờ rồi thử lại.",
  OTP_CONCURRENT_REQUEST:
    "Đang có một yêu cầu mã khác được xử lý. Vui lòng thử lại sau giây lát.",
  OTP_DELIVERY_FAILED:
    "Không gửi được email chứa mã. Kiểm tra lại địa chỉ email hoặc thử lại sau.",
  INCORRECT_CURRENT_PASSWORD: "Mật khẩu hiện tại không đúng.",
  PASSWORD_UNCHANGED: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  CONCURRENT_PASSWORD_CHANGE:
    "Mật khẩu vừa được thay đổi ở nơi khác. Vui lòng đăng nhập lại.",

  // --- Avatar upload ---
  AVATAR_FILE_REQUIRED: "Hãy chọn một tệp ảnh để tải lên.",
  AVATAR_FILE_EMPTY: "Tệp ảnh rỗng. Hãy chọn tệp khác.",
  AVATAR_FILE_TOO_LARGE:
    "Ảnh vượt quá dung lượng cho phép. Hãy chọn ảnh nhỏ hơn.",
  AVATAR_FORMAT_UNSUPPORTED:
    "Định dạng ảnh không được hỗ trợ. Chỉ nhận JPG, PNG hoặc WEBP.",

  // --- Membership ---
  MEMBER_HAS_MEMBERSHIP_HISTORY:
    "Thành viên này đã có lịch sử đăng ký gói nên không thể xóa. Hãy ngừng hoạt động tài khoản thay vì xóa.",

  // --- Concurrency and generic ---
  CONCURRENCY_CONFLICT:
    "Dữ liệu vừa được người khác thay đổi. Hãy làm mới trang và thử lại.",
  VALIDATION_ERROR: "Dữ liệu nhập vào chưa hợp lệ. Vui lòng kiểm tra lại các ô đã đánh dấu.",
  INTERNAL_SERVER_ERROR:
    "Máy chủ gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau.",

  // --- Produced by apiClient itself, not by the server ---
  REQUEST_TIMEOUT:
    "Máy chủ phản hồi quá lâu. Kiểm tra kết nối mạng và thử lại.",
  NETWORK_UNREACHABLE:
    "Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.",
};

/** Messages by HTTP status, used when the server sends no code. */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu bị trùng hoặc vừa được thay đổi. Hãy làm mới và thử lại.",
  413: "Dữ liệu gửi lên quá lớn.",
  429: "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.",
  500: "Máy chủ gặp sự cố. Vui lòng thử lại sau.",
  502: "Máy chủ tạm thời không phản hồi. Vui lòng thử lại sau.",
  503: "Dịch vụ đang bảo trì. Vui lòng thử lại sau.",
};

/** True when the error means the session is gone and the user must sign in. */
export const isSessionExpired = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.code === "TOKEN_REVOKED" ||
    error.code === "INVALID_TOKEN_CLAIMS" ||
    error.code === "UNAUTHORIZED" ||
    (error.status === 401 && !error.code));

/** True when retrying the same request could plausibly succeed. */
export const isRetryable = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.status === 0 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500);

/**
 * Per-field messages from a 400 VALIDATION_ERROR, so a form can mark the exact
 * inputs the server rejected instead of showing one banner.
 *
 * The server sends `details` as `{ fieldName: ["message", ...] }`.
 */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  if (error.code === "PHONE_ALREADY_EXISTS") {
    return { phone: MESSAGES.PHONE_ALREADY_EXISTS };
  }
  if (!error.details) return {};
  const details = error.details as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === "string" && first.trim()) {
      // The server keys fields in PascalCase; forms use camelCase.
      result[field.charAt(0).toLowerCase() + field.slice(1)] = first;
    }
  }
  return result;
}

/**
 * The message to show the user for any thrown value.
 *
 * Order: known error code -> per-field validation detail -> HTTP status ->
 * the server's own message -> a generic fallback. Always returns Vietnamese for
 * the cases this project produces.
 */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];

    const fields = fieldErrorsOf(error);
    const firstField = Object.values(fields)[0];
    if (firstField) return firstField;

    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];

    // An unmapped code still beats a bare status; show the server text and the
    // code so a report names something searchable.
    if (error.message) {
      return error.code ? `${error.message} (mã lỗi: ${error.code})` : error.message;
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}

/**
 * Diagnostic label for logs and bug reports - never shown as the main message.
 *
 * @example "HTTP 409 · CONCURRENCY_CONFLICT"
 */
export function errorSignature(error: unknown): string {
  if (!(error instanceof ApiError)) return "CLIENT_ERROR";
  return `HTTP ${error.status}${error.code ? ` · ${error.code}` : ""}`;
}
