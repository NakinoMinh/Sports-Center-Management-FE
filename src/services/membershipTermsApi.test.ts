import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { membershipTermsApi } from "./membershipTermsApi";

const storage = (): Storage => ({
  length: 0, clear: vi.fn(), getItem: vi.fn(() => null), key: vi.fn(() => null),
  removeItem: vi.fn(), setItem: vi.fn(),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("membershipTermsApi", () => {
  it("uses the current, accept and staff-status contracts", async () => {
    const current = {
      version: "membership-terms-v1", title: "Điều khoản", effectiveFrom: "2026-11-12",
      contentHash: "a".repeat(64), sections: [{ id: "PACKAGE", title: "Gói", body: "Nội dung" }],
      requiredAcknowledgements: [{ id: "NO_CANCEL", label: "Đồng ý" }], accepted: false,
    };
    const status = { memberId: "member-1", currentVersion: current.version, accepted: true,
      acceptedVersion: current.version, acceptedAtUtc: "2026-11-12T10:00:00Z" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(current))
      .mockResolvedValueOnce(json(status))
      .mockResolvedValueOnce(json(status));
    vi.stubGlobal("fetch", fetchMock);

    expect(await membershipTermsApi.getCurrent()).toEqual(current);
    expect(await membershipTermsApi.accept(current.version, current.contentHash)).toEqual(status);
    expect(await membershipTermsApi.getMemberStatus("member-1")).toEqual(status);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/MembershipTerms/current",
      "http://api.test/api/MembershipTerms/current/accept",
      "http://api.test/api/MembershipTerms/members/member-1/status",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      version: current.version, contentHash: current.contentHash,
    });
  });

  it("propagates a stale-version API error code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({
      error: { code: "TERMS_VERSION_MISMATCH", message: "Reload" }, traceId: "trace-1",
    }, 409)));

    await expect(membershipTermsApi.accept("old", "b".repeat(64))).rejects.toMatchObject({
      status: 409, code: "TERMS_VERSION_MISMATCH",
    });
  });
});
