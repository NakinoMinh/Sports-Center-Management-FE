export interface ClassRegistration {
  id: number;
  sessionId: number;
  memberAccountId: string;
  memberName: string;
  memberCode: string;
  status: string;
  registeredVia: string;
}

export interface ClassRosterPage {
  items: ClassRegistration[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
