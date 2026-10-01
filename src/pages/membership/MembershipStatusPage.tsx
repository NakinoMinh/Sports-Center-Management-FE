import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import { getMembershipStatusSummary } from "../../services/membershipService";
import { memberApi } from "../../services/memberApi";
import { membershipApi, subscriptionFromInvoice } from "../../services/membershipApi";
import type { MemberSubscription, MembershipActor } from "../../types/membership";
import { formatDate } from "../../utils/format";

const labels: Record<string, string> = {
  ACTIVE: "Đang hoạt động", EXPIRED: "Đã hết hạn", SUSPENDED: "Tạm ngưng",
  UPCOMING: "Sắp bắt đầu", SCHEDULED_DOWNGRADE: "Sắp bắt đầu",
  PENDING_PAYMENT: "Chờ thanh toán", NONE: "Chưa có gói",
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

export function MembershipStatusPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<{ members: MembershipActor[]; subscriptions: MemberSubscription[] }>({ members: [], subscriptions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [members, invoicesRes] = await Promise.all([
        memberApi.listAllMembers(),
        membershipApi.listInvoices(),
      ]);
      const subscriptions = invoicesRes.map(subscriptionFromInvoice);
      setData({ members, subscriptions });
      setError("");
    } catch (err) {
      setData({ members: [], subscriptions: [] });
      setError(err instanceof Error ? err.message : "Không thể tải trạng thái gói tập.");
    } finally { setLoading(false); }
  }, [currentUser]);
  useEffect(() => {
    // Synchronize the local data adapter, including when a payment is confirmed in another tab.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);
  const rows = data.members.map((member) => ({ member, ...getMembershipStatusSummary(data.subscriptions.filter((sub) => sub.memberId === member.id)) }));
  const visible = rows.filter((row) => {
    const matches = normalize([row.member.fullName, row.member.email, row.member.phone, row.member.id].join(" ")).includes(normalize(query.trim()));
    return matches && (filter === "ALL" || (filter === "EXPIRING" ? row.expiringSoon : row.status === filter || (filter === "UPCOMING" && row.status === "SCHEDULED_DOWNGRADE")));
  });
  const selected = rows.find((row) => row.member.id === selectedId);
  return <>
    <div className="page-heading">
      <div><span className="eyebrow">QUẦY LỄ TÂN · TRA CỨU THÀNH VIÊN</span><h1>Kiểm tra gói tập</h1><p>Nắm rõ trạng thái và thời hạn để hỗ trợ thành viên kịp thời.</p></div>
      <span className="page-icon"><ShieldCheck size={26} /></span>
    </div>
    {error && <div className="error-notice" role="alert">{error}<button className="button secondary" onClick={refresh}>Thử lại</button></div>}
    {!error && !loading && <div className="membership-status-stats">
          {([{ key: "ALL", label: "Tổng thành viên", count: rows.length },
            { key: "ACTIVE", label: "Đang hoạt động", count: rows.filter((r) => r.status === "ACTIVE").length },
            { key: "EXPIRING", label: "Sắp hết hạn · dưới 7 ngày", count: rows.filter((r) => r.expiringSoon).length },
            { key: "EXPIRED", label: "Đã hết hạn", count: rows.filter((r) => r.status === "EXPIRED").length },
            { key: "SUSPENDED", label: "Tạm ngưng", count: rows.filter((r) => r.status === "SUSPENDED").length },
          ]).map((item) => <button key={item.key} className={`panel membership-status-stat ${filter === item.key ? "selected" : ""}`} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}><span>{item.label}</span><strong>{item.count}</strong></button>)}
        </div>}
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">THÔNG TIN GÓI THÀNH VIÊN</span><h2>Danh sách tra cứu</h2></div><button className="button secondary" onClick={refresh}><RefreshCw size={16} /> Làm mới</button></div>
          <div className="toolbar">
            <label className="search-field"><Search size={18} /><input aria-label="Tìm thành viên" placeholder="Tìm tên, email, số điện thoại hoặc mã thành viên..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <select aria-label="Lọc trạng thái gói" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="EXPIRING">Sắp hết hạn (&lt; 7 ngày)</option>{Object.entries(labels).filter(([key]) => key !== "SCHEDULED_DOWNGRADE").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          </div>
          {loading ? <div className="empty-state" role="status">Đang tải thông tin thành viên...</div> : !error && <>
            <p className="membership-status-help">{visible.length} thành viên · Số ngày còn lại tính cả hôm nay và ngày cuối sử dụng. Tạm ngưng không tự động kéo dài kỳ hạn.</p>
            {visible.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Thành viên</th><th>Gói tập</th><th>Trạng thái</th><th>Ngày hết hạn</th><th>Còn lại</th><th>Thao tác</th></tr></thead><tbody>
              {visible.map((row) => <tr key={row.member.id}>
                <td><strong>{row.member.fullName || row.member.username}</strong><small>{row.member.email}</small><small>{row.member.phone || "Chưa có số điện thoại"}</small></td>
                <td>{row.subscription?.packageName ?? "—"}{row.upcoming && row.upcoming !== row.subscription && <small>Đã có kỳ tiếp theo từ {formatDate(row.upcoming.startDate)}</small>}</td>
                <td><span className={`status-chip ${row.status.toLowerCase()}`}>{labels[row.status]}</span></td>
                <td>{row.subscription ? formatDate(row.subscription.endDate) : "—"}{row.status === "PENDING_PAYMENT" && <small>Dự kiến, chưa kích hoạt</small>}</td>
                <td><strong>{row.status === "NONE" || row.status === "PENDING_PAYMENT" || row.status === "UPCOMING" || row.status === "SCHEDULED_DOWNGRADE" ? "—" : `${row.remainingDays} ngày`}</strong>{row.expiringSoon && <small className="membership-expiry-warning"><AlertTriangle size={14} /> Sắp hết hạn</small>}</td>
                <td><button className="text-button" onClick={() => setSelectedId(row.member.id)}>Xem chi tiết <ArrowRight size={15} /></button></td>
              </tr>)}
            </tbody></table></div> : <div className="empty-state"><Users size={30} /><h3>Không tìm thấy thành viên</h3><p>Thử tìm kiếm khác hoặc chọn tất cả trạng thái.</p><button className="button secondary" onClick={() => { setQuery(""); setFilter("ALL"); }}>Xóa bộ lọc</button></div>}
          </>}
        </section>
    {selected && <Dialog title="Thông tin thành viên & gói tập" onClose={() => setSelectedId(null)} footer={<><button className="button secondary" onClick={() => setSelectedId(null)}>Đóng</button><Link className="button primary" to={`/receptionist/memberships?member=${encodeURIComponent(selected.member.id)}`}>Đăng ký / Gia hạn <ArrowRight size={16} /></Link></>}>
      <div className="order-summary"><h3>{selected.member.fullName || selected.member.username}</h3><dl>
        <div><dt>Mã thành viên</dt><dd>{selected.member.username || selected.member.id}</dd></div><div><dt>Email</dt><dd>{selected.member.email}</dd></div><div><dt>Số điện thoại</dt><dd>{selected.member.phone || "Chưa cập nhật"}</dd></div>
        <div><dt>Gói tập</dt><dd>{selected.subscription?.packageName ?? "Chưa có gói"}</dd></div><div><dt>Trạng thái</dt><dd><span className={`status-chip ${selected.status.toLowerCase()}`}>{labels[selected.status]}</span></dd></div>
        {selected.subscription && <><div><dt>Ngày bắt đầu</dt><dd>{formatDate(selected.subscription.startDate)}</dd></div><div><dt>Sử dụng đến hết</dt><dd>{formatDate(selected.subscription.endDate)}</dd></div></>}
        {["ACTIVE", "SUSPENDED", "EXPIRED"].includes(selected.status) && <div><dt>Số ngày còn lại</dt><dd>{selected.remainingDays} ngày</dd></div>}
      </dl></div>
      {selected.expiringSoon && <div className="pending-notice" role="status"><AlertTriangle size={22} /><div><strong>Gói sắp hết hạn: còn {selected.remainingDays} ngày</strong><p>{selected.upcoming ? `Đã có kỳ tiếp theo bắt đầu ${formatDate(selected.upcoming.startDate)}.` : "Nhắc thành viên gia hạn để tiếp tục tập luyện."}</p></div></div>}
      {selected.status === "SUSPENDED" && <div className="info-note"><ShieldCheck size={20} /><p>Gói đang tạm ngưng, chưa được sử dụng để vào tập. {selected.subscription?.suspensionReason || "Liên hệ quản lý trung tâm để kiểm tra lý do và hỗ trợ."}</p></div>}
      {selected.status === "EXPIRED" && <div className="info-note"><p>Gói đã hết hạn. Thành viên cần gia hạn và hoàn tất thanh toán để tiếp tục sử dụng.</p></div>}
      {selected.status === "PENDING_PAYMENT" && <div className="info-note"><p>Gói chưa có hiệu lực. Ngày sử dụng đang là dự kiến, cần xác nhận thanh toán.</p></div>}
    </Dialog>}
  </>;
}
