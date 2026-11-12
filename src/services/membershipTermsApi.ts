import type {
  CurrentMembershipTerms,
  MemberTermsStatus,
} from "../types/membership";
import { apiRequest } from "./apiClient";

export const membershipTermsApi = {
  getCurrent(): Promise<CurrentMembershipTerms> {
    return apiRequest<CurrentMembershipTerms>("/MembershipTerms/current");
  },

  accept(version: string, contentHash: string): Promise<MemberTermsStatus> {
    return apiRequest<MemberTermsStatus>("/MembershipTerms/current/accept", {
      method: "POST",
      body: JSON.stringify({ version, contentHash }),
    });
  },

  getMemberStatus(memberId: string): Promise<MemberTermsStatus> {
    return apiRequest<MemberTermsStatus>(
      `/MembershipTerms/members/${encodeURIComponent(memberId)}/status`,
    );
  },
};
