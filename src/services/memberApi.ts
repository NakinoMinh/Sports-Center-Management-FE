import { apiRequest } from "./apiClient";
import type { MembershipActor } from "../types/membership";

export interface MemberListItemDto {
  accountId: string;
  memberCode: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  status: string;
  dateOfBirth: string | null;
  createdAt: string;
}

export interface PagedMemberResultDto {
  items: MemberListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface CreateMemberResponseDto {
  accountId: string;
  email: string;
  memberCode: string;
}

export interface CreateMemberInput {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

export interface UpdateMemberInput {
  fullName: string;
  phone: string;
  dateOfBirth: string;
}

const mapMemberDtoToActor = (dto: MemberListItemDto): MembershipActor => ({
  id: dto.accountId,
  username: dto.memberCode,
  email: dto.email,
  role: "MEMBER",
  fullName: dto.fullName || dto.memberCode || dto.email.split("@")[0],
  phone: dto.phone ?? undefined,
  dateOfBirth: dto.dateOfBirth ?? undefined,
  createdAt: dto.createdAt,
  failedAttempts: 0,
  isLocked: false,
  isActive: dto.status === "Active",
});

export const memberApi = {
  async listMembers(
    page = 1,
    pageSize = 20,
    search = "",
    status = "ALL",
  ): Promise<{ items: MembershipActor[]; total: number; pages: number; page: number }> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (status === "ACTIVE") params.set("status", "Active");
    else if (status === "INACTIVE") params.set("status", "Inactive");

    const result = await apiRequest<PagedMemberResultDto>(`/Member?${params.toString()}`);
    return {
      items: result.items.map(mapMemberDtoToActor),
      total: result.totalItems,
      pages: result.totalPages,
      page: result.page,
    };
  },

  async listAllMembers(search = "", status = "ALL"): Promise<MembershipActor[]> {
    const items: MembershipActor[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await memberApi.listMembers(page, 20, search, status);
      items.push(...result.items);
      totalPages = Math.max(1, result.pages);
      page += 1;
    } while (page <= totalPages);
    return items;
  },

  async updateMember(accountId: string, input: UpdateMemberInput): Promise<void> {
    await apiRequest(`/Member/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify({
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        dateOfBirth: input.dateOfBirth ? input.dateOfBirth : null,
      }),
    });
  },

  async setMemberStatus(accountId: string, isActive: boolean): Promise<void> {
    await apiRequest(`/Member/${accountId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  async createMember(
    input: CreateMemberInput,
    password?: string,
  ): Promise<MembershipActor> {
    const initialPassword = password || "Test@12345";
    const memberCode = `MEM${Date.now().toString().slice(-6)}`;
    const created = await apiRequest<CreateMemberResponseDto>("/Account/Create_member", {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim(),
        password: initialPassword,
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        memberCode,
        dateOfBirth: input.dateOfBirth || null,
      }),
    });
    return {
      id: created.accountId,
      username: created.memberCode,
      email: created.email,
      role: "MEMBER",
      fullName: input.fullName.trim(),
      phone: input.phone.trim() || undefined,
      dateOfBirth: input.dateOfBirth || undefined,
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      isLocked: false,
      isActive: true,
    };
  },
};
