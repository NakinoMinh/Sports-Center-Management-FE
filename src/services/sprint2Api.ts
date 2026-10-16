import { apiRequest } from "./apiClient";
import type { PageResult, SportItem, SportInput, ClassNotification } from "../types/sprint2";
export const sprint2Api = {
  sports(search = "", page = 1, isActive?: boolean): Promise<PageResult<SportItem>> {
    const query = new URLSearchParams({ search, page: String(page), pageSize: "20" });
    if (isActive !== undefined) query.set("isActive", String(isActive));
    return apiRequest("/Sport?" + query);
  },
  saveSport(input: SportInput, id?: number): Promise<SportItem> {
    return apiRequest(id ? "/Sport/" + id : "/Sport", { method: id ? "PUT" : "POST", body: JSON.stringify({name: input.name.trim(), description: input.description.trim()}) });
  },
  setSportActive(id: number, isActive: boolean): Promise<{id: number; isActive: boolean}> {
    return apiRequest("/Sport/" + id + "/status", {method: "PATCH", body: JSON.stringify({isActive})});
  },
  notifications(page = 1, isRead?: boolean): Promise<PageResult<ClassNotification>> {
    const query = new URLSearchParams({page: String(page), pageSize: "20"});
    if (isRead !== undefined) query.set("isRead", String(isRead));
    return apiRequest("/Notification/me?" + query);
  },
  async unreadCount(): Promise<number> {
    return (await apiRequest<PageResult<ClassNotification>>("/Notification/me?isRead=false&page=1&pageSize=1")).totalItems;
  },
  markRead(id: number, isRead: boolean): Promise<ClassNotification> {
    return apiRequest("/Notification/" + id + "/read", {method: "PATCH", body: JSON.stringify({isRead})});
  },
};
