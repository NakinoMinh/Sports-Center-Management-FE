import { describe, expect, it } from "vitest";
import { reportDate, reportDateRange, validateForm } from "./validation";

describe("report calendar dates", () => {
  it.each(["", "2024-02-29", "2026-01-01", "2026-12-31"])("accepts optional or valid dates: %s", value => {
    expect(reportDate(value)).toBeNull();
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "0000-01-01", "9999-12-31", "2026-1-1", "2026-11-03T00:00:00Z"])("rejects invalid dates: %s", value => {
    expect(reportDate(value)).not.toBeNull();
  });

  it("counts both bounds and accepts exactly 366 days, including leap years", () => {
    expect(reportDateRange("2024-01-01", 366)("2024-12-31")).toBeNull();
    expect(reportDateRange("2024-01-01", 366)("2025-01-01")).toContain("366");
    expect(reportDateRange("2026-11-03", 366)("2026-11-03")).toBeNull();
  });

  it("does not apply the revenue/class range cap to member reports", () => {
    expect(reportDateRange("2020-01-01")("2026-11-03")).toBeNull();
    expect(reportDateRange("2026-11-04")("2026-11-03")).toContain("Đến ngày");
  });

  it("leaves each omitted bound to the server's center-date defaults", () => {
    expect(reportDateRange("", 366)("2026-11-03")).toBeNull();
    expect(reportDateRange("2026-11-03", 366)("")).toBeNull();
    expect(reportDateRange("", 366)("")).toBeNull();
  });

  it("returns an error under the invalid field", () => {
    expect(validateForm({ from: "2026-02-30", to: "2026-03-01" }, {
      from: reportDate, to: reportDateRange("2026-02-30", 366),
    })).toEqual({ from: expect.any(String) });
  });
});
