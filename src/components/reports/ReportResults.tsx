import type { ClassReport, MemberReport, RevenueReport } from "../../types/reports";
import { formatDate, formatMoney } from "../../utils/format";

type MetricProps = { label: string; value: number | string; hint?: string };

function Metric({ label, value, hint }: MetricProps) {
  return <div className="panel report-metric">
    <dt>{label}</dt>
    <dd>{typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      {hint && <p>{hint}</p>}
    </dd>
  </div>;
}

type PeriodProps = { from?: string | null; to?: string | null; timeZoneId: string };

export function ReportPeriod({ from, to, timeZoneId }: PeriodProps) {
  const timeZone = timeZoneId === "SE Asia Standard Time" || timeZoneId === "Asia/Ho_Chi_Minh"
    ? "Giờ Việt Nam (UTC+7)" : timeZoneId;
  return <p className="report-note">
    Kỳ báo cáo: {from ? formatDate(from) : "Từ trước đến nay"} – {to ? formatDate(to) : "—"} · {timeZone}
  </p>;
}

export function RevenueReportResults({ report }: { report: RevenueReport }) {
  return <>
    <ReportPeriod {...report} />
    <dl className="report-metrics">
      <Metric label="Doanh thu thực thu" value={formatMoney(report.totalRevenue)} hint="Tiền mặt · VND" />
      <Metric label="Hóa đơn đã thanh toán" value={report.paidInvoiceCount} hint="Tính theo ngày thu tiền" />
    </dl>
    <section className="panel" aria-labelledby="revenue-details-title">
      <div className="panel-heading">
        <div>
          <h2 id="revenue-details-title">Doanh thu theo {report.groupBy === "MONTH" ? "tháng" : "ngày"}</h2>
          <p>Chỉ tính hóa đơn tiền mặt đã thanh toán; gia hạn, nâng, hạ hoặc đổi gói đều ghi nhận nguyên giá đã thu.</p>
        </div>
      </div>
      {report.paidInvoiceCount === 0 && <p className="report-empty">Chưa có hóa đơn tiền mặt đã thanh toán trong kỳ này.</p>}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Chi tiết doanh thu, có thể cuộn ngang">
        <table className="data-table report-table">
          <caption className="sr-only">Doanh thu thực thu và số hóa đơn theo từng kỳ</caption>
          <thead><tr><th scope="col">{report.groupBy === "MONTH" ? "Tháng" : "Ngày"}</th><th scope="col">Phương thức</th><th scope="col">Hóa đơn</th><th scope="col">Doanh thu</th></tr></thead>
          <tbody>{report.items.map(item => <tr key={`${item.period}-${item.paymentMethod}`}>
            <td><time dateTime={item.period}>{report.groupBy === "MONTH" ? item.period.split("-").reverse().join("/") : formatDate(item.period)}</time></td>
            <td>Tiền mặt</td>
            <td className="numeric">{item.invoiceCount.toLocaleString("vi-VN")}</td>
            <td className="money-cell">{formatMoney(item.revenue)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>;
}

export function MemberReportResults({ report }: { report: MemberReport }) {
  return <>
    <ReportPeriod from={report.from} to={report.to ?? report.asOfDate} timeZoneId={report.timeZoneId} />
    <p className="report-note">Tổng số và trạng thái hội viên được xét đến hết ngày {formatDate(report.asOfDate)}. Từ ngày chỉ giới hạn số hội viên mới.</p>
    {report.totalMembers === 0 && <p className="report-empty">Chưa có hội viên tính đến ngày đã chọn.</p>}
    <dl className="report-metrics">
      <Metric label="Tổng hội viên" value={report.totalMembers} hint="Mỗi hội viên chỉ đếm một lần" />
      <Metric label="Hội viên mới" value={report.newMembers} hint="Được tạo trong kỳ báo cáo" />
      <Metric label="Đang hoạt động" value={report.activeMembers} hint="Tài khoản hợp lệ, gói đã xác nhận còn hiệu lực" />
      <Metric label="Đã hết hạn" value={report.expiredMembers} />
      <Metric label="Đang bảo lưu" value={report.suspendedMembers} />
      <Metric label="Gói chưa đến ngày bắt đầu" value={report.upcomingMembers} />
      <Metric label="Chờ thanh toán" value={report.pendingPaymentMembers} />
      <Metric label="Chưa có gói tập" value={report.membersWithoutSubscription} />
      <Metric label="Tài khoản không hoạt động" value={report.inactiveAccounts} hint="Tài khoản bị khóa hoặc vô hiệu hóa" />
    </dl>
    <p className="report-note">Tài khoản không hoạt động có thể đồng thời thuộc nhóm trạng thái gói tập; không cộng các chỉ số này để tính tổng hội viên. Trạng thái dựa trên dữ liệu hiện được lưu, không phải bản chụp lịch sử thay đổi.</p>
  </>;
}

type ClassResultsProps = {
  report: ClassReport;
  isBusy: boolean;
  onPageChange: (page: number) => void;
  sportName?: string;
  className?: string;
};

const REGISTRATION_LABELS = { BOOKED: "Đã đăng ký", CANCELED: "Đã hủy", ALL: "Tất cả" };

export function ClassReportResults({ report, isBusy, onPageChange, sportName, className }: ClassResultsProps) {
  return <>
    <ReportPeriod {...report} />
    <p className="report-note">
      Ngày buổi học · Đăng ký: {REGISTRATION_LABELS[report.registrationStatus]}
      {report.sportId ? ` · Bộ môn: ${sportName ?? `#${report.sportId}`}` : " · Tất cả bộ môn"}
      {report.classId ? ` · Lớp: ${className ?? `#${report.classId}`}` : " · Tất cả lớp"}
    </p>
    <dl className="report-metrics">
      <Metric label="Lớp có buổi học trong kỳ" value={report.totalClasses} />
      <Metric label="Tổng buổi học" value={report.totalSessions} />
      <Metric label="Buổi học đã hủy" value={report.canceledSessions} />
      <Metric label="Lượt đăng ký" value={report.totalRegistrations} />
      <Metric label="Học viên không trùng" value={report.uniqueMembers} />
    </dl>
    <section className="panel" aria-labelledby="class-details-title">
      <div className="panel-heading"><div>
        <h2 id="class-details-title">Thống kê theo lớp</h2>
        <p>Các tổng số áp dụng cho toàn bộ kết quả lọc, không chỉ trang hiện tại.</p>
      </div></div>
      {report.items.length === 0 ? <p className="report-empty">Không có lớp trong trang này. Hãy đổi bộ lọc hoặc về trang đầu.</p> :
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Thống kê lớp, có thể cuộn ngang">
          <table className="data-table report-table report-class-table">
            <caption className="sr-only">Số buổi học, lượt đăng ký và học viên từng lớp</caption>
            <thead><tr><th scope="col">Lớp / Bộ môn</th><th scope="col">Buổi học</th><th scope="col">Buổi đã hủy</th><th scope="col">Lượt đăng ký</th><th scope="col">Học viên không trùng</th></tr></thead>
            <tbody>{report.items.map(item => <tr key={item.classId}>
              <td className="cell-freetext"><strong>{item.className}</strong><small>{item.sportName}</small></td>
              <td className="numeric">{item.sessionCount.toLocaleString("vi-VN")}</td>
              <td className="numeric">{item.canceledSessionCount.toLocaleString("vi-VN")}</td>
              <td className="numeric">{item.registrationCount.toLocaleString("vi-VN")}</td>
              <td className="numeric">{item.uniqueMemberCount.toLocaleString("vi-VN")}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      <nav className="report-pagination" aria-label="Phân trang báo cáo lớp">
        <span>Trang {report.page} / {Math.max(1, report.totalPages)} · {report.totalClasses.toLocaleString("vi-VN")} lớp</span>
        <div className="report-actions">
          <button type="button" className="button secondary" disabled={isBusy || report.page <= 1} onClick={() => onPageChange(1)}>Đầu</button>
          <button type="button" className="button secondary" disabled={isBusy || report.page <= 1} onClick={() => onPageChange(report.page - 1)}>Trước</button>
          <button type="button" className="button secondary" disabled={isBusy || report.page >= report.totalPages} onClick={() => onPageChange(report.page + 1)}>Sau</button>
        </div>
      </nav>
    </section>
    <p className="report-note">“Đã đăng ký” chỉ tính đăng ký còn hiệu lực ở buổi chưa hủy. “Đã hủy” bao gồm đăng ký ở buổi đã hủy. Một học viên có thể học nhiều lớp nên không cộng cột học viên để tính tổng.</p>
  </>;
}
