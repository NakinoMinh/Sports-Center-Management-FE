import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homeworkApi } from "./homeworkApi";

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

describe("homeworkApi", () => {
  it("uses the structured assign route and preserves the exact target shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([]));
    vi.stubGlobal("fetch", fetchMock);

    await homeworkApi.assign({
      targetType: "SESSION",
      sessionId: 42,
      title: "Plank",
      instructions: "3 hiệp, mỗi hiệp 30 giây.",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/api/Homework");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      targetType: "SESSION",
      sessionId: 42,
      title: "Plank",
      instructions: "3 hiệp, mỗi hiệp 30 giây.",
    });
  });

  it("uses actor-bound history routes and maps no completion or submission fields", async () => {
    const raw = [{
      id: 9, coachId: "coach-1", coachName: "HLV Hà",
      memberId: "member-1", memberName: "An", classId: 7, className: "Yoga",
      sessionId: null, sessionLabel: null, title: "  Giãn cơ  ",
      instructions: "  Giữ nguyên khoảng trắng  ", sourceType: "CLASS",
      assignedAtUtc: "2026-11-12T16:30:00Z", completed: true,
      submissionUrl: "private-file",
    }];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(raw))
      .mockResolvedValueOnce(json(raw));
    vi.stubGlobal("fetch", fetchMock);

    const coachItems = await homeworkApi.getCoachHistory();
    const memberItems = await homeworkApi.getMemberHistory();

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/Homework/coach/me",
      "http://api.test/api/Homework/member/me",
    ]);
    expect(coachItems).toEqual(memberItems);
    expect(coachItems[0]?.title).toBe("  Giãn cơ  ");
    expect(coachItems[0]?.instructions).toBe("  Giữ nguyên khoảng trắng  ");
    expect(coachItems[0]).not.toHaveProperty("completed");
    expect(coachItems[0]).not.toHaveProperty("submissionUrl");
  });
});
