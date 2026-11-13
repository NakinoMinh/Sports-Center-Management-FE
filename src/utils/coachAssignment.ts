import type { ClassSession, CoachOption } from "../types/assignCoach";
import type { TrainingClass } from "../types/classes";
import { isCoachSuitableForSport, timeRangesOverlap } from "./classSchedule";
import { formatDate } from "./format";

export const getAssignableClassSessions = (
  sessions: readonly ClassSession[],
  classId: string,
  now: Date = new Date(),
): ClassSession[] =>
  sessions.filter(
    (session) =>
      String(session.classId) === classId &&
      session.status === "SCHEDULED" &&
      Date.parse(session.startsAt) > now.getTime(),
  );

export type ClassAssignmentStatus =
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELED"
  | "UNSCHEDULED";

export const CLASS_ASSIGNMENT_STATUS_LABELS: Record<ClassAssignmentStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  ONGOING: "Đang diễn ra",
  COMPLETED: "Đã hoàn thành",
  CANCELED: "Đã hủy",
  UNSCHEDULED: "Chưa lên lịch",
};

export const getClassAssignmentSummary = (
  classId: string,
  sessions: readonly ClassSession[],
  now: Date = new Date(),
) => {
  const classSessions = sessions.filter((session) => String(session.classId) === classId);
  const upcomingSessions = getAssignableClassSessions(classSessions, classId, now);
  const activeSessions = classSessions.filter(
    (session) => session.status !== "CANCELED" && session.status !== "CANCELLED",
  );
  const ongoingSessions = activeSessions.filter((session) =>
    session.status === "ONGOING" || (
      session.status === "SCHEDULED" &&
      Date.parse(session.startsAt) <= now.getTime() &&
      Date.parse(session.endsAt) > now.getTime()
    ),
  );
  const currentSessions = [...ongoingSessions, ...upcomingSessions];
  const assignedSessions = currentSessions.length > 0 ? currentSessions : activeSessions;
  const coachId = assignedSessions[0]?.coachId ?? "";
  // Chỉ suy ra HLV phụ trách chung khi tất cả buổi liên quan cùng một người.
  const hasCommonCoach = Boolean(coachId) && assignedSessions.every(
    (session) => session.coachId === coachId,
  );
  const roomSessions = assignedSessions.length > 0 ? assignedSessions : classSessions;
  const roomNames = [...new Set(roomSessions.map((session) => session.roomName).filter(Boolean))];
  const dates = (activeSessions.length > 0 ? activeSessions : classSessions)
    .map((session) => session.date.slice(0, 10))
    .filter(Boolean)
    .sort();
  let status: ClassAssignmentStatus = "COMPLETED";
  if (ongoingSessions.length > 0) status = "ONGOING";
  else if (upcomingSessions.length > 0) status = "SCHEDULED";
  else if (classSessions.length === 0) status = "UNSCHEDULED";
  else if (activeSessions.length === 0) status = "CANCELED";

  return {
    upcomingSessions,
    coachId: hasCommonCoach ? coachId : "",
    coachName: hasCommonCoach
      ? assignedSessions.find((session) => session.coachName)?.coachName ?? ""
      : "",
    roomName: roomNames.length === 1 ? roomNames[0] : roomNames.length > 1 ? "Nhiều phòng" : "—",
    roomNames,
    startDate: dates[0] ?? "",
    endDate: dates.at(-1) ?? "",
    status,
  };
};

export type ClassCoachAvailability = {
  isAvailable: boolean;
  reason: string;
};

export const getClassCoachAvailability = (
  coach: CoachOption,
  trainingClass: Pick<TrainingClass, "id" | "sportId" | "sportName" | "status">,
  sessions: readonly ClassSession[],
  now: Date = new Date(),
): ClassCoachAvailability => {
  if (trainingClass.status === "ARCHIVED") {
    return { isAvailable: false, reason: "Lớp đã lưu trữ nên không thể phân công." };
  }

  const classSessions = getAssignableClassSessions(sessions, trainingClass.id, now);
  if (classSessions.length === 0) {
    return { isAvailable: false, reason: "Lớp chưa có buổi học sắp tới để phân công." };
  }
  if (coach.status.toLowerCase() !== "active") {
    return { isAvailable: false, reason: "Huấn luyện viên đã ngừng hoạt động." };
  }
  if (!isCoachSuitableForSport(coach, trainingClass.sportName, Number(trainingClass.sportId))) {
    return { isAvailable: false, reason: `Không phụ trách bộ môn ${trainingClass.sportName}.` };
  }

  // Kiểm tra cả những buổi của chính lớp: một HLV không thể dạy hai buổi đồng thời.
  for (const target of classSessions) {
    const conflict = sessions.find(
      (session) =>
        session.id !== target.id &&
        (session.status === "SCHEDULED" || session.status === "ONGOING") &&
        (String(session.classId) === trainingClass.id || session.coachId === coach.accountId) &&
        session.date.slice(0, 10) === target.date.slice(0, 10) &&
        timeRangesOverlap(
          { startTime: session.startTime.slice(0, 5), endTime: session.endTime.slice(0, 5) },
          { startTime: target.startTime.slice(0, 5), endTime: target.endTime.slice(0, 5) },
        ),
    );
    if (conflict) {
      return {
        isAvailable: false,
        reason: `Trùng lịch lớp ${conflict.className} ngày ${formatDate(conflict.date)}.`,
      };
    }
  }

  if (classSessions.every((session) => session.coachId === coach.accountId)) {
    return { isAvailable: false, reason: "Đang phụ trách toàn bộ buổi học sắp tới của lớp." };
  }
  return { isAvailable: true, reason: "Phù hợp với toàn bộ lịch học của lớp." };
};
