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
});

describe("fieldErrorsOf", () => {
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
