import type { MembershipInvoice } from "../../types/membership";
import { durationLabel, formatDate, formatMoney } from "../../utils/format";
import { orderKindLabels } from "../../services/membershipService";

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
          {invoice.status === "PAID"
            ? "Đã thanh toán"
            : invoice.status === "CANCELED"
              ? "Đã hủy"
              : "Chờ thanh toán"}
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
          <dd>{orderKindLabels[invoice.kind]}</dd>
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
                {invoice.status === "PENDING_PAYMENT" ? " (dự kiến)" : ""}
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
      {invoice.kind === "UPGRADE" && invoice.creditAmount !== undefined && (
        <p className="invoice-note">
          Khấu trừ {invoice.remainingDays}/{invoice.previousPeriodDays} ngày
          chưa sử dụng × {formatMoney(invoice.previousPackagePrice ?? 0)} ={" "}
          {formatMoney(invoice.creditAmount)} (làm tròn đến đồng).<br />
          Phí nâng gói: {formatMoney(invoice.packagePrice)} −{" "}
          {formatMoney(invoice.creditAmount)} ={" "}
          {formatMoney(invoice.amount)}. Kỳ mới đủ {invoice.durationMonths} tháng
          từ ngày thanh toán. Báo giá chờ thanh toán chỉ có hiệu lực trong ngày lập.
        </p>
      )}
      {invoice.kind === "UPGRADE" && invoice.creditAmount === undefined && (
        <p className="invoice-note">
          Hóa đơn theo chính sách nâng gói cũ.
          {invoice.status === "PENDING_PAYMENT" && " Vui lòng hủy và lập lại yêu cầu để tính giá trị ngày còn lại trước khi thu tiền."}
        </p>
      )}
      {invoice.paidAt && (
        <p className="invoice-note">
          Người xác nhận: {invoice.paidByName} ·{" "}
          {new Date(invoice.paidAt).toLocaleString("vi-VN")}
        </p>
      )}
      <p className="invoice-note">
        {invoice.status === "PENDING_PAYMENT"
          ? "Hóa đơn đang chờ thanh toán, không phải biên nhận đã thu tiền. Gói mới chưa được kích hoạt."
          : invoice.status === "CANCELED"
            ? "Yêu cầu đã hủy, không thu tiền và không cấp quyền tập."
            : "Đã ghi nhận thanh toán trong bản demo. Gói có hiệu lực theo kỳ sử dụng trên hóa đơn; gói có ngày bắt đầu trong tương lai sẽ chờ đến ngày đó."}
      </p>
    </article>
  );
}
