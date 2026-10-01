import { apiRequest } from "./apiClient";

export interface AuditLogItemDto {
  id: string;
  accountId: string | null;
  accountName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  createdAt: string;
}

export interface PagedAuditLogResultDto {
  items: AuditLogItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface AuditLogFilters {
  query?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

const mapDtoToEntry = (dto: AuditLogItemDto): AuditEntry => ({
  id: dto.id,
  actorId: dto.accountId ?? "",
  actorName: dto.accountName ?? "Hệ thống",
  action: dto.action,
  entity: dto.entityType ?? "",
  entityId: dto.entityId ?? "",
  description: dto.description ?? "",
  createdAt: dto.createdAt,
});

export const auditApi = {
  async list(filters: AuditLogFilters = {}): Promise<AuditEntry[]> {
    const params: URLSearchParams = new URLSearchParams({
      page: String(filters.page ?? 1),
      pageSize: String(filters.pageSize ?? 50),
    });

    if (filters.query?.trim()) params.set("search", filters.query.trim());
    if (filters.action?.trim() && filters.action !== "ALL") params.set("action", filters.action.trim());
    if (filters.entityType?.trim() && filters.entityType !== "ALL") params.set("entityType", filters.entityType.trim());
    if (filters.from?.trim()) params.set("fromDate", filters.from.trim());
    if (filters.to?.trim()) params.set("toDate", filters.to.trim());

    const result: PagedAuditLogResultDto = await apiRequest<PagedAuditLogResultDto>(`/AuditLog?${params.toString()}`);
    return result.items.map(mapDtoToEntry);
  },
};
