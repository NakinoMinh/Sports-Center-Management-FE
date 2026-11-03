import { describe, expect, it } from "vitest";
import { homeForRole, navigationFor, trailFor } from "./navigation";
import type { UserRole } from "../types/auth";

describe("merged Sprint 2 navigation", () => {
  it("keeps catalog and schedule independently reachable for managers", () => {
    const paths = navigationFor("CENTER_MANAGER").flatMap(section => section.items.map(item => item.to));
    expect(paths).toContain("/manager/classes");
    expect(paths).toContain("/manager/class-schedule");
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("uses one coach schedule destination and a matching roster breadcrumb", () => {
    const paths = navigationFor("COACH").flatMap(section => section.items.map(item => item.to));
    expect(paths.filter(path => path.startsWith("/coach"))).toEqual(["/coach/my-schedule"]);
    expect(homeForRole("COACH")).toBe("/coach/my-schedule");
    expect(trailFor("/coach/my-schedule/7/registrations")).toEqual(["Lớp học", "Lịch dạy của tôi"]);
  });
});

describe("Sprint 3 report access", () => {
  it.each<UserRole>(["CENTER_MANAGER", "MEMBER", "COACH", "RECEPTIONIST"])("only exposes reports to the manager: %s", role => {
    const paths = navigationFor(role).flatMap(section => section.items.map(item => item.to));
    expect(paths.includes("/manager/reports")).toBe(role === "CENTER_MANAGER");
  });

  it("provides the report breadcrumb", () => {
    expect(trailFor("/manager/reports")).toEqual(["Tài chính", "Báo cáo tổng hợp"]);
  });
});
