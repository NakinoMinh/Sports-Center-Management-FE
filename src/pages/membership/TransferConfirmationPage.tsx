import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { demoPaymentApi } from "../../services/demoPaymentApi";
import type { VnpayStatus } from "../../services/vnpayApi";
import { describeError } from "../../services/apiErrors";
import { formatMoney } from "../../utils/format";

export function TransferConfirmationPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  const [invoice, setInvoice] = useState<VnpayStatus | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let disposed = false;
    async function load() {
      setInvoice(null);
      setError("");
      try {
        const current = await demoPaymentApi.qrStatus(token);
        if (!disposed) setInvoice(current);
      } catch (failure) {
        if (!disposed) setError(describeError(failure));
      }
    }
    void load();
    return () => { disposed = true; };
  }, [token, refresh]);

  async function handleTransfer() {
    if (isBusy || invoice?.status !== "PENDING_PAYMENT") return;
    setBusy(true);
    setError("");
    try { setInvoice(await demoPaymentApi.confirmQr(token)); }
    catch (failure) { setError(describeError(failure)); }
    finally { setBusy(false); }
  }

  const isPaid = invoice?.status === "PAID";
  const canTransfer = invoice?.status === "PENDING_PAYMENT" && invoice.paymentMethod === "BANK_TRANSFER";
  return <main className="transfer-mobile-shell">
    <section className="panel transfer-mobile-card">
      <header className="transfer-mobile-brand"><ShieldCheck aria-hidden="true" /><strong>TITAN ARENA</strong><span>SPORTS & FITNESS CENTER</span></header>
      {isPaid ? <>
        <CheckCircle2 className="transfer-success-icon" size={64} aria-hidden="true" />
        <h1>Thanh toán thành công</h1>
        <p>Giao dịch đã được xác nhận. Gói tập của bạn đã được cập nhật.</p>
      </> : <><span className="eyebrow">CHUYỂN KHOẢN</span><h1>Xác nhận chuyển tiền</h1><p>Kiểm tra thông tin trước khi chuyển tiền.</p></>}
      {invoice && <dl className="transfer-summary">
        <div><dt>Người nhận</dt><dd>TITAN ARENA</dd></div>
        <div><dt>Nội dung</dt><dd>Thanh toán gói tập · HĐ #{invoice.invoiceId}</dd></div>
        <div><dt>Số tiền {isPaid ? "đã chuyển" : "chuyển"}</dt><dd className="transfer-amount">{formatMoney(invoice.amount)}</dd></div>
      </dl>}
      {!invoice && !error && <p role="status">Đang tải thông tin thanh toán…</p>}
      {invoice && !isPaid && !canTransfer && <p>Hóa đơn này đã được xử lý và không thể chuyển tiền. Vui lòng quay lại trang hóa đơn trên máy tính.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {canTransfer && <button className="button primary transfer-submit" onClick={handleTransfer} disabled={isBusy}>
        {isBusy ? "Đang chuyển tiền…" : "Chuyển tiền"} {!isBusy && <ArrowRight size={18} />}
      </button>}
      {!invoice && error && <button className="button secondary" onClick={() => setRefresh(value => value + 1)}>Kiểm tra lại</button>}
      {isPaid && <p className="transfer-muted" role="status">Bạn có thể đóng trang này. Kết quả thanh toán trên máy tính sẽ tự động cập nhật.</p>}
    </section>
  </main>;
}
