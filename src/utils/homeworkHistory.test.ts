import { describe, expect, it } from "vitest";
import type { HomeworkAssignmentDto } from "../services/homeworkApi";
import { groupHomeworkByAssignedDate } from "./homeworkHistory";

const item = (id: number, assignedAtUtc: string): HomeworkAssignmentDto => ({
  id, coachId: "coach-1", coachName: "HLV Hà", memberId: "member-1",
  memberName: "An", classId: null, className: null, sessionId: null,
  sessionLabel: null, title: `Bài ${id}`, instructions: "Nội dung",
  sourceType: "DIRECT", assignedAtUtc,
});

describe("groupHomeworkByAssignedDate", () => {
  it("returns an empty list for an empty history", () => {
    expect(groupHomeworkByAssignedDate([])).toEqual([]);
  });

  it("groups by Vietnam calendar date rather than slicing the UTC date", () => {
    const groups = groupHomeworkByAssignedDate([
      item(1, "2026-11-12T16:30:00Z"),
      item(2, "2026-11-12T17:30:00Z"),
    ]);

    expect(groups.map((group) => group.date)).toEqual(["2026-11-13", "2026-11-12"]);
  });

  it("sorts newest groups/items and uses descending id for equal timestamps", () => {
    const groups = groupHomeworkByAssignedDate([
      item(1, "2026-11-12T08:00:00Z"),
      item(3, "2026-11-12T09:00:00Z"),
      item(2, "2026-11-12T09:00:00Z"),
      item(4, "2026-11-11T10:00:00Z"),
    ]);

    expect(groups.map((group) => group.date)).toEqual(["2026-11-12", "2026-11-11"]);
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual([3, 2, 1]);
  });
});
