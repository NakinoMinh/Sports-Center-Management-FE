import { apiRequest } from "./apiClient";
import type { VnpayStatus } from "./vnpayApi";

export type TransferQrSession = {
  token: string;
  expiresAt: string;
  recipientName: string;
  invoice: VnpayStatus;
};

export const demoPaymentApi = {
  configuration(): Promise<{ enabled: boolean }> {
    return apiRequest("/payments/demo/config");
  },
  createQr(invoiceId: string): Promise<TransferQrSession> {
    if (!/^[1-9]\d*$/.test(invoiceId)) return Promise.reject(new Error("Mã hóa đơn không hợp lệ."));
    return apiRequest(`/payments/demo/${invoiceId}/qr`, { method: "POST" });
  },
  qrStatus(token: string): Promise<VnpayStatus> {
    return apiRequest("/payments/demo/qr/status", { method: "POST", body: JSON.stringify({ token }) });
  },
  confirmQr(token: string): Promise<VnpayStatus> {
    return apiRequest("/payments/demo/qr/confirm", {
      method: "POST", body: JSON.stringify({ token, confirmSimulation: true }),
    });
  },
  confirm(invoiceId: string): Promise<VnpayStatus> {
    if (!/^[1-9]\d*$/.test(invoiceId)) return Promise.reject(new Error("Mã hóa đơn không hợp lệ."));
    return apiRequest(`/payments/demo/${invoiceId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ confirmSimulation: true }),
    });
  },
};
