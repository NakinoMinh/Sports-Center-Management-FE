/**
 * Quyền bộ môn của gói tập (FR-09: "Gói cho phép tham gia lớp đó").
 *
 * Không có cấu hình này thì luật `PACKAGE_NOT_ELIGIBLE` của UC24 không bao giờ
 * bật được: server có chỗ kiểm nhưng không có dữ liệu để kiểm.
 */

/** Gói tập rút gọn, chỉ đủ để hiển thị ở màn hình cấu hình quyền. */
export interface PackageSummary {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  isActive: boolean;
}

/**
 * Bộ môn một gói được phép tham gia.
 *
 * `sportIds` rỗng nghĩa là gói vào được **mọi** bộ môn — nhờ quy ước này, các
 * gói đã bán từ Sprint 1 giữ nguyên quyền lợi mà không cần migration dữ liệu.
 */
export interface PackageSportEntitlement {
  packageId: string;
  sportIds: string[];
  allowsAllSports: boolean;
}
