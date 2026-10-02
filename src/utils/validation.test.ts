import { describe, expect, it } from "vitest";
import * as v from "./validation";

describe("email", () => {
  it("accepts an ordinary address", () => {
    expect(v.email("coach@sportscenter.com")).toBeNull();
  });

  it("rejects a blank value", () => {
    expect(v.email("   ")).toMatch(/không được để trống/);
  });

  it("rejects an address with no domain dot", () => {
    expect(v.email("coach@localhost")).toMatch(/không hợp lệ/);
  });

  it("rejects an address containing a space", () => {
    expect(v.email("a b@c.com")).toMatch(/không hợp lệ/);
  });
});

describe("phone", () => {
  it("accepts 10 digits starting with 0", () => {
    expect(v.phone("0912345678")).toBeNull();
  });

  it("reports the actual length when it is wrong", () => {
    expect(v.phone("09123")).toMatch(/đang có 5/);
  });

  it("rejects a number not starting with 0", () => {
    expect(v.phone("1912345678")).toMatch(/bắt đầu bằng số 0/);
  });

  it("rejects letters", () => {
    expect(v.phone("09123abcde")).toMatch(/chỉ được chứa chữ số/);
  });

  it("treats a blank optional phone as valid", () => {
    expect(v.optionalPhone("")).toBeNull();
    expect(v.optionalPhone("123")).not.toBeNull();
  });
});

describe("password", () => {
  it("requires at least 8 characters", () => {
    expect(v.password("1234567")).toMatch(/ít nhất 8/);
    expect(v.password("12345678")).toBeNull();
  });

  it("rejects anything over 72 bytes, counting multi-byte characters", () => {
    // 25 Vietnamese characters at 3 bytes each exceeds the BCrypt limit even
    // though the string is only 25 characters long.
    expect(v.password("ữ".repeat(25))).toMatch(/quá dài/);
  });

  it("matches the confirmation", () => {
    expect(v.confirmPassword("abc12345")("abc12345")).toBeNull();
    expect(v.confirmPassword("abc12345")("abc1234")).toMatch(/không khớp/);
  });
});

describe("fullName", () => {
  it("accepts a Vietnamese name with diacritics", () => {
    expect(v.fullName("Trần Gia Huy")).toBeNull();
  });

  it("rejects digits", () => {
    expect(v.fullName("Coach 123")).toMatch(/không được chứa chữ số/);
  });

  it("rejects a name over 80 characters", () => {
    expect(v.fullName("a".repeat(81))).toMatch(/tối đa 80/);
  });
});

describe("otpCode", () => {
  it("accepts exactly six digits", () => {
    expect(v.otpCode("123456")).toBeNull();
  });

  it("rejects five digits and non-digits", () => {
    expect(v.otpCode("12345")).toMatch(/6 chữ số/);
    expect(v.otpCode("12345a")).toMatch(/6 chữ số/);
  });
});

describe("dateOfBirth", () => {
  it("treats blank as valid because the field is optional", () => {
    expect(v.dateOfBirth("")).toBeNull();
  });

  it("rejects a future date", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(v.dateOfBirth(nextYear.toISOString().slice(0, 10))).toMatch(
      /tương lai/,
    );
  });

  it("rejects someone under the minimum age", () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 5);
    expect(v.dateOfBirth(recent.toISOString().slice(0, 10))).toMatch(/tuổi/);
  });

  it("accepts a plausible adult birth date", () => {
    expect(v.dateOfBirth("1995-10-15")).toBeNull();
  });
});

describe("money", () => {
  const price = v.money("Giá gói");

  it("rejects a non-integer amount", () => {
    expect(price(1000.5)).toMatch(/số nguyên/);
  });

  it("rejects a negative amount", () => {
    expect(price(-1)).toMatch(/không được nhỏ hơn/);
  });

  it("accepts a normal price", () => {
    expect(price(350000)).toBeNull();
  });
});

describe("validateForm", () => {
  it("collects one message per failing field and skips the valid ones", () => {
    const errors = v.validateForm(
      { fullName: "", email: "nope", phone: "0912345678" },
      { fullName: v.fullName, email: v.email, phone: v.phone },
    );

    expect(Object.keys(errors).sort()).toEqual(["email", "fullName"]);
    expect(v.hasErrors(errors)).toBe(true);
    expect(v.firstError(errors)).toBe(errors.fullName);
  });

  it("returns no errors for a fully valid form", () => {
    const errors = v.validateForm(
      { fullName: "Lê Quốc Anh", email: "a@b.com", phone: "0912345678" },
      { fullName: v.fullName, email: v.email, phone: v.phone },
    );

    expect(v.hasErrors(errors)).toBe(false);
    expect(v.firstError(errors)).toBeNull();
  });
});

describe("all", () => {
  it("returns the first failing rule, in order", () => {
    const rule = v.all(v.required("Mã"), v.minLength("Mã", 5));
    expect(rule("")).toMatch(/không được để trống/);
    expect(rule("ab")).toMatch(/ít nhất 5/);
    expect(rule("abcde")).toBeNull();
  });
});
