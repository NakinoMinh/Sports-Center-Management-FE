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
  TRANSFER_QR_EXPIRED: "Mã QR không hợp lệ hoặc đã hết hạn. Vui lòng tạo mã mới trên trang thanh toán rồi quét lại.",
  DEMO_PAYMENT_DISABLED: "Thanh toán chuyển khoản hiện chưa khả dụng. Vui lòng liên hệ trung tâm.",
  DEMO_CONFIRMATION_REQUIRED: "Vui lòng xác nhận thanh toán để tiếp tục.",
  DEMO_PAYMENT_NOT_CONFIGURED: "Chưa thể xử lý thanh toán. Vui lòng liên hệ trung tâm.",
  DEMO_PAYMENT_REJECTED: "Không thể thanh toán hóa đơn này. Hãy tải lại hóa đơn hoặc tạo yêu cầu mới.",
  VNPAY_NOT_CONFIGURED: "Thanh toán VNPAY chưa được trung tâm cấu hình. Hóa đơn vẫn đang chờ; vui lòng liên hệ trung tâm.",
  BANK_TRANSFER_NOT_CONFIGURED:
    "Trung tâm chưa cấu hình tài khoản nhận chuyển khoản. Hóa đơn vẫn đang chờ; vui lòng thanh toán tại quầy.",
  INVOICE_ALREADY_PAID:
    "Hóa đơn này đã được thanh toán. Hãy mở biên lai, không thu tiền thêm lần nữa.",
  PAYMENT_AMOUNT_MISMATCH:
    "Số tiền xác nhận không khớp với hóa đơn. Hãy tải lại hóa đơn và nhập đúng số tiền.",
  PAYMENT_CONCURRENCY_CONFLICT:
    "Hóa đơn vừa được xử lý ở nơi khác. Hãy tải lại hóa đơn và biên lai trước khi thao tác tiếp.",
  INVALID_CASH_CONFIRMATION:
    "Hãy tích xác nhận đã nhận tiền và nhập số tiền là số nguyên dương (VNĐ).",
  CASH_ONLY:
    "Phương thức thanh toán của hóa đơn không khớp với cách xác nhận này. Hãy tải lại hóa đơn.",
  INVALID_INVOICE_STATE:
    "Hóa đơn không còn ở trạng thái chờ chuyển khoản. Hãy tải lại hóa đơn.",
  INVALID_SUBSCRIPTION_STATE:
    "Đơn gói của hóa đơn này không còn chờ thanh toán. Hãy tải lại hóa đơn hoặc tạo yêu cầu mới.",
  ORDER_KIND_NOT_SUPPORTED:
    "Loại đơn này chưa hỗ trợ thanh toán trực tuyến. Vui lòng thanh toán tại quầy lễ tân.",
  PACKAGE_CHANGED:
    "Thông tin gói tập vừa thay đổi. Hãy tải lại danh sách gói và tạo đơn mới trước khi thanh toán.",
  UPGRADE_QUOTE_EXPIRED:
    "Báo giá nâng gói đã hết hạn. Hãy tạo lại đơn nâng gói để có báo giá mới.",
  MEMBER_NOT_FOUND: "Không tìm thấy tài khoản thành viên. Hãy tải lại danh sách.",
  INTERNAL_ERROR:
    "Chưa hoàn tất được thao tác do lỗi máy chủ. Vui lòng thử lại sau ít phút.",
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
  INVALID_ACCOUNT_STATUS: "Trạng thái tài khoản chỉ được là Active hoặc Inactive.",
  SELF_DEACTIVATION_NOT_ALLOWED: "Quản lý trung tâm không thể tự ngừng hoạt động tài khoản của chính mình.",
  LAST_ACTIVE_CENTER_MANAGER: "Không thể ngừng hoạt động quản lý trung tâm đang hoạt động cuối cùng.",
  COACH_HAS_UPCOMING_SESSIONS: "Không thể ngừng hoạt động hoặc xóa huấn luyện viên đang có lịch dạy trong tương lai.",
  CLASS_HAS_UPCOMING_SESSIONS: "Không thể lưu trữ lớp học đang còn buổi học được lên lịch trong tương lai. Vui lòng hủy các buổi học tương lai trước khi lưu trữ.",
  CLASS_SPORT_LOCKED: "Không thể đổi bộ môn khi lớp học đang có buổi học được lên lịch.",

  // --- Registration ---
  EMAIL_ALREADY_EXISTS:
    "Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.",
  PHONE_ALREADY_EXISTS: "Số điện thoại đã tồn tại. Vui lòng dùng số khác.",

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

  // --- Membership & Sprint 3 Counter / Invoice / Reports (UC33–UC39) ---
  MEMBER_HAS_MEMBERSHIP_HISTORY:
    "Thành viên này đã có lịch sử đăng ký gói nên không thể xóa. Hãy ngừng hoạt động tài khoản thay vì xóa.",
  TERMS_ACCEPTANCE_REQUIRED:
    "Học viên phải tự đăng nhập, đọc kỹ và chấp nhận toàn bộ điều khoản hiện hành trước khi đăng ký gói.",
  TERMS_VERSION_MISMATCH:
    "Điều khoản vừa được cập nhật. Vui lòng tải lại, đọc phiên bản mới nhất và xác nhận lại.",
  CONFIRMED_SUBSCRIPTION_CANNOT_BE_CANCELED:
    "Gói đã thanh toán và xác nhận không thể hủy. Việc gia hạn, nâng hoặc hạ gói chỉ áp dụng cho kỳ tiếp theo.",
  DUPLICATE_EMAIL:
    "Email này đã được đăng ký cho tài khoản khác. Vui lòng kiểm tra lại hoặc dùng chức năng gia hạn cho hội viên đã có.",
  DUPLICATE_PHONE:
    "Số điện thoại này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại số điện thoại của hội viên.",
  INVALID_MEMBER_DATA:
    "Thông tin hồ sơ hội viên chưa hợp lệ. Vui lòng kiểm tra lại họ tên, email và số điện thoại.",
  INVALID_PAYMENT_METHOD:
    "Phương thức thanh toán không hợp lệ. Vui lòng chọn Tiền mặt, Chuyển khoản hoặc Thẻ.",
  PACKAGE_INACTIVE:
    "Gói tập này hiện đã ngừng kinh doanh. Vui lòng tải lại danh sách và chọn gói tập đang hoạt động.",
  PRICE_CHANGED:
    "Giá gói tập trên hệ thống vừa được cập nhật. Vui lòng làm mới danh sách gói tập để lấy báo giá mới nhất.",
  PENDING_ORDER_EXISTS:
    "Hội viên này đang có một hóa đơn chờ thanh toán. Vui lòng thu tiền hoặc hủy hóa đơn chờ trước khi tạo đơn mới.",
  STAFF_INACTIVE:
    "Tài khoản nhân viên đang ngừng hoạt động nên không thể thực hiện giao dịch.",
  STAFF_NOT_FOUND:
    "Không tìm thấy thông tin tài khoản nhân viên thực hiện giao dịch.",
  STAFF_LOCKED:
    "Tài khoản nhân viên đang bị khóa. Vui lòng liên hệ quản lý trung tâm.",
  INVALID_INVOICE_FILTER:
    "Bộ lọc hoặc tham số phân trang hóa đơn không hợp lệ. Vui lòng đặt lại bộ lọc.",
  RECEIPT_NOT_AVAILABLE:
    "Biên nhận chỉ khả dụng đối với hóa đơn đã được xác nhận thanh toán (PAID).",
  INVOICE_NOT_FOUND:
    "Không tìm thấy hóa đơn yêu cầu hoặc bạn không có quyền truy cập hóa đơn này.",
  DATA_INTEGRITY_ERROR:
    "Dữ liệu hóa đơn hoặc gói tập không đồng nhất. Vui lòng liên hệ bộ phận kỹ thuật.",
  INVALID_REPORT_DATE_RANGE:
    "Khoảng thời gian báo cáo không hợp lệ. Kiểm tra thứ tự ngày và giới hạn thời gian ghi ở bộ lọc.",
  INVALID_REPORT_GROUPING:
    "Chu kỳ gom nhóm báo cáo không hợp lệ. Chỉ hỗ trợ theo ngày (DAY) hoặc theo tháng (MONTH).",
  UNSUPPORTED_REPORT_PAYMENT_METHOD:
    "Báo cáo doanh thu hiện chỉ hỗ trợ đối soát phương thức Tiền mặt (CASH).",
  INVALID_CLASS_REPORT_FILTER:
    "Bộ lọc báo cáo lớp học không hợp lệ. Vui lòng kiểm tra lại lớp, bộ môn hoặc trạng thái đăng ký.",
  REPORT_EXPORT_TOO_LARGE:
    "Dữ liệu xuất CSV vượt quá giới hạn 10.000 dòng. Vui lòng thu hẹp khoảng ngày hoặc lọc theo bộ môn/lớp học.",

  // --- Lớp học, lịch học và đăng ký buổi học (Flow 2) ---
  CLASS_NOT_FOUND:
    "Không tìm thấy lớp học. Có thể lớp vừa bị xóa hoặc lưu trữ.",
  CLASS_NAME_DUPLICATE:
    "Tên lớp này đã tồn tại. Hãy dùng một tên khác để nhân viên không nhầm lớp.",
  CLASS_HAS_NO_VALID_SESSION:
    "Lớp chưa có buổi học hợp lệ nào ở tương lai nên chưa thể mở đăng ký. Hãy lập lịch trước.",
  CLASS_NOT_OPEN:
    "Lớp này hiện không nhận đăng ký mới. Liên hệ quản lý nếu cần mở lại.",
  CLASS_ARCHIVED: "Lớp đã được lưu trữ nên không thể thêm hoặc sửa buổi học.",
  CLASS_HAS_REGISTRATIONS:
    "Lớp đã có lịch sử đăng ký nên không thể xóa. Hãy chuyển sang trạng thái lưu trữ.",

  SPORT_NOT_FOUND: "Không tìm thấy bộ môn đã chọn. Hãy tải lại danh sách.",
  // Hai nhánh cùng khai báo mã này khi gộp; giữ bản nói rõ phải làm gì tiếp.
  SPORT_NAME_DUPLICATE:
    "Tên bộ môn đã tồn tại. Hãy chọn tên khác dễ phân biệt hơn.",
  SPORT_INACTIVE:
    "Bộ môn này đã ngừng hoạt động nên không dùng để tạo lớp mới.",
  SPORT_HAS_ACTIVE_CLASSES:
    "Không thể ngừng bộ môn vì còn lớp đang mở hoặc buổi học sắp tới thuộc bộ môn này. Hãy đóng lớp hoặc hủy các buổi tương lai trước.",

  ROOM_NOT_FOUND: "Không tìm thấy phòng đã chọn. Hãy tải lại danh sách.",
  ROOM_NAME_DUPLICATE: "Tên phòng đã tồn tại. Vui lòng chọn tên phòng khác.",
  ROOM_INACTIVE: "Phòng này đã ngừng hoạt động nên không dùng cho lịch mới.",
  ROOM_HAS_UPCOMING_SESSIONS:
    "Không thể ngừng phòng vì còn buổi học sắp tới xếp tại phòng này. Hãy chuyển phòng hoặc hủy các buổi đó trước.",
  ROOM_CAPACITY_BELOW_SCHEDULE:
    "Không thể giảm sức chứa phòng vì có buổi học chưa bắt đầu đang sử dụng sức chứa lớn hơn. Vui lòng kiểm tra lịch học trước.",

  COACH_NOT_FOUND:
    "Không tìm thấy huấn luyện viên đã chọn. Hãy tải lại danh sách.",
  COACH_INACTIVE:
    "Huấn luyện viên này đang ngừng hoạt động nên không thể phân công.",
  COACH_DISCIPLINE_MISMATCH:
    "Huấn luyện viên không phụ trách bộ môn của lớp học này. Hãy chọn huấn luyện viên phù hợp.",
  COACH_SCHEDULE_CONFLICT:
    "Huấn luyện viên đã có buổi khác trùng giờ. Hãy chọn giờ khác hoặc người khác.",
  ROOM_SCHEDULE_CONFLICT:
    "Phòng đã được dùng trong khoảng giờ này. Hãy chọn phòng khác hoặc đổi giờ.",
  MEMBER_SCHEDULE_CONFLICT:
    "Có buổi học khác trùng giờ. Hãy hủy buổi trùng trước hoặc chọn buổi khác.",
  CAPACITY_BELOW_REGISTRATIONS:
    "Sức chứa mới nhỏ hơn số người đã đăng ký. Hãy hủy một số đăng ký trước khi hạ sức chứa.",
  SESSION_NOT_FOUND: "Không tìm thấy buổi học. Hãy làm mới lịch và thử lại.",
  SESSION_IN_PAST: "Không thể lập hoặc chuyển buổi học về thời điểm đã qua.",
  SESSION_ALREADY_STARTED:
    "Buổi học đã bắt đầu nên không thể thay đổi hoặc hủy nữa.",
  SESSION_CANCELLED: "Buổi học này đã bị hủy nên không còn nhận thao tác.",
  NO_CANCELABLE_SESSION:
    "Không còn buổi học nào ở tương lai để hủy trong phạm vi đã chọn.",
  CLASS_FULL:
    "Buổi học đã đủ chỗ. Hãy chọn buổi khác hoặc theo dõi khi có người hủy.",
  DUPLICATE_REGISTRATION: "Thành viên đã đăng ký buổi học này.",
  REGISTRATION_NOT_FOUND:
    "Không tìm thấy đăng ký này. Có thể đăng ký vừa được hủy ở nơi khác.",
  REGISTRATION_ALREADY_CANCELED:
    "Đăng ký này đã được hủy trước đó. Chỗ chỉ được trả lại một lần.",
  REGISTRATION_CANCELLATION_TOO_LATE:
    "Chỉ được hủy lớp trước giờ khai giảng ít nhất 7 tiếng. Lớp đã bắt đầu thì không hủy được nữa; vui lòng liên hệ lễ tân.",
  MEMBERSHIP_NOT_VALID_FOR_SESSION:
    "Gói tập không còn hiệu lực vào ngày diễn ra buổi học. Hãy gia hạn trước khi đăng ký.",
  PACKAGE_NOT_FOUND: "Không tìm thấy gói tập. Hãy tải lại danh sách.",
  PACKAGE_NOT_ELIGIBLE:
    "Lớp này không nằm trong phạm vi gói tập của bạn. Bạn cần đăng ký gói có bộ môn của lớp này thì mới đăng ký lớp được.",

  // --- Thông báo trong ứng dụng (UC31) ---
  NOTIFICATION_NOT_FOUND:
    "Không tìm thấy thông báo này. Có thể danh sách đã thay đổi; hãy làm mới trang.",

  // --- Concurrency and generic ---
  CONCURRENCY_CONFLICT:
    "Dữ liệu vừa được người khác thay đổi. Hãy làm mới trang và thử lại.",
  VALIDATION_ERROR:
    "Dữ liệu nhập vào chưa hợp lệ. Vui lòng kiểm tra lại các ô đã đánh dấu.",
  INTERNAL_SERVER_ERROR:
    "Máy chủ gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau.",

  // --- Produced by apiClient itself, not by the server ---
  REQUEST_TIMEOUT:
    "Máy chủ phản hồi quá lâu. Kiểm tra kết nối mạng và thử lại.",
  NETWORK_UNREACHABLE:
    "Không kết nối được tới máy chủ. Kiểm tra backend đã chạy chưa.",

  // UC20 (phân công HLV) dùng chung COACH_SCHEDULE_CONFLICT, COACH_INACTIVE,
  // COACH_NOT_FOUND, SESSION_NOT_FOUND và SESSION_CANCELLED đã khai báo ở khối
  // Flow 2 phía trên. Khai báo lại ở đây làm trùng khóa trong cùng một object
  // literal (TS1117) và chỉ một thông điệp sống sót.
};

