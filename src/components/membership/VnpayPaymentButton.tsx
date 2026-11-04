import { useEffect, useState } from "react";
import { useToast } from "../../hooks/useToast";
import { describeError } from "../../services/apiErrors";
import { vnpayApi } from "../../services/vnpayApi";
import { demoPaymentApi } from "../../services/demoPaymentApi";
import type { MembershipInvoice } from "../../types/membership";

export function VnpayPaymentButton({ invoice }: { invoice: MembershipInvoice }) {
  const [isBusy, setBusy] = useState(false);
  const toast = useToast();
  const [isDemoEnabled, setDemoEnabled] = useState<boolean | null>(null);
  const isEligible = invoice.status === "PENDING_PAYMENT" && invoice.paymentMethod === "BANK_TRANSFER" &&
    (invoice.kind === "REGISTER" || invoice.kind === "RENEW");
  useEffect(() => {
    if (!isEligible) return;
    let disposed = false;
    demoPaymentApi.configuration().then(config => {
      if (!disposed) setDemoEnabled(config.enabled);
    }).catch(() => { if (!disposed) setDemoEnabled(false); });
    return () => { disposed = true; };
  }, [isEligible]);
  if (!isEligible) return null;
  async function handlePay() {
    if (isBusy) return;
    setBusy(true);
    try { window.location.assign(await vnpayApi.checkout(invoice.id)); }
    catch (error) { toast.error(describeError(error)); setBusy(false); }
  }
  if (isDemoEnabled) return <div className="vnpay-payment-action">
    <a className="button primary" href={`/payments/transfer?invoiceId=${invoice.id}`}>Chuyển khoản</a>
  </div>;
  return <div className="vnpay-payment-action">
    <button className="button primary" disabled={isBusy || isDemoEnabled === null} onClick={handlePay}>
      {isDemoEnabled === null ? "Đang tải thanh toán…" : isBusy ? "Đang mở VNPAY…" : "Thanh toán qua VNPAY"}
    </button>
    <p className="invoice-note">Gói tập được cập nhật sau khi thanh toán được xác nhận.</p>
  </div>;
}
