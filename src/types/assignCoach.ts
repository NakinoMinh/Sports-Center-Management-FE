export interface CoachOption {
  accountId: string;
  fullName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  workSchedule: string | null;
  status: string;
}

export interface ClassSession {
  id: number;
  classId: number;
  className: string;
  sportId: number;
  sportName: string;
  coachId: string;
  coachName: string;
  roomId: number;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  status: string;
  notes: string | null;
}

export interface AssignCoachInput {
  sessionId: number;
  coachId: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
