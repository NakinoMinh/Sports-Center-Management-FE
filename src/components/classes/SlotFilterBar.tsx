import { Clock3, Layers, ShieldCheck } from "lucide-react";
import type { ClassSession } from "../../types/classes";
import { CENTER_TIME_SLOTS, matchesTimeSlot } from "../../utils/classSchedule";

interface SlotFilterBarProps {
  sessions: readonly Pick<ClassSession, "startTime" | "endTime">[];
  selectedSlotId: string;
  onSelectSlot: (slotId: string) => void;
  title?: string;
  subtitle?: string;
}

export function SlotFilterBar({
  sessions,
  selectedSlotId,
  onSelectSlot,
  title = "Danh sách Khung giờ (Slot) cố định trong ngày",
  subtitle = "Mỗi lớp học đều diễn ra theo Slot cố định tại phòng tập chỉ định và có Huấn luyện viên đúng chuyên môn phụ trách.",
}: SlotFilterBarProps) {
  return (
    <div className="slot-overview-bar">
      <div className="slot-overview-header">
        <div className="slot-overview-heading">
          <div className="slot-overview-title">
            <Clock3 size={16} aria-hidden="true" />
            <strong>{title}</strong>
          </div>
          <p>{subtitle}</p>
        </div>
        <span className="slot-overview-badge">
          <ShieldCheck size={14} aria-hidden="true" />
          HLV trực tiếp quản lý · Không có giờ tập tự do
        </span>
      </div>

      <div
        className="slot-grid"
        role="group"
        aria-label="Danh sách khung giờ có sẵn"
      >
        <button
          type="button"
          className={`slot-card ${selectedSlotId === "ALL" ? "is-active" : ""}`}
          onClick={() => onSelectSlot("ALL")}
        >
          <div className="slot-card-top">
            <span className="slot-card-name">Tất cả khung giờ</span>
            <span
              className={`slot-card-count ${sessions.length > 0 ? "has-sessions" : ""}`}
            >
              {sessions.length} buổi
            </span>
          </div>
          <div className="slot-card-time">
            <Layers size={13} aria-hidden="true" />
            <span>Toàn bộ {CENTER_TIME_SLOTS.length} ca tập trong ngày</span>
          </div>
        </button>

        {CENTER_TIME_SLOTS.map((slot) => {
          const count = sessions.filter((item) =>
            matchesTimeSlot(item, slot.id),
          ).length;
          return (
            <button
              key={slot.id}
              type="button"
              className={`slot-card ${selectedSlotId === slot.id ? "is-active" : ""}`}
              onClick={() => onSelectSlot(slot.id)}
            >
              <div className="slot-card-top">
                <span className="slot-card-name">{slot.name}</span>
                <span
                  className={`slot-card-count ${count > 0 ? "has-sessions" : ""}`}
                >
                  {count} buổi
                </span>
              </div>
              <div className="slot-card-time">
                <Clock3 size={13} aria-hidden="true" />
                <span>
                  {slot.startTime} – {slot.endTime}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
