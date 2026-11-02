import type {
  ClassRegistrationStatusFilter,
  ClassReport,
  MemberReport,
  ReportGroupBy,
  ReportTab,
  RevenueReport,
} from "../types/reports";
import { apiRequest } from "./apiClient";

/**
 * Escapes a CSV cell value according to RFC 4180 and neutralizes CSV/Excel
 * formula injection (=, +, -, @, \t, \r) by prefixing a single quote.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let text = String(value);
  const trimmedStart = text.replace(/^ +/, "");
  if (trimmedStart.length > 0 && /^[=+\-@\t\r]/.test(trimmedStart[0])) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsvContent(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function triggerCsvDownload(csvContent: string, fileName: string): void {
  const normalized = csvContent.startsWith("\uFEFF")
    ? csvContent
    : `\uFEFF${csvContent}`;
  const blob = new Blob([normalized], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const reportApi = {
  async getRevenueReport(params: {
    from?: string;
    to?: string;
    groupBy?: ReportGroupBy;
    paymentMethod?: string;
  }): Promise<RevenueReport> {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.groupBy) query.set("groupBy", params.groupBy);
    if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
    const qs = query.toString();
    return apiRequest<RevenueReport>(`/reports/revenue${qs ? `?${qs}` : ""}`);
  },

  async getMemberReport(params: {
    from?: string;
    to?: string;
  }): Promise<MemberReport> {
    const query = new URLSearchParams();
    if (params.from && params.to) {
      query.set("from", params.from);
      query.set("to", params.to);
    }
    const qs = query.toString();
    return apiRequest<MemberReport>(`/reports/members${qs ? `?${qs}` : ""}`);
  },

  async getClassReport(params: {
    from?: string;
    to?: string;
    classId?: number;
    sportId?: number;
    registrationStatus?: ClassRegistrationStatusFilter;
    page?: number;
    pageSize?: number;
  }): Promise<ClassReport> {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.classId) query.set("classId", String(params.classId));
    if (params.sportId) query.set("sportId", String(params.sportId));
    if (params.registrationStatus) {
      query.set("registrationStatus", params.registrationStatus);
    }
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiRequest<ClassReport>(`/reports/classes${qs ? `?${qs}` : ""}`);
  },

  async exportReportCsv(
    reportType: ReportTab,
    params: {
      from?: string;
      to?: string;
      groupBy?: ReportGroupBy;
      paymentMethod?: string;
      classId?: number;
      sportId?: number;
      registrationStatus?: ClassRegistrationStatusFilter;
    },
  ): Promise<{ csvText: string; fileName: string }> {
    const query = new URLSearchParams();
    if (reportType === "members") {
      if (params.from && params.to) {
        query.set("from", params.from);
        query.set("to", params.to);
      }
    } else {
      if (params.from) query.set("from", params.from);
      if (params.to) query.set("to", params.to);
    }
    if (reportType === "revenue") {
      if (params.groupBy) query.set("groupBy", params.groupBy);
      if (params.paymentMethod) query.set("paymentMethod", params.paymentMethod);
    }
    if (reportType === "classes") {
      if (params.classId) query.set("classId", String(params.classId));
      if (params.sportId) query.set("sportId", String(params.sportId));
      if (params.registrationStatus) {
        query.set("registrationStatus", params.registrationStatus);
      }
    }
    const qs = query.toString();
    const csvText = await apiRequest<string>(
      `/reports/${reportType}/export${qs ? `?${qs}` : ""}`,
    );
    const rangeSuffix = `${(params.from ?? "all").replace(/-/g, "")}-${(params.to ?? "all").replace(/-/g, "")}`;
    const prefix =
      reportType === "revenue"
        ? "revenue-report"
        : reportType === "members"
          ? "member-report"
          : "class-report";
    return {
      csvText,
      fileName: `${prefix}-${rangeSuffix}.csv`,
    };
  },
};
