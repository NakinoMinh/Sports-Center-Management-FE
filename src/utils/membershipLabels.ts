/**
 * Vietnamese labels for the subscription states produced by
 * getMembershipStatusSummary. Shared so the manager and reception screens never
 * describe the same package differently.
 */
export const membershipStatusLabels: Record<string, string> = {
  ACTIVE: "Đang sử dụng",
  EXPIRED: "Đã hết hạn",
  SUSPENDED: "Tạm ngưng",
  UPCOMING: "Sắp bắt đầu",
  SCHEDULED_DOWNGRADE: "Sắp bắt đầu (hạ gói)",
  PENDING_PAYMENT: "Chờ thanh toán",
  REPLACED: "Đã thay thế",
  CANCELED: "Đã hủy",
  NONE: "Chưa có gói",
};
