export type ReportGroupBy = "DAY" | "MONTH";

export type ReportTab = "revenue" | "members" | "classes";

export type ClassRegistrationStatusFilter = "BOOKED" | "CANCELED" | "ALL";

export type ReportQuery = {
  tab: ReportTab;
  from?: string;
  to?: string;
  groupBy: ReportGroupBy;
  paymentMethod: "CASH";
  classId?: number;
  sportId?: number;
  registrationStatus: ClassRegistrationStatusFilter;
  page: number;
  pageSize: number;
};

export type ReportResult =
  | { tab: "revenue"; report: RevenueReport }
  | { tab: "members"; report: MemberReport }
  | { tab: "classes"; report: ClassReport };

export interface RevenueReportItem {
  period: string;
  paymentMethod: string;
  revenue: number;
  invoiceCount: number;
}

export interface RevenueReport {
  from?: string | null;
  to?: string | null;
  timeZoneId: string;
  groupBy: ReportGroupBy;
  paymentMethod: string;
  currency: string;
  totalRevenue: number;
  paidInvoiceCount: number;
  items: RevenueReportItem[];
}

export interface MemberReport {
  from?: string | null;
  to?: string | null;
  asOfDate: string;
  timeZoneId: string;
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  expiredMembers: number;
  suspendedMembers: number;
  upcomingMembers: number;
  pendingPaymentMembers: number;
  membersWithoutSubscription: number;
  inactiveAccounts: number;
}

export interface ClassReportItem {
  classId: number;
  className: string;
  sportId: number;
  sportName: string;
  sessionCount: number;
  canceledSessionCount: number;
  registrationCount: number;
  uniqueMemberCount: number;
}

export interface ClassReport {
  from?: string | null;
  to?: string | null;
  timeZoneId: string;
  classId?: number | null;
  sportId?: number | null;
  registrationStatus: ClassRegistrationStatusFilter;
  totalClasses: number;
  totalSessions: number;
  canceledSessions: number;
  totalRegistrations: number;
  uniqueMembers: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: ClassReportItem[];
}
