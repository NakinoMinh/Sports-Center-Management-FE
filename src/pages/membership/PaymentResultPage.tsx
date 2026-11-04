import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { vnpayApi, type VnpayStatus } from "../../services/vnpayApi";
import { describeError } from "../../services/apiErrors";
import { formatMoney } from "../../utils/format";

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoiceId") ?? "";
  const [status, setStatus] = useState<VnpayStatus | null>(null);
  const [error, setError] = useState("");
  const [isChecking, setChecking] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      setChecking(true);
      try {
        const current = await vnpayApi.status(invoiceId);
        if (disposed) return;
        setStatus(current);
        setError("");
        attempts += 1;
        if (current.status === "PENDING_PAYMENT" && attempts < 20) timer = setTimeout(check, 3000);
        else setChecking(false);
      } catch (failure) {
        if (!disposed) { setError(describeError(failure)); setChecking(false); }
      }
    }
    timer = setTimeout(check, 0);
    return () => { disposed = true; clearTimeout(timer); };
  }, [invoiceId, refresh]);
  const current = status?.invoiceId === Number(invoiceId) ? status : null;
  const paid = current?.status === "PAID";
  const canceled = current?.status === "CANCELED";
  return <section className="panel">
    <span className="eyebrow">KẾT QUẢ THANH TOÁN</span>
    <h1>{paid ? "Thanh toán thành công" : canceled ? "Hóa đơn đã hủy" : "Kiểm tra thanh toán"}</h1>
    {error ? <p role="alert">{error}</p> : <p aria-live="polite">
      {paid ? "Thanh toán đã được xác nhận và gói tập đã được cập nhật. Bạn có thể xem biên nhận trong lịch sử hóa đơn."
        : canceled ? "Yêu cầu này đã hủy. Nếu ngân hàng đã ghi nợ, hãy liên hệ trung tâm để đối chiếu."
        : "Chưa có xác nhận thanh toán từ máy chủ. Nếu bạn đã thanh toán, hãy chờ đối soát; đừng chuyển tiền lần nữa."}
    </p>}
    {!paid && params.get("vnp_ResponseCode") && params.get("vnp_ResponseCode") !== "00" &&
      <p>Trang thanh toán báo giao dịch chưa hoàn tất. Kết quả chính thức vẫn được kiểm tra từ máy chủ.</p>}
    {current && <p>Hóa đơn #{current.invoiceId} · {formatMoney(current.amount)}</p>}
    {isChecking && <p>Đang tự động kiểm tra…</p>}
    <div className="toolbar">
      <Link className="button primary" to="/invoices">Xem hóa đơn và biên nhận</Link>
      {!paid && !canceled && <button className="button secondary" disabled={isChecking} onClick={() => setRefresh(value => value + 1)}>Kiểm tra lại</button>}
    </div>
  </section>;
}
