import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb } from "./mockDb";
import { membershipService, MEMBERSHIP_STORAGE_KEY } from "./membershipService";
import { receptionService, RECEPTION_STORAGE_KEY } from "./receptionService";
import type { MembershipActor } from "../types/membership";

let actor: MembershipActor;
let member: MembershipActor;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 27, 7));
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  const users = mockDb.getUsers();
  actor = users.find((user) => user.role === "RECEPTIONIST")!;
  member = users.find((user) => user.role === "MEMBER")!;
  membershipService.getMemberSubscriptions(actor, member.id);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("reception operations", () => {
  it("checks in once per day, records checkout, and persists history", () => {
    receptionService.checkIn(actor, member.id);
    expect(() => receptionService.checkIn(actor, member.id)).toThrow(
      "đã được điểm danh",
    );
    const visit = receptionService.getSnapshot(actor).visits[0];
    receptionService.checkOut(actor, visit.id);
    expect(
      receptionService.getSnapshot(actor).visits[0].checkedOutAt,
    ).toBeTruthy();
    expect(() => receptionService.checkOut(actor, visit.id)).toThrow();
  });
  it.each(["suspended", "expired", "pending"])(
    "blocks %s membership from attendance and booking",
    (kind) => {
      const state = JSON.parse(localStorage.getItem(MEMBERSHIP_STORAGE_KEY)!);
      if (kind === "suspended") state.subscriptions[0].isSuspended = true;
      if (kind === "expired") state.subscriptions[0].endDate = "2026-09-26";
      if (kind === "pending") state.subscriptions[0].status = "PENDING_PAYMENT";
      localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(state));
      expect(() => receptionService.checkIn(actor, member.id)).toThrow(
        "còn hiệu lực",
      );
      expect(() =>
        receptionService.bookClass(actor, member.id, "session_0_0"),
      ).toThrow("còn hiệu lực");
    },
  );
  it("books, rejects duplicates, and releases a canceled seat without deleting history", () => {
    receptionService.bookClass(actor, member.id, "session_0_0");
    expect(() =>
      receptionService.bookClass(actor, member.id, "session_0_0"),
    ).toThrow("đã đăng ký");
    const booking = receptionService.getSnapshot(actor).bookings[0];
    receptionService.cancelBooking(actor, booking.id, "Thành viên đổi lịch");
    receptionService.bookClass(actor, member.id, "session_0_0");
    expect(
      receptionService.getSnapshot(actor).bookings.map((item) => item.status),
    ).toEqual(["BOOKED", "CANCELED"]);
  });
  it("rejects full classes and overlapping bookings", () => {
    const state = receptionService.getSnapshot(actor);
    state.sessions[0].capacity = 0;
    localStorage.setItem(RECEPTION_STORAGE_KEY, JSON.stringify(state));
    expect(() =>
      receptionService.bookClass(actor, member.id, "session_0_0"),
    ).toThrow("đủ chỗ");
    state.sessions[0].capacity = 10;
    state.sessions[1].startTime = "08:30";
    localStorage.setItem(RECEPTION_STORAGE_KEY, JSON.stringify(state));
    receptionService.bookClass(actor, member.id, "session_0_0");
    expect(() =>
      receptionService.bookClass(actor, member.id, "session_0_1"),
    ).toThrow("trùng lịch");
  });
  it("blocks booking and cancellation once a session starts", () => {
    receptionService.bookClass(actor, member.id, "session_0_0");
    const booking = receptionService.getSnapshot(actor).bookings[0];
    vi.setSystemTime(new Date(2026, 8, 27, 8));
    expect(() =>
      receptionService.bookClass(actor, member.id, "session_0_0"),
    ).toThrow("đã bắt đầu");
    expect(() =>
      receptionService.cancelBooking(actor, booking.id, "Đổi lịch học"),
    ).toThrow("đã bắt đầu");
  });
  it("records requests and their handling history, validates required content", () => {
    const input = {
      memberId: member.id,
      category: "Gói tập",
      subject: "Kiểm tra thời hạn",
      description: "Nhờ kiểm tra ngày hết hạn gói tập.",
    };
    expect(() =>
      receptionService.createRequest(actor, { ...input, description: " " }),
    ).toThrow();
    receptionService.createRequest(actor, input);
    const request = receptionService.getSnapshot(actor).requests[0];
    receptionService.updateRequest(
      actor,
      request.id,
      "IN_PROGRESS",
      "Đã tiếp nhận kiểm tra",
    );
    receptionService.updateRequest(
      actor,
      request.id,
      "RESOLVED",
      "Đã thông báo thời hạn cho thành viên",
    );
    expect(receptionService.getSnapshot(actor).requests[0]).toMatchObject({
      status: "RESOLVED",
      updates: [{ status: "IN_PROGRESS" }, { status: "RESOLVED" }],
    });
  });
  it("enforces staff permissions, member existence and preserves corrupt data", () => {
    expect(() => receptionService.getSnapshot(member)).toThrow("quyền");
    expect(() => receptionService.checkIn(actor, "missing")).toThrow("hợp lệ");
    localStorage.setItem(RECEPTION_STORAGE_KEY, "bad data");
    expect(() => receptionService.getSnapshot(actor)).toThrow("không hợp lệ");
    expect(localStorage.getItem(RECEPTION_STORAGE_KEY)).toBe("bad data");
  });
});
