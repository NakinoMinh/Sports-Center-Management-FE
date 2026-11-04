import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { demoPaymentApi } from "../../services/demoPaymentApi";
import { vnpayApi, type VnpayStatus } from "../../services/vnpayApi";
import { describeError } from "../../services/apiErrors";
import { formatMoney } from "../../utils/format";

export function DemoPaymentPage() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoiceId") ?? "";
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<VnpayStatus | null>(null);
  const [error, setError] = useState("");
  const [isEnabled, setEnabled] = useState(false);
  const [isBusy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const [config, current] = await Promise.all([
          demoPaymentApi.configuration(), vnpayApi.status(invoiceId),
        ]);
        if (disposed) return;
        setInvoice(current);
        setEnabled(config.enabled);
        if (!config.enabled) setError("Thanh toán chuyển khoản hiện chưa khả dụng. Vui lòng liên hệ trung tâm.");
      } catch (failure) {
        if (!disposed) setError(describeError(failure));
      }
    }
    void load();
    return () => { disposed = true; };
  }, [invoiceId]);

  async function handleConfirm() {
    if (isBusy || !isEnabled || !invoice) return;
    setBusy(true);
    setError("");
    try {
      await demoPaymentApi.confirm(invoiceId);
      navigate(`/payments/result?invoiceId=${invoiceId}`, { replace: true });
    } catch (failure) {
      setError(describeError(failure));
      setBusy(false);
    }
  }

  const canConfirm = isEnabled && invoice?.status === "PENDING_PAYMENT" && invoice.paymentMethod === "BANK_TRANSFER";
  return <section className="panel">
    <span className="eyebrow">THANH TOÁN GÓI TẬP</span>
    <h1>Chuyển khoản</h1>
    <p>Kiểm tra số tiền và xác nhận để hoàn tất thanh toán.</p>
    {invoice && <>
      <p>Hóa đơn #{invoice.invoiceId}</p>
      <div className="invoice-total"><span>Số tiền thanh toán</span><strong>{formatMoney(invoice.amount)}</strong></div>
    </>}
    {!invoice && !error && <p>Đang tải hóa đơn…</p>}
    {error && <p role="alert">{error}</p>}
    {invoice && invoice.status !== "PENDING_PAYMENT" && <p>Hóa đơn này đã được xử lý. Bạn có thể xem kết quả trong lịch sử hóa đơn.</p>}
    <div className="toolbar">
      <button className="button primary" disabled={!canConfirm || isBusy} onClick={handleConfirm}>
        {isBusy ? "Đang xử lý…" : "Xác nhận thanh toán"}
      </button>
      <Link className="button secondary" to="/invoices">Quay lại hóa đơn</Link>
    </div>
  </section>;
}
