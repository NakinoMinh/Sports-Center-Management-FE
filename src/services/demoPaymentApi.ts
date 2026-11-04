import { apiRequest } from "./apiClient";
import type { VnpayStatus } from "./vnpayApi";

export const demoPaymentApi = {
  configuration(): Promise<{ enabled: boolean }> {
    return apiRequest("/payments/demo/config");
  },
  confirm(invoiceId: string): Promise<VnpayStatus> {
    if (!/^[1-9]\d*$/.test(invoiceId)) return Promise.reject(new Error("Mã hóa đơn không hợp lệ."));
    return apiRequest(`/payments/demo/${invoiceId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmSimulation: true }),
    });
  },
};
