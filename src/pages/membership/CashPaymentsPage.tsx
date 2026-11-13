import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as v from "../../utils/validation";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Banknote,
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import { InvoiceDocument } from "../../components/membership/InvoiceDocument";
import {
  addDateDays,
  addMonthsClamped,
  orderKindLabels,
  todayDate,
} from "../../services/membershipService";
import { membershipApi } from "../../services/membershipApi";
import { ApiError } from "../../services/apiClient";
import type { MembershipInvoice } from "../../types/membership";
import { formatDate, formatMoney } from "../../utils/format";

function getLocalDateString(isoOrDateStr: string | undefined): string {
  if (!isoOrDateStr) return "";
  try {
    const d = new Date(isoOrDateStr);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  } catch {
    // ignore
  }
  return isoOrDateStr.slice(0, 10);
}

function mapPaymentError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      const msg = err.message.toLowerCase();
      if (msg.includes("already") || msg.includes("paid")) {
        return "Hóa đơn này đã được thu tiền trước đó. Hệ thống không ghi nhận thu lần hai.";
      }
      if (msg.includes("upgrade") || msg.includes("expired")) {
        return "Báo giá nâng gói đã hết hạn (chỉ có hiệu lực trong ngày lập). Vui lòng hủy yêu cầu và tạo báo giá mới.";
      }
      if (
        msg.includes("deadlock") ||
        msg.includes("concurrency") ||
        msg.includes("transaction") ||
        msg.includes("modified")
      ) {
        return "Hóa đơn đang được xử lý bởi nhân viên khác hoặc có xung đột dữ liệu. Vui lòng thử lại.";
      }
      if (msg.includes("inactive")) {
        return "Gói tập hiện tại đang tạm ngưng hoạt động.";
      }
      return err.message || "Xung đột dữ liệu hoặc hóa đơn đã được xử lý bởi nhân viên khác.";
    }
    if (err.status === 400) {
      const msg = err.message.toLowerCase();
      if (msg.includes("invoice state") || msg.includes("state")) {
        return "Trạng thái hóa đơn không hợp lệ hoặc đã bị thay đổi.";
      }
      if (msg.includes("payment method")) {
        return "Phương thức thanh toán của hóa đơn không phải là tiền mặt.";
      }
      return err.message || "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
    }
    if (err.status === 403) {
      const msg = err.message.toLowerCase();
      if (msg.includes("member") && msg.includes("inactive")) {
        return "Tài khoản thành viên đã bị vô hiệu hóa.";
      }
      if (msg.includes("role") || msg.includes("staff")) {
        return "Tài khoản của bạn không có quyền xác nhận thu tiền mặt.";
      }
      return err.message || "Bạn không có quyền thực hiện thao tác này.";
    }
    if (err.status === 423) {
      const msg = err.message.toLowerCase();
      if (msg.includes("staff")) {
        return "Tài khoản nhân viên của bạn đang bị khóa.";
      }
      if (msg.includes("member")) {
        return "Tài khoản thành viên đang bị khóa.";
      }
      return "Tài khoản hiện đang bị khóa.";
    }
    if (err.status === 404) {
      return "Không tìm thấy hóa đơn trên hệ thống.";
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Không thể xác nhận thanh toán.";
}

function mapCancelError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 400) {
      return "Không thể hủy do trạng thái hóa đơn đã thay đổi hoặc đã được thanh toán.";
    }
    if (err.status === 403) {
      return "Bạn không có quyền hủy hóa đơn này.";
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Không thể hủy yêu cầu.";
}