/** Có dấu tiếng Việt: câu viết cho người dùng chứ không phải thông điệp kỹ thuật. */
const VIETNAMESE_TEXT = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

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
  if (error.code === "EMAIL_ALREADY_EXISTS" || error.code === "DUPLICATE_EMAIL" || (error.status === 409 && /^Email already exists\.?$/i.test(error.message.trim()))) {
    return { email: MESSAGES[error.code ?? "EMAIL_ALREADY_EXISTS"] ?? MESSAGES.EMAIL_ALREADY_EXISTS };
  }
  if (error.code === "PHONE_ALREADY_EXISTS" || error.code === "DUPLICATE_PHONE" || (error.status === 409 && /^Phone number already exists\.?$/i.test(error.message.trim()))) {
    return { phone: MESSAGES[error.code ?? "PHONE_ALREADY_EXISTS"] ?? MESSAGES.PHONE_ALREADY_EXISTS };
  }
  if (error.status === 400 && error.message === "A discipline was not found or is inactive.") {
    return { disciplineIds: "Bộ môn đã ngừng hoạt động hoặc không còn tồn tại. Hãy tải lại danh sách và chọn lại." };
  }
  if (!error.details) return {};
  const details = error.details as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (typeof first === "string" && first.trim()) {
      if (field.toLowerCase() === "disciplineids") {
        result.disciplineIds = "Vui lòng chọn ít nhất một bộ môn đang hoạt động trong danh sách.";
        continue;
      }
      // The server keys fields in PascalCase; forms use camelCase.
      result[field.charAt(0).toLowerCase() + field.slice(1)] = first;
    }
  }
  return result;
}

