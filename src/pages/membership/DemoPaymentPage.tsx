import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { demoPaymentApi, type TransferQrSession } from "../../services/demoPaymentApi";
import { vnpayApi } from "../../services/vnpayApi";
import { describeError } from "../../services/apiErrors";
import { formatMoney } from "../../utils/format";
import { transferQrLink } from "../../utils/transferQr";

export function DemoPaymentPage() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoiceId") ?? "";
  const navigate = useNavigate();
  const [session, setSession] = useState<TransferQrSession | null>(null);
  const [qr, setQr] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let disposed = false;
    let poll: ReturnType<typeof setTimeout> | undefined;
    let clock: ReturnType<typeof setInterval> | undefined;
    async function load() {
      setError("");
      setSession(null);
      setQr("");
      setPaymentLink("");
      try {
        const invoice = await vnpayApi.status(invoiceId);
        if (disposed) return;
        if (invoice.status !== "PENDING_PAYMENT") {
          navigate(`/payments/result?invoiceId=${invoiceId}`, { replace: true });
          return;
        }
        const current = await demoPaymentApi.createQr(invoiceId);
        const origin = import.meta.env.VITE_PAYMENT_PUBLIC_URL?.trim() || window.location.origin;
        const link = transferQrLink(origin, current.token);
        const image = await QRCode.toDataURL(link, { width: 320, margin: 4, errorCorrectionLevel: "M" });
        if (disposed) return;
        setSession(current);
        setPaymentLink(link);
        setQr(image);
        const expiresAt = Date.parse(current.expiresAt);
        const tick = () => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
        tick();
        clock = setInterval(tick, 1000);
        async function check() {
          if (disposed || Date.now() >= expiresAt) return;
          try {
            const status = await vnpayApi.status(invoiceId);
            if (disposed) return;
            setError("");
            if (status.status !== "PENDING_PAYMENT") {
              navigate(`/payments/result?invoiceId=${invoiceId}`, { replace: true });
              return;
            }
          } catch (failure) {
            if (!disposed) setError(describeError(failure));
          }
          if (!disposed) poll = setTimeout(check, 2500);
        }
        poll = setTimeout(check, 2500);
      } catch (failure) {
        if (!disposed) setError(describeError(failure));
      }
    }
    void load();
    return () => { disposed = true; clearTimeout(poll); clearInterval(clock); };
  }, [invoiceId, refresh, navigate]);

  const isExpired = session !== null && remaining === 0;
  return <section className="panel transfer-checkout">
    <span className="eyebrow">THANH TOÁN GÓI TẬP</span>
    <h1>Chuyển khoản</h1>
    <p>Dùng camera điện thoại quét mã QR để mở trang chuyển khoản.</p>
    {session && <div className="transfer-grid">
      <div className="transfer-qr-card">
        <span className="transfer-brand"><QrCode aria-hidden="true" /> {session.recipientName}</span>
        {qr && !isExpired && <img className="transfer-qr" src={qr} width={320} height={320} alt="Mã QR thanh toán TITAN ARENA" />}
        {isExpired ? <p role="status">Mã QR đã hết hạn. Hãy tạo mã mới để tiếp tục.</p> :
          <p className="transfer-muted">Mã có hiệu lực {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}
      </div>
      <div className="transfer-details">
        <span className="eyebrow">THÔNG TIN CHUYỂN KHOẢN</span>
        <dl className="transfer-summary">
          <div><dt>Người nhận</dt><dd>{session.recipientName}</dd></div>
          <div><dt>Nội dung</dt><dd>Thanh toán gói tập · HĐ #{session.invoice.invoiceId}</dd></div>
          <div><dt>Số tiền cần chuyển</dt><dd className="transfer-amount">{formatMoney(session.invoice.amount)}</dd></div>
        </dl>
        <p className="transfer-waiting" aria-live="polite"><ShieldCheck aria-hidden="true" /> {isExpired ? "Đang chờ mã QR mới" : "Đang chờ thanh toán"}</p>
        <p className="transfer-muted">Sau khi chuyển tiền trên điện thoại, kết quả sẽ tự động cập nhật tại đây.</p>
        {paymentLink && !isExpired && <a className="button primary" href={paymentLink}>Mở trang chuyển khoản</a>}
      </div>
    </div>}
    {!session && !error && <p>Đang tạo mã thanh toán…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="toolbar">
      {(isExpired || error) && <button className="button secondary" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} /> Tạo lại mã QR</button>}
      <Link className="button secondary" to="/invoices">Quay lại hóa đơn</Link>
    </div>
  </section>;
}
