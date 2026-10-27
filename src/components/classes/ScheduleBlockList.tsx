import { CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import { describeRecurrence } from "../../utils/classSchedule";
import type { ClassScheduleBlock } from "../../types/classes";

interface ScheduleBlockListProps {
  blocks: readonly ClassScheduleBlock[];
  /**
   * `compact` cho ô bảng: mỗi đợt một dòng gọn.
   * `detailed` cho thẻ lớp: mỗi đợt kèm icon giáo viên, phòng và khoảng ngày.
   */
  variant?: "compact" | "detailed";
  /** Câu hiển thị khi lớp chưa có buổi nào. */
  emptyLabel?: string;
}

/**
 * Các đợt lịch của một lớp, mỗi đợt một dòng.
 *
 * Một lớp có thể dạy tối thứ hai/thứ tư và sáng thứ sáu. Gộp thành một dòng thì
 * mọi ca đều bị hiển thị theo giờ của đợt sớm nhất, nên giờ của đợt còn lại
 * hiện ra sai. Dùng chung cho màn hình quản lý và màn hình thành viên để hai
 * nơi không bao giờ mô tả cùng một lớp theo hai kiểu.
 */
export function ScheduleBlockList({
  blocks,
  variant = "compact",
  emptyLabel = "Chưa có lịch",
}: ScheduleBlockListProps) {
  if (blocks.length === 0) {
    return <small className="cell-caption">{emptyLabel}</small>;
  }

  if (variant === "compact") {
    return (
      <ul className="schedule-block-list">
        {blocks.map((block, index) => (
          <li key={`${block.coachId}-${block.roomId}-${block.startTime}-${index}`}>
            <strong>
              {describeRecurrence(
                block.daysOfWeek,
                block.startTime,
                block.endTime,
              )}
            </strong>
            <small className="cell-caption">
              {block.startDate} → {block.endDate} · {block.sessionCount} buổi
            </small>
            <small className="cell-caption">
              {block.coachName} · {block.roomName}
            </small>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="schedule-block-list is-detailed">
      {blocks.map((block, index) => (
        <li key={`${block.coachId}-${block.roomId}-${block.startTime}-${index}`}>
          <span className="schedule-block-heading">
            <Clock3 size={15} aria-hidden="true" />
            {describeRecurrence(
              block.daysOfWeek,
              block.startTime,
              block.endTime,
            )}
          </span>
          <span className="schedule-block-meta">
            <span>
              <UserRound size={14} aria-hidden="true" /> {block.coachName}
            </span>
            <span>
              <MapPin size={14} aria-hidden="true" /> {block.roomName}
            </span>
            <span>
              <CalendarDays size={14} aria-hidden="true" /> {block.startDate} →{" "}
              {block.endDate} · {block.sessionCount} buổi
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
