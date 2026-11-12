import { describe, expect, it } from "vitest";
import { canAcceptTerms } from "./membershipTerms";

describe("canAcceptTerms", () => {
  it("requires scrolling to the end and every required acknowledgement", () => {
    expect(canAcceptTerms({ hasScrolledToEnd: false, requiredChecks: [true, true] })).toBe(false);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [true, false] })).toBe(false);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [true, true] })).toBe(true);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [] })).toBe(false);
  });
});
