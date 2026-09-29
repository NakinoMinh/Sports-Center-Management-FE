import { authorizeRoles } from "./accessControl";
import type { MembershipActor } from "../types/membership";

const STORAGE_KEY = "scms_audit_log_v1";

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

function read(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("invalid");
    return value.filter((item): item is AuditEntry =>
      !!item && typeof item.id === "string" && typeof item.createdAt === "string" &&
      typeof item.actorName === "string" && typeof item.action === "string" &&
      typeof item.entity === "string" && typeof item.entityId === "string" && typeof item.description === "string",
    );
  } catch {
    throw new Error("Không đọc được lịch sử thao tác trên trình duyệt.");
  }
}

export const auditService = {
  record(actor: MembershipActor, event: Omit<AuditEntry, "id" | "actorId" | "actorName" | "createdAt">) {
    const entries = read();
    const entry: AuditEntry = {
      ...event,
      id: crypto.randomUUID(),
      actorId: actor.id,
      actorName: actor.fullName || actor.username,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...entries].slice(0, 1000)));
    return entry;
  },
  list(actor: MembershipActor, filters: { query?: string; action?: string; from?: string; to?: string } = {}) {
    authorizeRoles(actor, ["CENTER_MANAGER"]);
    const needle = (filters.query ?? "").trim().toLocaleLowerCase("vi");
    return read().filter((entry) =>
      (!needle || `${entry.actorName} ${entry.action} ${entry.entity} ${entry.entityId} ${entry.description}`.toLocaleLowerCase("vi").includes(needle)) &&
      (!filters.action || entry.action === filters.action) &&
      (!filters.from || entry.createdAt.slice(0, 10) >= filters.from) &&
      (!filters.to || entry.createdAt.slice(0, 10) <= filters.to),
    );
  },
};
