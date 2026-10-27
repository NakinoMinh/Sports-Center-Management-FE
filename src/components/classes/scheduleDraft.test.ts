import { describe, expect, it } from "vitest";
import {
  emptyScheduleDraft,
  toScheduleInputs,
  toScheduleInput,
  validateScheduleDraft,
  type ScheduleDraft,
} from "./scheduleDraft";

describe("scheduleDraft tests", () => {
  it("creates empty draft with one empty session", () => {
    const draft = emptyScheduleDraft();
    expect(draft.sessions).toHaveLength(1);
    expect(draft.sessions[0].slotId).toBe("");
    expect(draft.sessions[0].daysOfWeek).toEqual([]);
    expect(draft.coachId).toBe("");
    expect(draft.roomId).toBe("");
  });

  it("validates required fields", () => {
    const draft = emptyScheduleDraft();
    const errors = validateScheduleDraft(draft);
    expect(errors.coachId).toBeDefined();
    expect(errors.roomId).toBeDefined();
    expect(errors["sessions[0].slotId"]).toBeDefined();
    expect(errors["sessions[0].daysOfWeek"]).toBeDefined();
  });

  it("detects conflict when two sessions have overlapping time slots on the same day", () => {
    const draft: ScheduleDraft = {
      coachId: "coach-1",
      roomId: "1",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      notes: "",
      sessions: [
        {
          id: "s1",
          slotId: "SLOT_2", // Ca 2: 08:00 - 09:00
          daysOfWeek: [1, 3], // Thứ hai, thứ tư
        },
        {
          id: "s2",
          slotId: "SLOT_2", // Cùng Ca 2: 08:00 - 09:00
          daysOfWeek: [1, 5], // Thứ hai trùng với buổi 1
        },
      ],
    };

    const errors = validateScheduleDraft(draft);
    expect(errors["sessions[1].conflict"]).toBeDefined();
    expect(errors["sessions[1].conflict"]).toContain("Buổi 1 và Buổi 2 bị trùng khung giờ");
  });

  it("allows same day if time slots do not overlap", () => {
    const draft: ScheduleDraft = {
      coachId: "coach-1",
      roomId: "1",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      notes: "",
      sessions: [
        {
          id: "s1",
          slotId: "SLOT_2", // Ca 2: 08:00 - 09:00
          daysOfWeek: [1, 3], // Thứ hai, thứ tư
        },
        {
          id: "s2",
          slotId: "SLOT_4", // Ca 4: 14:00 - 15:30 (không trùng Ca 2)
          daysOfWeek: [1, 5], // Thứ hai chiều
        },
      ],
    };

    const errors = validateScheduleDraft(draft);
    expect(errors["sessions[1].conflict"]).toBeUndefined();
    expect(errors.coachId).toBeUndefined();
    expect(errors.roomId).toBeUndefined();
  });

  it("converts multiple sessions into ClassScheduleInput list with classCapacity", () => {
    const draft: ScheduleDraft = {
      coachId: "coach-1",
      roomId: "1",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      notes: "Mang giày thể thao",
      sessions: [
        {
          id: "s1",
          slotId: "SLOT_2",
          daysOfWeek: [1, 3],
        },
        {
          id: "s2",
          slotId: "SLOT_6",
          daysOfWeek: [5],
        },
      ],
    };

    const inputs = toScheduleInputs(draft, 20);
    expect(inputs).toHaveLength(2);
    expect(inputs[0].sessionCapacity).toBe(20);
    expect(inputs[0].daysOfWeek).toEqual([1, 3]);
    expect(inputs[0].startTime).toBe("08:00");
    expect(inputs[0].endTime).toBe("09:00");

    expect(inputs[1].sessionCapacity).toBe(20);
    expect(inputs[1].daysOfWeek).toEqual([5]);
    expect(inputs[1].startTime).toBe("18:00");
    expect(inputs[1].endTime).toBe("19:30");

    const single = toScheduleInput(draft, 20);
    expect(single).toEqual(inputs[0]);
  });
});
