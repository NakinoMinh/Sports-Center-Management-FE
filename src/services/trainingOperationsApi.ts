import { apiRequest } from "./apiClient";
import type { UserRole } from "../types/auth";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";
export type FitnessLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ProgressRating = "EXCEEDED" | "ON_TRACK" | "NEEDS_IMPROVEMENT";
export type TrainingPlanType = "INDIVIDUAL" | "CLASS";

export interface SessionAttendanceItem {
  registrationId: number;
  memberId: string;
  attendanceStatus?: AttendanceStatus | null;
  attendanceNote?: string | null;
  recordedAt?: string | null;
  fitnessGoal: string;
  fitnessLevel: FitnessLevel;
  sessionClassName?: string;
  sessionDate?: string;
  sessionTimeRange?: string;
  sessionRoomName?: string;
  sessionStatus?: string;
  canTakeAttendance?: boolean;
  attendanceBlockedReason?: string | null;
}

export interface TrainingExerciseItem {
  name: string;
  sets: number;
  reps: string;
  durationMinutes: number;
  note?: string | null;
}

export interface TrainingPlanDto {
  id: number;
  planType: TrainingPlanType;
  memberId?: string | null;
  memberName?: string | null;
  classId?: number | null;
  className?: string | null;
  coachName?: string;
  title: string;
  goal: string;
  exercises: TrainingExerciseItem[];
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface TrainingResultDto {
  id: number;
  memberId?: string;
  memberName?: string;
  coachName?: string;
  sessionId?: number | null;
  planId?: number | null;
  recordedDate: string;
  completedExercises: string;
  completionRate: number;
  progressRating: ProgressRating;
  resultSummary: string;
  coachFeedback: string;
  createdAt: string;
}

export interface CoachStudentProfileDto {
  memberId: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  fitnessGoal: string;
  fitnessLevel: FitnessLevel;
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  notes?: string | null;
  enrolledClassIds?: number[];
  enrolledClassNames?: string[];
  attendedCount?: number;
  totalRegisteredSessions?: number;
}

export interface CoachWorkspaceDto {
  classes: { id: number; name: string; sportName: string }[];
  sessions: {
    id: number;
    classId: number;
    className: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    roomName: string;
    status?: string;
    isPastOrToday?: boolean;
    bookedMemberIds?: string[];
  }[];
  students: CoachStudentProfileDto[];
  plans: TrainingPlanDto[];
  results: TrainingResultDto[];
}

export interface MemberEligibilityInfo {
  memberId: string;
  canCheckIn: boolean;
  checkedInToday: boolean;
  currentlyInCenter: boolean;
  packageName: string;
  endDate: string;
  statusText: string;
}

export interface MemberWorkspaceDto {
  profile: {
    memberId: string;
    fitnessGoal: string;
    fitnessLevel: FitnessLevel;
    currentWeightKg?: number | null;
    targetWeightKg?: number | null;
    notes?: string | null;
  };
  plans: TrainingPlanDto[];
  results: TrainingResultDto[];
  classAttendanceHistory: {
    id: number;
    sessionId: number;
    className: string;
    sessionDate: string;
    timeRange: string;
    roomName: string;
    status: AttendanceStatus;
    note?: string | null;
    recordedAt: string;
  }[];
  centerVisitHistory: {
    id: string;
    visitDate: string;
    checkedInAt: string;
    checkedOutAt?: string | null;
    note?: string | null;
  }[];
}

export const trainingOperationsApi = {
  // Cluster 1: Class Attendance & Reception
  getSessionAttendance(sessionId: number): Promise<SessionAttendanceItem[]> {
    return apiRequest<SessionAttendanceItem[]>(
      `/TrainingAndOperations/sessions/${sessionId}/attendance`,
    );
  },

  recordSessionAttendance(
    sessionId: number,
    registrationId: number,
    input: { status: AttendanceStatus; note?: string },
  ): Promise<SessionAttendanceItem> {
    return apiRequest<SessionAttendanceItem>(
      `/TrainingAndOperations/sessions/${sessionId}/registrations/${registrationId}/attendance`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  },

  markAllSessionAttendancePresent(
    sessionId: number,
  ): Promise<{ markedCount: number; totalBooked: number }> {
    return apiRequest(
      `/TrainingAndOperations/sessions/${sessionId}/attendance/mark-all-present`,
      {
        method: "POST",
      },
    );
  },

  getReceptionSnapshot(): Promise<{
    version: number;
    visits: {
      id: string;
      memberId: string;
      date: string;
      checkedInAt: string;
      checkedOutAt?: string;
      checkedInBy: string;
      checkedOutBy?: string;
      note?: string;
    }[];
    requests: {
      id: string;
      memberId: string;
      category: string;
      subject: string;
      note: string;
      status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
      resolutionNote?: string;
      createdBy: string;
      updatedBy?: string;
      createdAt: string;
      updatedAt: string;
    }[];
    memberEligibility?: Record<string, MemberEligibilityInfo>;
  }> {
    return apiRequest("/TrainingAndOperations/reception/snapshot");
  },

  checkInMember(input: { memberId: string; note?: string }): Promise<{ id: string }> {
    return apiRequest("/TrainingAndOperations/reception/check-in", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  checkOutMember(visitId: string): Promise<{ id: string }> {
    return apiRequest(`/TrainingAndOperations/reception/visits/${encodeURIComponent(visitId)}/check-out`, {
      method: "PUT",
    });
  },

  updateSubscriptionSuspension(
    subscriptionId: number | string,
    input: { isSuspended: boolean; reason?: string },
  ): Promise<{
    id: number;
    memberId: string;
    isSuspended: boolean;
    suspensionReason?: string | null;
    endDate?: string;
    compensatedDays?: number;
  }> {
    return apiRequest(
      `/TrainingAndOperations/subscriptions/${encodeURIComponent(String(subscriptionId))}/suspension`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  },

  createSupportRequest(input: {
    memberId: string;
    category: string;
    subject: string;
    note: string;
  }): Promise<{ id: string }> {
    return apiRequest("/TrainingAndOperations/reception/support-requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateSupportRequest(
    requestId: string,
    input: { status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"; resolutionNote: string },
  ): Promise<{ id: string; status: string }> {
    return apiRequest(
      `/TrainingAndOperations/reception/support-requests/${encodeURIComponent(requestId)}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
    );
  },

  // Cluster 2: Coach & Member Training Workspace
  getCoachWorkspace(): Promise<CoachWorkspaceDto> {
    return apiRequest<CoachWorkspaceDto>("/TrainingAndOperations/coach/workspace");
  },

  getMemberWorkspace(): Promise<MemberWorkspaceDto> {
    return apiRequest<MemberWorkspaceDto>("/TrainingAndOperations/member/workspace");
  },

  upsertStudentProfile(
    memberId: string,
    input: {
      fitnessGoal: string;
      fitnessLevel: FitnessLevel;
      currentWeightKg?: number | null;
      targetWeightKg?: number | null;
      notes?: string | null;
    },
  ): Promise<void> {
    return apiRequest(`/TrainingAndOperations/students/${encodeURIComponent(memberId)}/profile`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  createTrainingPlan(input: {
    planType: TrainingPlanType;
    memberId?: string;
    classId?: number;
    title: string;
    goal: string;
    exercises: TrainingExerciseItem[];
    startDate: string;
    endDate: string;
  }): Promise<{ id: number }> {
    return apiRequest("/TrainingAndOperations/coach/plans", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  createTrainingResult(input: {
    memberId: string;
    sessionId?: number;
    planId?: number;
    recordedDate?: string;
    completedExercises: string;
    completionRate: number;
    progressRating: ProgressRating;
    resultSummary: string;
    coachFeedback: string;
  }): Promise<{ id: number }> {
    return apiRequest("/TrainingAndOperations/coach/results", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  // Cluster 3: Role Permissions
  getPermissions(): Promise<Record<string, UserRole[]>> {
    return apiRequest<Record<string, UserRole[]>>("/TrainingAndOperations/permissions");
  },

  updatePermission(input: {
    featureKey: string;
    allowedRoles: UserRole[];
  }): Promise<{ featureKey: string; allowedRoles: UserRole[] }> {
    return apiRequest("/TrainingAndOperations/permissions", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
};
