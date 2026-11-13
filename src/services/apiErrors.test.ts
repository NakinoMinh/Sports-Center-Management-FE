import { describe, expect, it } from "vitest";
import { ApiError } from "./apiClient";
import {
  describeError,
  errorSignature,
  fieldErrorsOf,
  isRetryable,
  isSessionExpired,
} from "./apiErrors";

describe("describeError", () => {
  it("explains the member cancellation deadline", () => {
    expect(describeError(new ApiError("Cancellation deadline passed.", 409, "REGISTRATION_CANCELLATION_TOO_LATE")))
      .toBe("Chỉ được hủy lớp trước giờ khai giảng ít nhất 7 tiếng. Lớp đã bắt đầu thì không hủy được nữa; vui lòng liên hệ lễ tân.");
  });
  it("translates a known backend code instead of showing its English text", () => {
    const error = new ApiError(
      "Authentication is required or the access token is invalid.",
      401,
      "UNAUTHORIZED",
    );
    expect(describeError(error)).toBe(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  });

  it("explains a locked account and what to do about it", () => {
    const message = describeError(
      new ApiError("Account is locked.", 403, "ACCOUNT_LOCKED"),
    );
    expect(message).toMatch(/bị khóa/);
    expect(message).toMatch(/Liên hệ quản lý/);
  });

  it("prefers a per-field validation detail over the generic status text", () => {
    const error = new ApiError("Request validation failed.", 400, "SOME_UNMAPPED", {
      Phone: ["Số điện thoại phải gồm 10 chữ số."],
    });
    expect(describeError(error)).toBe("Số điện thoại phải gồm 10 chữ số.");
  });

  it("falls back to the status message when there is no code", () => {
    expect(describeError(new ApiError("", 404))).toMatch(/Không tìm thấy/);
  });

  it("shows the controller's own Vietnamese text instead of the generic 400", () => {
    const serverText = "Tiêu đề và mục tiêu kế hoạch cần ít nhất 4 ký tự.";
    expect(
      describeError(
        new ApiError(serverText, 400, undefined, undefined, serverText),
      ),
    ).toBe(serverText);
  });

  it("keeps the generic 400 when the body carried no plain text", () => {
    expect(
      describeError(new ApiError("One or more validation errors occurred.", 400)),
    ).toMatch(/Yêu cầu không hợp lệ/);
  });

  it("explains why a room or sport cannot be deactivated", () => {
    expect(describeError(new ApiError("Room has sessions.", 409, "ROOM_HAS_UPCOMING_SESSIONS")))
      .toMatch(/buổi học sắp tới/);
    expect(describeError(new ApiError("Sport has classes.", 409, "SPORT_HAS_ACTIVE_CLASSES")))
      .toMatch(/lớp đang mở/);
  });

  it("prefers the server's Vietnamese envelope message over the generic 409", () => {
    const message = "Không thể ngừng vì đang có 3 buổi học sắp tới.";
    expect(describeError(new ApiError(message, 409, "SOME_NEW_RULE"))).toBe(message);
  });

  it("keeps the generic 409 when the envelope message is English", () => {
    expect(describeError(new ApiError("Conflict.", 409, "SOME_NEW_RULE")))
      .toMatch(/Dữ liệu bị trùng/);
  });

  it("keeps an unmapped code visible so a bug report can quote it", () => {
    const message = describeError(
      new ApiError("Something odd happened.", 418, "TEAPOT_ON_FIRE"),
    );
    expect(message).toContain("TEAPOT_ON_FIRE");
  });

  it("handles a plain Error and an unknown throw", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError("not an error")).toMatch(/không xác định/);
  });

  it("translates COACH_DISCIPLINE_MISMATCH to Vietnamese guidance", () => {
    const message = describeError(
      new ApiError("Coach does not teach this discipline.", 409, "COACH_DISCIPLINE_MISMATCH"),
    );
    expect(message).toMatch(/bộ môn/);
  });
});

describe("fieldErrorsOf", () => {
  it("maps legacy duplicate email and phone responses to their inputs", () => {
    expect(fieldErrorsOf(new ApiError("Email already exists.", 409)).email).toMatch(/Email/);
    expect(describeError(new ApiError("Email already exists.", 409))).toMatch(/Email/);
    expect(fieldErrorsOf(new ApiError("Phone number already exists.", 409)).phone).toMatch(/Số điện thoại/);
  });
  it("translates discipline validation details", () => {
    expect(fieldErrorsOf(new ApiError("Invalid", 400, "VALIDATION_ERROR", { DisciplineIds: ["Minimum length is 1"] })).disciplineIds).toMatch(/ít nhất một bộ môn/);
  });
  it("maps a duplicate phone response to the phone input", () => {
    const error = new ApiError("Phone number already exists.", 409, "PHONE_ALREADY_EXISTS");
    expect(fieldErrorsOf(error)).toEqual({
      phone: "Số điện thoại đã tồn tại. Vui lòng dùng số khác.",
    });
    expect(describeError(error)).toBe("Số điện thoại đã tồn tại. Vui lòng dùng số khác.");
  });
  it("lowercases the server's PascalCase keys so they match form field names", () => {
    const error = new ApiError("Request validation failed.", 400, "VALIDATION_ERROR", {
      FullName: ["Họ tên không được để trống."],
      Email: ["Email đã tồn tại."],
    });
    expect(fieldErrorsOf(error)).toEqual({
      fullName: "Họ tên không được để trống.",
      email: "Email đã tồn tại.",
    });
  });

  it("returns an empty object when there are no details", () => {
    expect(fieldErrorsOf(new ApiError("x", 500))).toEqual({});
    expect(fieldErrorsOf(new Error("x"))).toEqual({});
  });
});

describe("isSessionExpired", () => {
  it("is true for a revoked or invalid token", () => {
    expect(isSessionExpired(new ApiError("", 401, "TOKEN_REVOKED"))).toBe(true);
    expect(isSessionExpired(new ApiError("", 401, "INVALID_TOKEN_CLAIMS"))).toBe(
      true,
    );
  });

  it("is false for a business 401 such as a wrong current password", () => {
    expect(
      isSessionExpired(new ApiError("", 401, "INCORRECT_CURRENT_PASSWORD")),
    ).toBe(false);
  });
});

describe("isRetryable", () => {
  it("is true for network, timeout, rate limit and server faults", () => {
    expect(isRetryable(new ApiError("", 0, "NETWORK_UNREACHABLE"))).toBe(true);
    expect(isRetryable(new ApiError("", 408))).toBe(true);
    expect(isRetryable(new ApiError("", 429))).toBe(true);
    expect(isRetryable(new ApiError("", 503))).toBe(true);
  });

  it("is false for a client mistake", () => {
    expect(isRetryable(new ApiError("", 400, "VALIDATION_ERROR"))).toBe(false);
  });
});

describe("errorSignature", () => {
  it("produces a searchable label for logs", () => {
    expect(errorSignature(new ApiError("", 409, "CONCURRENCY_CONFLICT"))).toBe(
      "HTTP 409 · CONCURRENCY_CONFLICT",
    );
  });
});
