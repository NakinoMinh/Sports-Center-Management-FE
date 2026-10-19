import { describe, expect, it } from "vitest";
import { homeForRole, navigationFor, trailFor } from "./navigation";

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
