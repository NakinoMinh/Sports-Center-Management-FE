import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  membershipService,
  orderKindLabels,
  todayDate,
} from "../../services/membershipService";
import { isApiConfigured } from "../../services/apiClient";
import { membershipApi } from "../../services/membershipApi";
import type { MembershipInvoice } from "../../types/membership";
import { formatDate, formatMoney } from "../../utils/format";

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
  const [canceling, setCanceling] = useState(false);
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (isApiConfigured()) {
        const items = await membershipApi.listInvoices({ paymentMethod: "CASH" });
        setInvoices(items);
        setError("");
        return;
      }
      setInvoices(
        membershipService
          .listInvoices(currentUser)
          .filter((i) => i.paymentMethod === "CASH"),
      );
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
  const staleUpgrade =
    invoice?.kind === "UPGRADE" &&
    (invoice.creditAmount === undefined || invoice.startDate !== todayDate());
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
    setBusy(true);
    setDialogError("");
    try {
      if (isApiConfigured()) {
        const order = await membershipApi.payInvoice(invoice.id, "CASH");
        await refresh();
        setNotice(
          `Đã xác nhận ${order.invoice.number}: ${formatMoney(order.invoice.amount)}. Gói đã được kích hoạt.`,
        );
        setChecked(false);
        setReceived("");
        close();
        return;
      }
      const result = membershipService.confirmCashPayment(
        currentUser,
        invoice.id,
        Number(received),
      );
      await refresh();
      setNotice(
        `Đã xác nhận ${result.invoice.number}: ${formatMoney(result.invoice.amount)}. ${result.subscription.startDate > todayDate() ? "Gói chờ đến ngày bắt đầu." : "Gói đã được kích hoạt."}`,
      );
      setChecked(false);
      setReceived("");
      close();
    } catch (err) {
      await refresh();
      setDialogError(
        err instanceof Error ? err.message : "Không thể xác nhận.",
      );
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
      <div className="info-note">
        <p>
          PENDING_PAYMENT → lễ tân / quản lý xác nhận → PAID → ACTIVE (hoặc chờ
          đến kỳ đã lên lịch). Chỉ xác nhận khi đã kiểm tra tiền. Đây là dữ liệu
          demo; không xử lý thanh toán thẻ hay chuyển khoản.
        </p>
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
            <form onSubmit={confirm}>
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
                  required
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={String(invoice.amount)}
                />
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
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => setCanceling(true)}
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
                  Xác nhận đã thu tiền
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
                    if (isApiConfigured()) {
                      await membershipApi.cancelPendingOrder(invoice.id);
                    } else {
                      membershipService.cancelPendingOrder(
                        currentUser,
                        invoice.id,
                      );
                    }
                    await refresh();
                    setNotice(
                      `Đã hủy ${invoice.number}. Không thay đổi gói đang hoạt động.`,
                    );
                  } catch (err) {
                    await refresh();
                    setDialogError(
                      err instanceof Error ? err.message : "Không thể hủy.",
                    );
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
