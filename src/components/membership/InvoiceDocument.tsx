import type { MembershipInvoice } from "../../types/membership";
import { durationLabel, formatDate, formatMoney } from "../../utils/format";

export function InvoiceDocument({ invoice }: { invoice: MembershipInvoice }) {
  return (
    <article className="invoice-document">
      <header>
        <div>
          <strong>TITAN ARENA</strong>
          <p>Sports Center Management System</p>
        </div>
        <span
          className={`status-chip ${invoice.status === "PAID" ? "active" : "pending"}`}
        >
          {invoice.status === "PAID" ? "Đã thanh toán (mẫu)" : "Chờ thanh toán"}
        </span>
      </header>
      <h2>HÓA ĐƠN GÓI THÀNH VIÊN</h2>
      <p className="invoice-number">
        {invoice.number} · Lập ngày {formatDate(invoice.createdAt)}
      </p>
      <dl>
        <div>
          <dt>Thành viên</dt>
          <dd>{invoice.memberName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{invoice.memberEmail}</dd>
        </div>
        <div>
          <dt>Loại đăng ký</dt>
          <dd>
            {invoice.kind === "RENEW" ? "Gia hạn gói tập" : "Đăng ký gói tập"}
          </dd>
        </div>
        <div>
          <dt>Phương thức dự kiến</dt>
          <dd>
            {
              {
                CASH: "Tiền mặt tại quầy",
                BANK_TRANSFER: "Chuyển khoản",
                CARD: "Thẻ tại quầy",
              }[invoice.paymentMethod]
            }
          </dd>
        </div>
      </dl>
      <table>
        <thead>
          <tr>
            <th>Nội dung</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>
                {invoice.packageName} · {durationLabel(invoice.durationMonths)}
              </strong>
              <small>
                {formatDate(invoice.startDate)} – {formatDate(invoice.endDate)}
                {invoice.status === "PENDING" ? " (dự kiến)" : ""}
              </small>
            </td>
            <td>{formatMoney(invoice.amount)}</td>
          </tr>
        </tbody>
      </table>
      <div className="invoice-total">
        <span>Tổng cộng</span>
        <strong>{formatMoney(invoice.amount)}</strong>
      </div>
      <p className="invoice-note">
        {invoice.status === "PENDING"
          ? "Hóa đơn đang chờ thanh toán, không phải biên nhận đã thu tiền. Gói mới chưa được kích hoạt."
          : "Hóa đơn mẫu được tạo sẵn để trải nghiệm luồng gia hạn."}
      </p>
      <footer>
        Bản minh họa Sprint 1 · Không có giá trị hóa đơn thuế hoặc chứng từ
        thanh toán thực tế.
      </footer>
    </article>
  );
}
