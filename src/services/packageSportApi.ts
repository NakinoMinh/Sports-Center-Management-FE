/**
 * Quyền bộ môn của gói tập (FR-09).
 *
 * FR-09 ghi Member chỉ đăng ký lớp được khi "gói cho phép tham gia lớp đó",
 * nhưng cả Sprint 1 lẫn swimlane Sprint 2 đều không có chỗ cấu hình quan hệ
 * gói–bộ môn. Thiếu nó thì mã lỗi `PACKAGE_NOT_ELIGIBLE` của UC24 vĩnh viễn
 * không bật được: server có chỗ kiểm nhưng không có dữ liệu để kiểm.
 *
 * Gọi trực tiếp `GET/PUT /api/MembershipPackage/{id}/sports`. Nhánh dự liệu
 * mẫu đã bỏ: quyền bộ môn quyết định Member có đặt được lớp hay không, nên
 * cấu hình trên dự liệu trong bộ nhớ không được coi là đã lưu.
 */

import { apiRequest } from "./apiClient";
import { membershipApi } from "./membershipApi";
import type {
  PackageSportEntitlement,
  PackageSummary,
} from "../types/packageSports";

interface EntitlementDto {
  packageId: number | string;
  sportIds?: (number | string)[] | null;
  allowsAllSports?: boolean;
}

/**
 * `sportIds` rỗng nghĩa là gói vào được mọi bộ môn. Quy ước này giữ cho các gói
 * đã bán từ Sprint 1 không mất quyền lợi khi bật tính năng, nên FE phải suy ra
 * `allowsAllSports` kể cả khi server không gửi cờ đó.
 */
export const mapEntitlement = (dto: EntitlementDto): PackageSportEntitlement => {
  const sportIds = (dto.sportIds ?? []).map(String);
  return {
    packageId: String(dto.packageId),
    sportIds,
    allowsAllSports: dto.allowsAllSports ?? sportIds.length === 0,
  };
};

export const packageSportApi = {
  /** Danh sách gói để chọn. Dùng lại API gói của Sprint 1 khi có backend. */
  async listPackages(): Promise<PackageSummary[]> {
    const items = await membershipApi.listPackages();
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      durationMonths: item.durationMonths,
      price: item.price,
      isActive: item.isActive,
    }));
  },

  async getEntitlement(packageId: string): Promise<PackageSportEntitlement> {
    const result = await apiRequest<EntitlementDto>(
      `/MembershipPackage/${packageId}/sports`,
    );
    return mapEntitlement(result);
  },

  async saveEntitlement(
    packageId: string,
    sportIds: string[],
  ): Promise<PackageSportEntitlement> {
    const result = await apiRequest<EntitlementDto>(
      `/MembershipPackage/${packageId}/sports`,
      {
        method: "PUT",
        body: JSON.stringify({
          // ID bộ môn là số ở backend; gửi chuỗi sẽ hỏng model binding.
          sportIds: sportIds.map((id) =>
            Number.isNaN(Number(id)) ? id : Number(id),
          ),
        }),
      },
    );
    return mapEntitlement(result);
  },
};
