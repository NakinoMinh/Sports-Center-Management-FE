import { CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import { ClassRegistrationPanel } from "./ClassRegistrationPanel";
import { CoachProfileTrigger } from "./CoachProfileTrigger";
import { formatSlotLabel } from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";
import type { ClassRegistration, CoachPublicProfile, TrainingClass } from "../../types/classes";
import type { ClassEnrollment } from "../../types/classes";

export interface MemberClassGroup {
  classId: string;
  className: string;
  sportName: string;
  /** Các ca học của chính lớp này, đã sắp theo ngày rồi tới giờ. */
  sessions: ClassRegistration[];
  trainingClass: TrainingClass | null;
  enrollment: ClassEnrollment | null;
}

const sessionStatusLabel = (registration: ClassRegistration): string =>
  registration.status === "CANCELED"
    ? "Đã hủy"
    : registration.session.status === "COMPLETED"
      ? "Đã học"
      : registration.session.status === "CANCELED"
        ? "Buổi bị hủy"
        : "Sắp học";

interface MemberClassCardProps {
  group: MemberClassGroup;
  onChanged: () => void | Promise<void>;
  loadCoachProfile: (accountId: string) => Promise<CoachPublicProfile>;
}

/**
 * Một lớp đã đăng ký, với các ca học nằm bên trong lớp.
 *
 * Thành viên đăng ký theo lớp nên màn hình cũng phải kể theo lớp; danh sách ca
 * học phẳng trước đây khiến một lớp 20 buổi trông như 20 lượt đăng ký rời.
 */
export function MemberClassCard({ group, onChanged, loadCoachProfile }: MemberClassCardProps) {
  const bookedCount = group.sessions.filter(
    (item) => item.status === "BOOKED",
  ).length;

  return (
    <article className="member-class-card">
      <div className="member-registration-main">
        <div>
          <span className="eyebrow">{group.sportName}</span>
          <h3>{group.className}</h3>
        </div>
        <span className="status-chip active">
          {group.sessions.length} ca học · {bookedCount} đang giữ chỗ
        </span>
      </div>

      {group.trainingClass && (
        <ClassRegistrationPanel
          trainingClass={group.trainingClass}
          enrollment={group.enrollment}
          onChanged={onChanged}
          layout="inline"
        />
      )}

      <ul className="member-class-sessions">
        {group.sessions.map((registration) => (
          <li className="member-class-session" key={registration.id}>
            <span className="member-class-session-date">
              <CalendarDays size={15} aria-hidden="true" />{" "}
              {formatDate(registration.session.date)}
            </span>
            <span>
              <Clock3 size={15} aria-hidden="true" />{" "}
              {formatSlotLabel(
                registration.session.startTime,
                registration.session.endTime,
              )}
            </span>
            <span>
              <UserRound size={15} aria-hidden="true" />{" "}
              <CoachProfileTrigger
                coachId={registration.session.coachId}
                coachName={registration.session.coachName}
                loadProfile={loadCoachProfile}
              />
            </span>
            <span>
              <MapPin size={15} aria-hidden="true" />{" "}
              {registration.session.roomName}
            </span>
            <span
              className={`status-chip ${registration.status === "BOOKED" ? "active" : "canceled"}`}
            >
              {sessionStatusLabel(registration)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
