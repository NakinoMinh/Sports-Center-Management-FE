import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("invoice date formatting", () => {
  it("preserves a membership calendar date without time zone conversion", () => {
    expect(formatDate("2026-09-25")).toBe("25/09/2026");
  });

  it("renders an invoice timestamp using its local day, not the UTC string prefix", () => {
    const localDate = new Date(2026, 8, 25, 0, 30);
    expect(formatDate(localDate.toISOString())).toBe("25/09/2026");
    expect(formatDate("invalidTtimestamp")).toBe("—");
  });
});
