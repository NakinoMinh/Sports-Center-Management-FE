import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Banknote,
  FileText,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import { InvoiceDocument } from "../../components/membership/InvoiceDocument";
import { membershipApi } from "../../services/membershipApi";
import { orderKindLabels } from "../../services/membershipService";
import type { InvoiceSummary, MembershipInvoice } from "../../types/membership";
import { formatDate, formatMoney } from "../../utils/format";

const PAGE_SIZE = 10;

const emptySummary = (): InvoiceSummary => ({
  paidCount: 0,
  paidAmount: 0,
  pendingCount: 0,
  pendingAmount: 0,
  canceledCount: 0,
  canceledAmount: 0,
});

export function InvoicesPage() {
  const { currentUser } = useAuth();
  const isStaff =
    currentUser?.role === "RECEPTIONIST" ||
    currentUser?.role === "CENTER_MANAGER";

  const [invoices, setInvoices] = useState<MembershipInvoice[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<InvoiceSummary>(emptySummary);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] =
    useState<MembershipInvoice | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? "Ngày bắt đầu không được lớn hơn ngày kết thúc."
      : "";

  const loadInvoices = useCallback(async () => {
    if (!currentUser) return;
    if (fromDate && toDate && fromDate > toDate) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }
    setLoading(true);
    try {
      const paged = await membershipApi.searchInvoices({
        memberId: isStaff ? undefined : currentUser.id,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        paymentMethod: methodFilter !== "ALL" ? methodFilter : undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setInvoices(paged.items);
      setTotalItems(paged.totalItems);
      setSummary(paged.summary);
      setServerTotalPages(Math.max(1, paged.totalPages));
      setError("");
    } catch (err) {
      setInvoices([]);
      setTotalItems(0);
      setSummary(emptySummary());
      setServerTotalPages(1);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách hóa đơn.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, fromDate, isStaff, methodFilter, page, search, statusFilter, toDate]);

  useEffect(() => {
    if (!dateRangeError) {
      void loadInvoices();
    }
  }, [dateRangeError, loadInvoices]);

  const totalPages = serverTotalPages;
  const safePage = Math.min(page, totalPages);
  const pagedItems = invoices;

  async function openReceiptOrInvoice(inv: MembershipInvoice) {
    if (inv.status === "PAID") {
      setLoadingReceiptId(inv.id);
      try {
        const order = await membershipApi.getReceipt(inv.id);
        setSelectedInvoice(order.invoice);
        return;
      } catch {
        setSelectedInvoice(inv);
        return;
      } finally {
        setLoadingReceiptId(null);
      }
    }
    setSelectedInvoice(inv);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {isStaff ? "QUẢN LÝ TÀI CHÍNH & QUẦY" : "TÀI KHOẢN CỦA TÔI"}
          </span>
          <h1>
            {isStaff
              ? "Tra cứu hóa đơn & Biên nhận"
              : "Lịch sử hóa đơn & Biên nhận của tôi"}
          </h1>
          <p>
            {isStaff
              ? "Tra cứu toàn bộ hóa đơn gói tập, lọc theo trạng thái, khoảng ngày và in biên nhận chính thức."
              : "Theo dõi các hóa đơn gói tập của bạn và xem hoặc in biên nhận đã thanh toán."}
          </p>
        </div>
        <span className="page-icon">
          <FileText size={26} />
        </span>
      </div>

      {(error || dateRangeError) && (
        <div className="error-notice" role="alert">
          <span>{dateRangeError || error}</span>
          {!dateRangeError && (
            <button className="button secondary" onClick={loadInvoices}>
              <RefreshCw size={15} />
              Thử lại
            </button>
          )}
        </div>
      )}

      <div className="cash-summary">
        <section className="panel">
          <span>Tổng hóa đơn khớp bộ lọc</span>
          <strong>{totalItems}</strong>
        </section>
        <section className="panel">
          <span>Đã thanh toán (PAID)</span>
          <strong>
            {summary.paidCount} · {formatMoney(summary.paidAmount)}
          </strong>
        </section>
        <section className="panel">
          <span>Chờ thanh toán (PENDING)</span>
          <strong>
            {summary.pendingCount} · {formatMoney(summary.pendingAmount)}
          </strong>
        </section>
        <section className="panel">
          <span>Đã hủy (CANCELED)</span>
          <strong>{summary.canceledCount}</strong>
        </section>
      </div>

      <section className="panel history-panel">
        <div className="toolbar" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <label className="search-field" style={{ minWidth: "240px" }}>
            <Search size={18} />
            <input
              aria-label="Tìm kiếm hóa đơn"
              placeholder={
                isStaff
                  ? "Mã hóa đơn, tên hội viên, email, gói tập…"
                  : "Mã hóa đơn hoặc tên gói tập…"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_PAYMENT">Chờ thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="CANCELED">Đã hủy</option>
            </select>
          </label>
          <label className="field">
            <span>Phương thức</span>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả</option>
              <option value="CASH">Tiền mặt (CASH)</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
              <option value="CARD">Thẻ</option>
            </select>
          </label>
          <label className="field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
              setMethodFilter("ALL");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={loadInvoices}
          >
            <RefreshCw size={16} />
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="empty-state" role="status">
            Đang tải danh sách hóa đơn…
          </div>
        ) : pagedItems.length ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    {isStaff && <th>Hội viên</th>}
                    <th>Gói tập</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Ngày lập / Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.number}</strong>
                        <small>{orderKindLabels[inv.kind]}</small>
                      </td>
                      {isStaff && (
                        <td>
                          <strong>{inv.memberName}</strong>
                          <small>{inv.memberEmail}</small>
                        </td>
                      )}
                      <td>
                        <strong>{inv.packageName}</strong>
                        <small>
                          {formatDate(inv.startDate)} –{" "}
                          {formatDate(inv.endDate)}
                        </small>
                      </td>
                      <td className="money-cell">{formatMoney(inv.amount)}</td>
                      <td>
                        {inv.paymentMethod === "CASH"
                          ? "Tiền mặt"
                          : inv.paymentMethod === "BANK_TRANSFER"
                            ? "Chuyển khoản"
                            : "Thẻ"}
                      </td>
                      <td>
                        <span>Lập: {formatDate(inv.createdAt)}</span>
                        {inv.paidAt && (
                          <small>
                            Thu: {formatDate(inv.paidAt)}
                            {inv.paidByName ? ` · ${inv.paidByName}` : ""}
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-chip ${inv.status === "PAID" ? "active" : inv.status.toLowerCase()}`}
                        >
                          {inv.status === "PAID"
                            ? "Đã thanh toán"
                            : inv.status === "CANCELED"
                              ? "Đã hủy"
                              : "Chờ thanh toán"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={loadingReceiptId === inv.id}
                            onClick={() => void openReceiptOrInvoice(inv)}
                          >
                            <FileText size={15} />
                            {inv.status === "PAID"
                              ? "Xem biên nhận"
                              : "Xem hóa đơn"}
                          </button>
                          {isStaff &&
                            inv.status === "PENDING_PAYMENT" &&
                            inv.paymentMethod === "CASH" && (
                              <Link
                                className="button primary"
                                to={`/payments/cash?invoice=${inv.id}`}
                              >
                                <Banknote size={15} />
                                Thu tiền
                              </Link>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div
                className="pagination-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1rem",
                  gap: "0.75rem",
                }}
              >
                <span>
                  Trang {safePage} / {totalPages} · Tổng{" "}
                  {totalItems} hóa đơn
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <FileText size={30} />
            <h2>Không có hóa đơn phù hợp</h2>
            <p>Thử điều chỉnh từ khóa hoặc bộ lọc trạng thái / ngày.</p>
          </div>
        )}
      </section>

      {selectedInvoice && (
        <Dialog
          title={
            selectedInvoice.status === "PAID"
              ? "Biên nhận thanh toán chính thức"
              : "Chi tiết hóa đơn"
          }
          onClose={() => setSelectedInvoice(null)}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelectedInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                In / Lưu PDF
              </button>
              {isStaff &&
                selectedInvoice.status === "PENDING_PAYMENT" &&
                selectedInvoice.paymentMethod === "CASH" && (
                  <Link
                    className="button primary"
                    to={`/payments/cash?invoice=${selectedInvoice.id}`}
                  >
                    <Banknote size={16} />
                    Đến xác nhận thu tiền mặt
                  </Link>
                )}
            </>
          }
        >
          <InvoiceDocument invoice={selectedInvoice} />
        </Dialog>
      )}

      {selectedInvoice &&
        createPortal(
          <div className="print-sheet">
            <InvoiceDocument invoice={selectedInvoice} />
          </div>,
          document.body,
        )}
    </>
  );
}
