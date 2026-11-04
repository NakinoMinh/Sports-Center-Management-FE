import { apiRequest } from "./apiClient";

export type VnpayStatus = { invoiceId: number; status: string; paymentMethod: string; amount: number; isDemo?: boolean };
type Checkout = { invoiceId: number; transactionReference: string; paymentUrl: string; isTestMode: boolean };

export const vnpayApi = {
  async checkout(invoiceId: string): Promise<string> {
    if (!/^[1-9]\d*$/.test(invoiceId)) throw new Error("Mã hóa đơn không hợp lệ.");
    const checkout = await apiRequest<Checkout>(`/payments/vnpay-sandbox/${invoiceId}/checkout`, { method: "POST" });
    const url = new URL(checkout.paymentUrl);
    if (!checkout.isTestMode || url.origin !== "https://sandbox.vnpayment.vn" || url.pathname !== "/paymentv2/vpcpay.html") {
      throw new Error("Địa chỉ thanh toán thử nghiệm không hợp lệ. Vui lòng liên hệ trung tâm.");
    }
    return url.href;
  },
  status(invoiceId: string): Promise<VnpayStatus> {
    if (!/^[1-9]\d*$/.test(invoiceId)) return Promise.reject(new Error("Mã hóa đơn không hợp lệ."));
    return apiRequest<VnpayStatus>(`/payments/vnpay-sandbox/${invoiceId}/status`);
  },
};
