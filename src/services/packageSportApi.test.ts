import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "./apiClient";
import { mapEntitlement } from "./packageSportApi";
import { classMockServer, resetClassMockServer } from "./classMockServer";
import { addCalendarDays, centerToday } from "../utils/classSchedule";

describe("mapping entitlement DTO", () => {
  it("turns numeric ids into strings", () => {
    expect(mapEntitlement({ packageId: 5, sportIds: [7, 9] })).toEqual({
      packageId: "5",
      sportIds: ["7", "9"],
      allowsAllSports: false,
    });
  });

  it("treats an empty list as full access even without the server flag", () => {
    // Quy ước: gói chưa cấu hình gì thì vào được mọi bộ môn, nếu không các gói
    // đã bán từ Sprint 1 sẽ mất sạch quyền lợi ngay khi bật tính năng.
    expect(mapEntitlement({ packageId: 1, sportIds: [] }).allowsAllSports).toBe(
      true,
    );
    expect(mapEntitlement({ packageId: 1 }).allowsAllSports).toBe(true);
    expect(mapEntitlement({ packageId: 1, sportIds: null }).sportIds).toEqual(
      [],
    );
  });

  it("keeps the server flag when it disagrees with an empty list", () => {
    expect(
      mapEntitlement({ packageId: 1, sportIds: [], allowsAllSports: false })
        .allowsAllSports,
    ).toBe(false);
  });
});

describe("package entitlement rules in the mock server", () => {
  beforeEach(() => {
    resetClassMockServer();
  });

  const codeOf = async (action: Promise<unknown>): Promise<string> => {
    try {
      await action;
    } catch (error) {
      return error instanceof ApiError ? (error.code ?? "NO_CODE") : "NOT_API";
    }
    return "NO_ERROR";
  };

  it("reports full access for a package with no configured sports", async () => {
    const result = await classMockServer.getPackageSports("4");
    expect(result).toEqual({
      packageId: "4",
      sportIds: [],
      allowsAllSports: true,
    });
  });

  it("reports the configured sports for a restricted package", async () => {
    const result = await classMockServer.getPackageSports("5");
    expect(result.sportIds).toEqual(["sport-yoga"]);
    expect(result.allowsAllSports).toBe(false);
  });

  it("rejects an unknown package and an unknown sport", async () => {
    expect(await codeOf(classMockServer.getPackageSports("999"))).toBe(
      "PACKAGE_NOT_FOUND",
    );
    expect(
      await codeOf(classMockServer.setPackageSports("4", ["sport-nope"])),
    ).toBe("SPORT_NOT_FOUND");
  });

  it("refuses to grant access to a sport that is no longer active", async () => {
    expect(
      await codeOf(classMockServer.setPackageSports("4", ["sport-dance"])),
    ).toBe("SPORT_INACTIVE");
  });

  it("drops duplicates when saving", async () => {
    const saved = await classMockServer.setPackageSports("4", [
      "sport-yoga",
      "sport-yoga",
      "sport-boxing",
    ]);
    expect(saved.sportIds).toEqual(["sport-yoga", "sport-boxing"]);
  });

  /**
   * Đây là lý do màn hình này tồn tại: đổi cấu hình gói phải đổi ngay kết quả
   * đăng ký lớp của mọi thành viên đang dùng gói đó.
   */
  describe("effect on class registration (UC24)", () => {
    const today = centerToday();
    const boxingSessionId = "session-boxing-1";

    it("blocks a member whose package excludes the sport", async () => {
      // member-binh dùng gói 5, chỉ được Yoga.
      expect(
        await codeOf(
          classMockServer.register(
            boxingSessionId,
            "member-binh",
            "MEMBER",
            "Trần Thanh Bình",
          ),
        ),
      ).toBe("PACKAGE_NOT_ELIGIBLE");
    });

    it("lets the same member in once Boxing is added to the package", async () => {
      await classMockServer.setPackageSports("5", [
        "sport-yoga",
        "sport-boxing",
      ]);
      const registration = await classMockServer.register(
        boxingSessionId,
        "member-binh",
        "MEMBER",
        "Trần Thanh Bình",
      );
      expect(registration.status).toBe("BOOKED");
    });

    it("blocks a previously unrestricted member once the package is narrowed", async () => {
      // member-an dùng gói 4, trước đó vào được mọi bộ môn.
      await classMockServer.setPackageSports("4", ["sport-swim"]);
      expect(
        await codeOf(
          classMockServer.register(
            boxingSessionId,
            "member-an",
            "MEMBER",
            "Nguyễn Hoàng An",
          ),
        ),
      ).toBe("PACKAGE_NOT_ELIGIBLE");
    });

    it("does not touch registrations made before the change", async () => {
      const before = await classMockServer.listRegistrations({
        memberId: "member-an",
      });
      await classMockServer.setPackageSports("4", ["sport-swim"]);
      const after = await classMockServer.listRegistrations({
        memberId: "member-an",
      });
      expect(after).toHaveLength(before.length);
      expect(after.every((item) => item.status === "BOOKED")).toBe(true);
    });

    it("still enforces every other rule ahead of the entitlement check", async () => {
      // Gói hết hạn được báo trước quyền bộ môn, để người dùng sửa đúng việc.
      await classMockServer.setPackageSports("1", ["sport-swim"]);
      const yogaSessionId = (
        await classMockServer.listSessions({
          classId: "class-yoga-basic",
          from: addCalendarDays(today, 2),
          to: addCalendarDays(today, 2),
        })
      )[0].id;
      expect(
        await codeOf(
          classMockServer.register(
            yogaSessionId,
            "member-dung",
            "MEMBER",
            "Phạm Tiến Dũng",
          ),
        ),
      ).toBe("MEMBERSHIP_NOT_VALID_FOR_SESSION");
    });
  });
});
