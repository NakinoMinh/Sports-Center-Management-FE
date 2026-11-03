import { useMemo, useState, type FormEvent } from "react";
import { ClassReportResults, MemberReportResults, RevenueReportResults } from "../../components/reports/ReportResults";
import { useReport, useReportCatalog } from "../../hooks/useReport";
import type { ClassRegistrationStatusFilter, ReportGroupBy, ReportQuery, ReportTab } from "../../types/reports";
import * as v from "../../utils/validation";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "revenue", label: "Doanh thu" },
  { id: "members", label: "Hội viên" },
  { id: "classes", label: "Lớp & đăng ký" },
];

type FilterForm = {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  sportId: string;
  classId: string;
  registrationStatus: ClassRegistrationStatusFilter;
  pageSize: string;
};

const INITIAL_FILTERS: FilterForm = {
  from: "", to: "", groupBy: "DAY", sportId: "", classId: "", registrationStatus: "BOOKED", pageSize: "20",
};

function ReportWorkspace({ tab }: { tab: ReportTab }) {
  const [form, setForm] = useState<FilterForm>(INITIAL_FILTERS);
  const [errors, setErrors] = useState<v.FieldErrors>({});
  const [query, setQuery] = useState<ReportQuery>({ tab, groupBy: "DAY", paymentMethod: "CASH", registrationStatus: "BOOKED", page: 1, pageSize: 20 });
  const { result, isLoading, hasError, fieldErrors } = useReport(query);
  const { catalog, hasError: hasCatalogError, retry: retryCatalog } = useReportCatalog(tab === "classes");
  const visibleClasses = useMemo(() => catalog?.classes.filter(item => !form.sportId || item.sportId === form.sportId) ?? [], [catalog, form.sportId]);
  const shownErrors = { ...(isLoading ? {} : fieldErrors), ...errors };

  function handleChange<K extends keyof FilterForm>(field: K, value: FilterForm[K]) {
    setForm(previous => ({ ...previous, [field]: value, ...(field === "sportId" ? { classId: "" } : {}) }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = v.validateForm(form, {
      from: v.reportDate,
      to: v.reportDateRange(form.from, tab === "members" ? undefined : 366),
      sportId: v.optional(v.positiveInteger("Bộ môn", { max: 2_147_483_647 })),
      classId: v.optional(v.positiveInteger("Lớp", { max: 2_147_483_647 })),
      pageSize: v.positiveInteger("Số lớp mỗi trang", { max: 100 }),
    });
    setErrors(nextErrors);
    if (v.hasErrors(nextErrors)) return;
    setQuery({
      tab, from: form.from || undefined, to: form.to || undefined,
      groupBy: form.groupBy, paymentMethod: "CASH",
      sportId: form.sportId ? Number(form.sportId) : undefined,
      classId: form.classId ? Number(form.classId) : undefined,
      registrationStatus: form.registrationStatus, page: 1, pageSize: Number(form.pageSize),
    });
  }

  function handleReset() {
    setForm(INITIAL_FILTERS);
    setErrors({});
    setQuery({ tab, groupBy: "DAY", paymentMethod: "CASH", registrationStatus: "BOOKED", page: 1, pageSize: 20 });
  }

  return <div className="report-workspace">
    <form className="panel report-filter-panel" onSubmit={handleSubmit} noValidate aria-label="Bộ lọc báo cáo">
      <div className="report-filter-grid">
        <label className="field" htmlFor="report-from">
          <span>Từ ngày</span>
          <input id="report-from" type="date" value={form.from} min="0001-01-01" max="9999-12-30" onChange={event => handleChange("from", event.target.value)} aria-invalid={!!shownErrors.from} aria-describedby={shownErrors.from ? "report-from-error report-date-hint" : "report-date-hint"} />
          {shownErrors.from && <small id="report-from-error" className="field-error">{shownErrors.from}</small>}
        </label>
        <label className="field" htmlFor="report-to">
          <span>Đến ngày</span>
          <input id="report-to" type="date" value={form.to} min="0001-01-01" max="9999-12-30" onChange={event => handleChange("to", event.target.value)} aria-invalid={!!shownErrors.to} aria-describedby={shownErrors.to ? "report-to-error report-date-hint" : "report-date-hint"} />
          {shownErrors.to && <small id="report-to-error" className="field-error">{shownErrors.to}</small>}
        </label>
        {tab === "revenue" && <>
          <label className="field" htmlFor="report-group">
            <span>Nhóm doanh thu</span>
            <select id="report-group" value={form.groupBy} onChange={event => handleChange("groupBy", event.target.value === "MONTH" ? "MONTH" : "DAY")}>
              <option value="DAY">Theo ngày</option><option value="MONTH">Theo tháng</option>
            </select>
          </label>
          <div className="field"><span>Phương thức thanh toán</span><p className="field-readonly-value">Tiền mặt (CASH)</p></div>
        </>}
        {tab === "classes" && <>
          <label className="field" htmlFor="report-sport">
            <span>Bộ môn</span>
            <select id="report-sport" value={form.sportId} disabled={!catalog} onChange={event => handleChange("sportId", event.target.value)} aria-invalid={!!shownErrors.sportId} aria-describedby={shownErrors.sportId ? "report-sport-error" : undefined}>
              <option value="">Tất cả bộ môn</option>{catalog?.sports.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {shownErrors.sportId && <small id="report-sport-error" className="field-error">{shownErrors.sportId}</small>}
          </label>
          <label className="field" htmlFor="report-class">
            <span>Lớp học</span>
            <select id="report-class" value={form.classId} disabled={!catalog} onChange={event => handleChange("classId", event.target.value)} aria-invalid={!!shownErrors.classId} aria-describedby={shownErrors.classId ? "report-class-error" : undefined}>
              <option value="">Tất cả lớp</option>{visibleClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {shownErrors.classId && <small id="report-class-error" className="field-error">{shownErrors.classId}</small>}
          </label>
          <label className="field" htmlFor="report-registration">
            <span>Trạng thái đăng ký</span>
            <select id="report-registration" value={form.registrationStatus} onChange={event => handleChange("registrationStatus", event.target.value === "ALL" ? "ALL" : event.target.value === "CANCELED" ? "CANCELED" : "BOOKED")}>
              <option value="BOOKED">Đã đăng ký</option><option value="CANCELED">Đã hủy</option><option value="ALL">Tất cả</option>
            </select>
          </label>
          <label className="field" htmlFor="report-page-size">
            <span>Số lớp mỗi trang</span>
            <select id="report-page-size" value={form.pageSize} onChange={event => handleChange("pageSize", event.target.value)}>
              <option value="20">20</option><option value="50">50</option><option value="100">100</option>
            </select>
          </label>
        </>}
      </div>
      <p id="report-date-hint" className="report-note">{tab === "members"
        ? "Bỏ trống Từ ngày để tính hội viên mới từ trước đến nay; bỏ trống Đến ngày để dùng ngày hiện tại của trung tâm."
        : "Tối đa 366 ngày, tính cả hai đầu mốc. Bỏ trống Đến ngày để dùng ngày hiện tại của trung tâm; bỏ trống Từ ngày để dùng đầu tháng của Đến ngày."}</p>
      <div className="report-actions">
        <button className="button primary" type="submit" disabled={isLoading}>Áp dụng bộ lọc</button>
        <button className="button secondary" type="button" onClick={handleReset} disabled={isLoading}>Mặc định</button>
        {tab === "classes" && !catalog && <span className="report-note">{hasCatalogError ? "Chưa tải được danh sách bộ môn / lớp." : "Đang tải danh sách bộ môn / lớp…"}</span>}
        {hasCatalogError && <button type="button" className="button secondary" onClick={retryCatalog}>Tải lại danh sách</button>}
      </div>
    </form>
    <div className="report-update-row">
      <p role="status" className="report-note">{isLoading ? (result ? "Đang cập nhật; đang giữ kết quả lần tải trước…" : "Đang tải báo cáo…") : hasError ? (result ? "Cập nhật thất bại. Đang hiển thị kết quả lần tải trước." : "Chưa tải được báo cáo. Vui lòng thử lại.") : "Đã tải báo cáo theo bộ lọc áp dụng."}</p>
      <button type="button" className="button secondary" disabled={isLoading} onClick={() => { setErrors({}); setQuery(previous => ({ ...previous })); }}>{hasError ? "Thử lại" : "Làm mới"}</button>
    </div>
    <div className="report-results" aria-busy={isLoading}>
      {!result && <div className="panel table-loading">{isLoading ? "Đang tải dữ liệu…" : "Chưa có kết quả báo cáo để hiển thị."}</div>}
      {result?.tab === "revenue" && <RevenueReportResults report={result.report} />}
      {result?.tab === "members" && <MemberReportResults report={result.report} />}
      {result?.tab === "classes" && <ClassReportResults report={result.report} isBusy={isLoading || hasError}
        sportName={catalog?.sports.find(item => Number(item.id) === result.report.sportId)?.name}
        className={catalog?.classes.find(item => Number(item.id) === result.report.classId)?.name}
        onPageChange={page => setQuery(previous => ({ ...previous, page }))} />}
    </div>
  </div>;
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("revenue");
  return <div className="reports-page">
    <div className="page-heading"><div><h1>Báo cáo tổng hợp</h1><p>Doanh thu, hội viên và tình hình đăng ký lớp của trung tâm.</p></div></div>
    <div className="report-tabs" role="group" aria-label="Loại báo cáo">
      {TABS.map(item => <button key={item.id} type="button" className={`button ${tab === item.id ? "primary" : "secondary"}`} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <ReportWorkspace key={tab} tab={tab} />
  </div>;
}
