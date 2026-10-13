export type TeachingSessionStatus =
  | "SCHEDULED"
  | "CANCELED"
  | "CANCELLED"
  | "COMPLETED";

export interface TeachingSession {
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

  status: TeachingSessionStatus;
  notes: string | null;

  cancelReason?: string | null;
  canceledAt?: string | null;
  updatedAt?: string | null;
}

export interface TeachingSchedulePage {
  items: TeachingSession[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