/**
 * The message to show the user for any thrown value.
 *
 * Order: known error code -> per-field validation detail -> the server's plain
 * text answer -> HTTP status -> the server's own message -> a generic fallback.
 * Always returns Vietnamese for the cases this project produces.
 */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];

    const fields = fieldErrorsOf(error);
    const firstField = Object.values(fields)[0];
    if (firstField) return firstField;

    // Body text thuần là câu tiếng Việt controller viết sẵn cho người dùng và
    // nêu đúng ô nào sai ("Tiêu đề và mục tiêu kế hoạch cần ít nhất 4 ký tự.").
    // Nếu để STATUS_MESSAGES chạy trước thì mọi lỗi 400 đều thành một câu chung
    // và người dùng không biết phải sửa gì. Envelope JSON vẫn đi đường cũ vì
    // message trong đó là tiếng Anh.
    if (error.serverText) {
      return error.code
        ? `${error.serverText} (mã lỗi: ${error.code})`
        : error.serverText;
    }

    // Phần lớn lỗi nghiệp vụ của server đã có câu tiếng Việt nói rõ lý do và việc
    // cần làm ("đang có 10 buổi học sắp tới…"). Mã nào chưa kịp khai báo trong
    // MESSAGES thì câu đó vẫn đúng hơn câu chung theo HTTP status, vốn khiến mọi
    // 409 thành "Dữ liệu bị trùng". Câu tiếng Anh (cho lập trình viên) vẫn đi đường cũ.
    if (VIETNAMESE_TEXT.test(error.message)) return error.message;

    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];

    // An unmapped code still beats a bare status; show the server text and the
    // code so a report names something searchable.
    if (error.message) {
      return error.code
        ? `${error.message} (mã lỗi: ${error.code})`
        : error.message;
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
