import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  coachPublicProfileApi,
  createCoachProfileCache,
} from "./coachPublicProfileApi";

const storage = (): Storage => ({
  length: 0,
  clear: vi.fn(),
  getItem: vi.fn(() => null),
  key: vi.fn(() => null),
  removeItem: vi.fn(),
  setItem: vi.fn(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("coachPublicProfileApi", () => {
  it("encodes the route and maps only privacy-safe display fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        accountId: "coach/1",
        fullName: "  ",
        workSchedule: null,
        email: "private@example.com",
        phone: "0900000000",
        disciplines: [
          { disciplineId: 7, disciplineName: " Yoga " },
          { disciplineId: "8", disciplineName: "Pilates" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(coachPublicProfileApi.get("coach/1")).resolves.toEqual({
      accountId: "coach/1",
      fullName: "Huấn luyện viên chưa cập nhật tên",
      workSchedule: "Chưa cập nhật lịch làm việc",
      disciplines: [
        { disciplineId: "7", disciplineName: "Yoga" },
        { disciplineId: "8", disciplineName: "Pilates" },
      ],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/coaches/coach%2F1/public-profile",
    );
  });
});

describe("createCoachProfileCache", () => {
  it("deduplicates both in-flight and resolved requests", async () => {
    let resolveRequest!: (value: {
      accountId: string;
      fullName: string;
      workSchedule: string;
      disciplines: never[];
    }) => void;
    const request = vi.fn(
      () =>
        new Promise<{
          accountId: string;
          fullName: string;
          workSchedule: string;
          disciplines: never[];
        }>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const cache = createCoachProfileCache(request);

    const first = cache.get("coach-1");
    const second = cache.get("coach-1");
    expect(first).toBe(second);
    expect(request).toHaveBeenCalledTimes(1);

    resolveRequest({
      accountId: "coach-1",
      fullName: "Nguyễn Hà",
      workSchedule: "Thứ 2 - Thứ 6",
      disciplines: [],
    });
    await first;
    await expect(cache.get("coach-1")).resolves.toMatchObject({
      accountId: "coach-1",
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("evicts a rejected request so a retry performs a new fetch", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({
        accountId: "coach-1",
        fullName: "Nguyễn Hà",
        workSchedule: "Thứ 2 - Thứ 6",
        disciplines: [],
      });
    const cache = createCoachProfileCache(request);

    await expect(cache.get("coach-1")).rejects.toThrow("temporary");
    await expect(cache.get("coach-1")).resolves.toMatchObject({
      accountId: "coach-1",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
});
