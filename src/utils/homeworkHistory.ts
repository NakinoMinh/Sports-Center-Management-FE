import type { HomeworkAssignmentDto } from "../services/homeworkApi";

export interface HomeworkDateGroup {
  /** Ngày lịch tại Việt Nam, dạng YYYY-MM-DD. */
  date: string;
  items: HomeworkAssignmentDto[];
}

const vietnamDate = (value: string): string => {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const groupHomeworkByAssignedDate = (
  items: readonly HomeworkAssignmentDto[],
): HomeworkDateGroup[] => {
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const byTime =
        new Date(right.item.assignedAtUtc).getTime()
        - new Date(left.item.assignedAtUtc).getTime();
      if (byTime !== 0) return byTime;
      if (right.item.id !== left.item.id) return right.item.id - left.item.id;
      return left.index - right.index;
    });

  const groups = new Map<string, HomeworkAssignmentDto[]>();
  for (const { item } of sorted) {
    const date = vietnamDate(item.assignedAtUtc);
    const entries = groups.get(date) ?? [];
    entries.push(item);
    groups.set(date, entries);
  }

  return [...groups].map(([date, groupedItems]) => ({
    date,
    items: groupedItems,
  }));
};
