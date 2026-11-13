import { describe, expect, it } from "vitest";
import { canAcceptTerms, hasReachedTermsEnd } from "./membershipTerms";

describe("canAcceptTerms", () => {
  it("requires scrolling to the end and every required acknowledgement", () => {
    expect(canAcceptTerms({ hasScrolledToEnd: false, requiredChecks: [true, true] })).toBe(false);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [true, false] })).toBe(false);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [true, true] })).toBe(true);
    expect(canAcceptTerms({ hasScrolledToEnd: true, requiredChecks: [] })).toBe(false);
  });
});

describe("hasReachedTermsEnd", () => {
  it("treats a fully visible document as already read to the end", () => {
    expect(hasReachedTermsEnd({ scrollTop: 0, clientHeight: 0, scrollHeight: 0 })).toBe(false);
    expect(hasReachedTermsEnd({ scrollTop: 0, clientHeight: 500, scrollHeight: 500 })).toBe(true);
    expect(hasReachedTermsEnd({ scrollTop: 0, clientHeight: 300, scrollHeight: 500 })).toBe(false);
    expect(hasReachedTermsEnd({ scrollTop: 192, clientHeight: 300, scrollHeight: 500 })).toBe(true);
  });
});
