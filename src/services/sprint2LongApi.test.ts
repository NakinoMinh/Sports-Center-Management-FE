import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classApi } from "./classApi";
import { notificationApi } from "./notificationApi";

const makeStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const page = <T>(items: T[]) => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  totalPages: 1,
});

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test/api");
  vi.stubEnv("VITE_API_TEST_MODE", "true");
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Sprint 2 Long API adapters", () => {
  it("connects UC17 sport CRUD using direct payloads", async () => {
    const sport = {
      id: 7,
      name: "Yoga",
      description: "Cân bằng và phục hồi",
      isActive: true,
      createdAt: "2026-10-13T00:00:00Z",
      updatedAt: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(page([sport])))
      .mockResolvedValueOnce(json(sport, 201))
      .mockResolvedValueOnce(json({ ...sport, isActive: false }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await classApi.listSports())[0].description).toBe(
      "Cân bằng và phục hồi",
    );
    await classApi.saveSport({ name: "Yoga", description: "Cân bằng" });
    await classApi.setSportActive("7", false);

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/Sport?page=1&pageSize=20",
      "http://api.test/api/Sport",
      "http://api.test/api/Sport/7/status",
    ]);
  });

  it("connects UC22 and UC23 list filters", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(page([])))
      .mockResolvedValueOnce(json(page([])));
    vi.stubGlobal("fetch", fetchMock);

    await classApi.listSessions({
      sportId: "7",
      status: "SCHEDULED",
      from: "2026-10-13",
      to: "2026-10-19",
    });
    await classApi.listClasses({ search: "yoga", sportId: "7", status: "OPEN" });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/ClassSession?sportId=7&status=SCHEDULED&from=2026-10-13&to=2026-10-19&page=1&pageSize=20",
      "http://api.test/api/Class?search=yoga&sportId=7&status=OPEN&page=1&pageSize=20",
    ]);
  });

  it("connects UC31 notification list and read state", async () => {
    const item = {
      id: 77,
      type: "SESSION_CANCELED",
      title: "Buổi học đã bị hủy",
      body: "Lý do: phòng bảo trì.",
      entityType: "ClassSession",
      entityId: 44,
      isRead: false,
      createdAt: "2026-10-13T02:00:00Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(page([item])))
      .mockResolvedValueOnce(json({ ...item, isRead: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await notificationApi.list({ isRead: false })).items[0].id).toBe("77");
    expect((await notificationApi.markRead("77")).isRead).toBe(true);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://api.test/api/Notification/me?page=1&pageSize=20&isRead=false",
      "http://api.test/api/Notification/77/read",
    ]);
  });

  it("supports UC31 mock notifications when the API is not configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    const unread = await notificationApi.list({ isRead: false });
    expect(unread.items.length).toBeGreaterThan(0);

    const updated = await notificationApi.markRead(unread.items[0].id);
    expect(updated.isRead).toBe(true);
  });
});
