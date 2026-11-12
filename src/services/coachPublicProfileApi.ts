import type { CoachPublicProfile } from "../types/classes";
import { apiRequest } from "./apiClient";

type CoachPublicProfileDto = {
  accountId?: unknown;
  fullName?: unknown;
  workSchedule?: unknown;
  disciplines?: unknown;
};

const displayText = (value: unknown, fallback: string): string => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
};

const mapCoachPublicProfile = (
  dto: CoachPublicProfileDto,
): CoachPublicProfile => {
  const disciplines = Array.isArray(dto.disciplines)
    ? dto.disciplines.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const value = item as {
          disciplineId?: unknown;
          disciplineName?: unknown;
        };
        const disciplineName = displayText(value.disciplineName, "");
        if (!disciplineName) return [];
        return [
          {
            disciplineId: String(value.disciplineId ?? ""),
            disciplineName,
          },
        ];
      })
    : [];

  return {
    accountId: String(dto.accountId ?? ""),
    fullName: displayText(
      dto.fullName,
      "Huấn luyện viên chưa cập nhật tên",
    ),
    workSchedule: displayText(
      dto.workSchedule,
      "Chưa cập nhật lịch làm việc",
    ),
    disciplines,
  };
};

export const coachPublicProfileApi = {
  async get(accountId: string): Promise<CoachPublicProfile> {
    const dto = await apiRequest<CoachPublicProfileDto>(
      `/coaches/${encodeURIComponent(accountId)}/public-profile`,
    );
    return mapCoachPublicProfile(dto);
  },
};

type ProfileLoader = (accountId: string) => Promise<CoachPublicProfile>;

/** Cache theo vòng đời trang: giữ cả request đang chạy và kết quả đã tải. */
export const createCoachProfileCache = (
  load: ProfileLoader = coachPublicProfileApi.get,
): {
  get(accountId: string): Promise<CoachPublicProfile>;
  clear(): void;
} => {
  const entries = new Map<string, Promise<CoachPublicProfile>>();

  return {
    get(accountId: string): Promise<CoachPublicProfile> {
      const existing = entries.get(accountId);
      if (existing) return existing;

      const pending = load(accountId).catch((error: unknown) => {
        entries.delete(accountId);
        throw error;
      });
      entries.set(accountId, pending);
      return pending;
    },
    clear(): void {
      entries.clear();
    },
  };
};