export function CashPaymentsPage() {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const [invoices, setInvoices] = useState<MembershipInvoice[]>([]);
  const [filter, setFilter] = useState("PENDING_PAYMENT");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [received, setReceived] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [receivedError, setReceivedError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const items = await membershipApi.listInvoices({ paymentMethod: "CASH" });
      setInvoices(items);
      setError("");
    } catch (err) {
      setInvoices([]);
      setError(err instanceof Error ? err.message : "Không thể tải hóa đơn.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
    const sync = () => void refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const timer = window.setInterval(sync, 60000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.clearInterval(timer);
    };
  }, [refresh]);
  const selectedId = params.get("invoice");
  const invoice = invoices.find((i) => i.id === selectedId);
  const invoiceCreatedDay = getLocalDateString(invoice?.createdAt);
  const staleUpgrade =
    invoice?.kind === "UPGRADE" &&
    ((invoiceCreatedDay && invoiceCreatedDay !== todayDate()) ||
      (!invoiceCreatedDay && invoice.startDate !== todayDate()));
  const pending = invoices.filter((i) => i.status === "PENDING_PAYMENT");
  const visible = invoices.filter(
    (i) =>
      (filter === "ALL" || i.status === filter) &&
      `${i.number} ${i.memberName} ${i.memberEmail}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")),
  );
  function close() {
    if (busy) return;
    setParams({});
    setReceived("");
    setChecked(false);
    setDialogError("");
    setCanceling(false);
  }
  function open(id: string) {
    setReceived("");
    setChecked(false);
    setDialogError("");
    setCanceling(false);
    setParams({ invoice: id });
  }
  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!invoice || !currentUser || busy || !checked || staleUpgrade) return;

    // The cashier must key in what was actually handed over; a mismatch means
    // the drawer and the invoice would disagree, so it is blocked here.
    const amountError =
      v.money("Số tiền đã thu", { min: 1 })(received) ??
      (Number(received) !== invoice.amount
        ? `Số tiền đã thu phải đúng bằng ${formatMoney(invoice.amount)}.`
        : null);
    if (amountError) {
      setReceivedError(amountError);
      return;
    }
    setReceivedError("");

    setBusy(true);
    setDialogError("");
    try {
      const order = await membershipApi.payInvoice(
        invoice.id,
        "CASH",
        Number(received),
        checked,
      );
      await refresh();
      setNotice(
        `Đã xác nhận ${order.invoice.number}: ${formatMoney(order.invoice.amount)}. Gói đã được kích hoạt.`,
      );
      setChecked(false);
      setReceived("");
      close();
    } catch (err) {
      await refresh();
      setDialogError(mapPaymentError(err));
    } finally {
      setBusy(false);
    }
  }
  const effectiveStart = invoice
    ? invoice.startDate < todayDate()
      ? todayDate()
      : invoice.startDate
    : "";
  const effectiveEnd = invoice
    ? invoice.kind !== "UPGRADE" && invoice.startDate < todayDate()
      ? addDateDays(
          addMonthsClamped(effectiveStart, invoice.durationMonths),
          -1,
        )
      : invoice.endDate
    : "";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẦY THU NGÂN</span>
          <h1>Xác nhận thanh toán tiền mặt</h1>
          <p>
            Kiểm tra đúng thành viên và hóa đơn trước khi ghi nhận đã thu tiền.
          </p>
        </div>
        <span className="page-icon">
          <Banknote size={26} />
        </span>
      </div>
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={20} />
          {notice}
        </div>
      )}
      <div className="cash-summary">
        <section className="panel">
          <span>Hóa đơn chờ thu</span>
          <strong>{pending.length}</strong>
        </section>
        <section className="panel">
          <span>Tổng tiền chờ thu · không phải doanh thu</span>
          <strong>
            {formatMoney(pending.reduce((sum, i) => sum + i.amount, 0))}
          </strong>
        </section>
      </div>
      <section className="panel history-panel">
        <div className="toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Tìm hóa đơn"
              placeholder="Mã hóa đơn, tên hoặc email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Trạng thái thanh toán</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="PENDING_PAYMENT">Chờ thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="CANCELED">Đã hủy</option>
              <option value="ALL">Tất cả</option>
            </select>
          </label>
          <button className="button secondary" onClick={refresh}>
            <RefreshCw size={16} />
            Tải lại
          </button>
        </div>
        {loading ? (
          <div className="empty-state" role="status">
            Đang tải hóa đơn…
          </div>
        ) : visible.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hóa đơn / thành viên</th>
                  <th>Gói tập</th>
                  <th>Cần thu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.number}</strong>
                      <small>
                        {i.memberName} · {i.memberEmail}
                      </small>
                    </td>
                    <td>
                      <strong>{i.packageName}</strong>
                      <small>{orderKindLabels[i.kind]}</small>
                    </td>
                    <td className="money-cell">{formatMoney(i.amount)}</td>
                    <td>
                      <span
                        className={`status-chip ${i.status === "PAID" ? "active" : i.status.toLowerCase()}`}
                      >
                        {i.status === "PAID"
                          ? "Đã thanh toán"
                          : i.status === "CANCELED"
                            ? "Đã hủy"
                            : "Chờ thanh toán"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button secondary"
                        onClick={() => open(i.id)}
                      >
                        {i.status === "PENDING_PAYMENT"
                          ? "Kiểm tra & thu tiền"
                          : "Xem hóa đơn"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Banknote size={30} />
            <h2>Không có hóa đơn phù hợp</h2>
            <p>Yêu cầu chọn tiền mặt sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </section>
      {selectedId && !invoice && !error && !loading && (
        <div className="info-note">
          <p>
            Không tìm thấy hóa đơn tiền mặt được chọn.{" "}
            <button className="text-button" onClick={close}>
              Bỏ chọn
            </button>
          </p>
        </div>
      )}
      {invoice && (
        <Dialog
          title={
            invoice.status === "PENDING_PAYMENT"
              ? "Kiểm tra & xác nhận thu tiền"
              : "Chi tiết hóa đơn"
          }
          onClose={close}
        >
          <InvoiceDocument invoice={invoice} />
          {dialogError && (
            <p className="form-error" role="alert">
              {dialogError}
            </p>
          )}
          {invoice.status === "PENDING_PAYMENT" ? (
            <form onSubmit={confirm} noValidate>
              <div className="info-note">
                <p>
                  {staleUpgrade ? (
                    "Báo giá nâng gói đã cũ. Hủy yêu cầu và lập lại để tính đúng khoản khấu trừ trước khi thu tiền."
                  ) : (
                    <>
                      Sau xác nhận: {formatDate(effectiveStart)} –{" "}
                      {formatDate(effectiveEnd)}.{" "}
                      {invoice.kind === "UPGRADE"
                        ? "Gói hiện tại được thay thế; gói mới có đủ kỳ hạn từ ngày thu tiền."
                        : "Nếu thanh toán trễ sau ngày dự kiến, kỳ sử dụng được tính lại từ ngày thu tiền."}
                    </>
                  )}
                </p>
              </div>
              <label className="field">
                <span>Số tiền đã thu (VNĐ) *</span>
                <input
                  inputMode="numeric"
                  value={received}
                  aria-invalid={Boolean(receivedError)}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={String(invoice.amount)}
                />
                {receivedError && (
                  <small className="field-error">{receivedError}</small>
                )}
              </label>
              <label className="cash-check">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <span>
                  Tôi đã kiểm tra thành viên, hóa đơn và thu đủ{" "}
                  {formatMoney(invoice.amount)} tiền mặt.
                </span>
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={close}
                  disabled={busy}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => setCanceling(true)}
                  disabled={busy}
                >
                  Hủy yêu cầu
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    busy ||
                    staleUpgrade ||
                    !checked ||
                    Number(received) !== invoice.amount
                  }
                >
                  {busy ? "Đang xử lý..." : "Xác nhận đã thu tiền"}
                </button>
              </div>
            </form>
          ) : (
            <div className="modal-actions">
              <button className="button secondary" onClick={close}>
                Đóng
              </button>
              <button className="button primary" onClick={() => window.print()}>
                <FileText size={16} />
                In / Lưu PDF
              </button>
            </div>
          )}
        </Dialog>
      )}
      {canceling && invoice && (
        <Dialog
          title="Hủy hóa đơn chưa thanh toán?"
          onClose={() => setCanceling(false)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setCanceling(false)}
              >
                Quay lại
              </button>
              <button
                className="button danger"
                onClick={async () => {
                  if (!currentUser) return;
                  try {
                    await membershipApi.cancelPendingOrder(invoice.id);
                    await refresh();
                    setNotice(
                      `Đã hủy ${invoice.number}. Không thay đổi gói đang hoạt động.`,
                    );
                  } catch (err) {
                    await refresh();
                    setDialogError(mapCancelError(err));
                  }
                  setCanceling(false);
                }}
              >
                Xác nhận hủy
              </button>
            </>
          }
        >
          <p>
            Không thu tiền, không cấp quyền tập cho yêu cầu này. Hóa đơn đã
            thanh toán không được hủy tại đây.
          </p>
        </Dialog>
      )}
      {invoice &&
        createPortal(
          <div className="print-sheet">
            <InvoiceDocument invoice={invoice} />
          </div>,
          document.body,
        )}
    </>
  );
}
