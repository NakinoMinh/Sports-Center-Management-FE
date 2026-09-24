import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Dumbbell,
  FileText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Dialog } from "../../components/common/Dialog";
import {
  membershipService,
  getSubscriptionStatus,
} from "../../services/membershipService";
import type {
  MemberSubscription,
  MembershipActor,
  MembershipInvoice,
  MembershipPackage,
  MembershipQuote,
  PaymentMethod,
} from "../../types/membership";
import { durationLabel, formatDate, formatMoney } from "../../utils/format";
import { InvoiceDocument } from "../../components/membership/InvoiceDocument";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt tại quầy",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ tại quầy",
};
const statusLabels = {
  ACTIVE: "Đang hoạt động",
  UPCOMING: "Sắp bắt đầu",
  EXPIRED: "Đã hết hạn",
  PENDING: "Chờ thanh toán",
};
type Snapshot = {
  packages: MembershipPackage[];
  members: MembershipActor[];
  subscriptions: MemberSubscription[];
  invoices: MembershipInvoice[];
};
const emptySnapshot: Snapshot = {
  packages: [],
  members: [],
  subscriptions: [],
  invoices: [],
};

export function MembershipPage({ mode }: { mode: "member" | "receptionist" }) {
  const { currentUser } = useAuth();
  const [selectedMember, setSelectedMember] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quote, setQuote] = useState<MembershipQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<MembershipInvoice | null>(null);
  const isCounter = mode === "receptionist";
  const memberId = isCounter ? selectedMember : (currentUser?.id ?? "");

  const refresh = useCallback(() => {
    if (!currentUser) return;
    try {
      setSnapshot({
        packages: membershipService.listPackages(currentUser),
        members: isCounter
          ? membershipService.listMembers(currentUser)
          : [currentUser],
        subscriptions: memberId
          ? membershipService.getMemberSubscriptions(currentUser, memberId)
          : [],
        invoices: memberId
          ? membershipService.listInvoices(currentUser, memberId)
          : [],
      });
      setError("");
    } catch (err) {
      setSnapshot(emptySnapshot);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser, isCounter, memberId]);

  useEffect(() => {
    // Synchronize with the external localStorage adapter when the selected member changes.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const confirmed = snapshot.subscriptions.filter(
    (sub) => sub.status === "CONFIRMED",
  );
  const current = [...confirmed]
    .filter((sub) => getSubscriptionStatus(sub) === "ACTIVE")
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const pending = snapshot.subscriptions.find(
    (sub) => sub.status === "PENDING",
  );
  const kind = confirmed.length ? "RENEW" : "REGISTER";
  const member = snapshot.members.find((item) => item.id === memberId);

  function selectPackage(pkg: MembershipPackage) {
    if (!currentUser) return;
    setError("");
    setNotice("");
    setQuoteError("");
    try {
      setQuote(
        membershipService.quoteMembershipOrder(currentUser, {
          memberId,
          packageId: pkg.id,
          kind,
          paymentMethod: "CASH",
        }),
      );
    } catch (err) {
      refresh();
      setError(err instanceof Error ? err.message : "Không thể lập đăng ký.");
    }
  }

  function confirmOrder() {
    if (!quote || !currentUser || submitting) return;
    setSubmitting(true);
    setQuoteError("");
    try {
      // Re-quote before saving so an edit in another tab cannot silently change the confirmed price/dates.
      const latest = membershipService.quoteMembershipOrder(currentUser, quote);
      if (JSON.stringify(latest) !== JSON.stringify(quote)) {
        setQuote(latest);
        setQuoteError(
          "Thông tin gói vừa thay đổi. Vui lòng kiểm tra lại trước khi xác nhận.",
        );
        return;
      }
      const order = membershipService.createMembershipOrder(currentUser, quote);
      setQuote(null);
      setInvoice(order.invoice);
      setNotice(
        "Đã tạo yêu cầu và hóa đơn chờ thanh toán. Gói mới chưa được kích hoạt.",
      );
      refresh();
    } catch (err) {
      setQuoteError(
        err instanceof Error
          ? err.message
          : "Không thể lưu đăng ký. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {isCounter ? "DỊCH VỤ THÀNH VIÊN" : "HÀNH TRÌNH CỦA BẠN"}
          </span>
          <h1>
            {isCounter ? "Đăng ký & gia hạn tại quầy" : "Gói tập của tôi"}
          </h1>
          <p>
            {isCounter
              ? "Chọn thành viên, chuẩn bị gói tập và xuất hóa đơn trong một nơi."
              : "Duy trì thói quen. Tiến gần hơn tới mục tiêu của bạn."}
          </p>
        </div>
        <span className="page-icon">
          <CreditCard size={26} />
        </span>
      </div>
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={20} />
          {notice}
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          <span>{error}</span>
          <button className="button secondary" onClick={refresh}>
            <RefreshCw size={15} />
            Thử lại
          </button>
        </div>
      )}
      {isCounter && (
        <section className="panel member-picker">
          <div>
            <Users size={21} />
            <div>
              <h2>Thành viên cần hỗ trợ</h2>
              <p>Thông tin và hóa đơn sẽ được lưu cho người được chọn.</p>
            </div>
          </div>
          <label className="field">
            <span>Chọn thành viên</span>
            <select
              value={selectedMember}
              onChange={(event) => {
                setSelectedMember(event.target.value);
                setNotice("");
                setQuote(null);
                setInvoice(null);
              }}
            >
              <option value="">— Chọn thành viên —</option>
              {snapshot.members.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} · {item.email}
                </option>
              ))}
            </select>
          </label>
          {member && (
            <div className="selected-member">
              <CheckCircle2 size={18} />
              <span>
                Đang hỗ trợ <strong>{member.fullName}</strong> · {member.email}
              </span>
            </div>
          )}
        </section>
      )}
      {loading ? (
        <div className="panel empty-state" role="status">
          Đang tải gói tập...
        </div>
      ) : (
        <>
          {memberId && (
            <section className="membership-hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  {isCounter
                    ? `THẺ THÀNH VIÊN · ${member?.fullName ?? ""}`
                    : "THẺ THÀNH VIÊN TITAN"}
                </span>
                <h2>{current?.packageName ?? "Sẵn sàng cho khởi đầu mới?"}</h2>
                <p>
                  {current
                    ? "Một kế hoạch bền vững bắt đầu từ việc tập luyện đều đặn."
                    : "Chọn gói phù hợp để bắt đầu hành trình tập luyện tại Titan Arena."}
                </p>
                <span
                  className={`status-chip ${current ? "active" : "neutral"}`}
                >
                  <span className="status-dot" />
                  {current
                    ? "Gói hiện tại đang hoạt động"
                    : "Chưa có gói đang hoạt động"}
                </span>
                {current && (
                  <div className="membership-dates">
                    <div>
                      <span>Ngày bắt đầu</span>
                      <strong>{formatDate(current.startDate)}</strong>
                    </div>
                    <div>
                      <span>Sử dụng đến hết</span>
                      <strong>{formatDate(current.endDate)}</strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="membership-emblem" aria-hidden="true">
                <Dumbbell size={66} strokeWidth={1.4} />
                <span>
                  TITAN
                  <br />
                  MEMBERSHIP
                </span>
              </div>
            </section>
          )}
          {pending && (
            <div className="pending-notice">
              <Clock3 size={22} />
              <div>
                <strong>Bạn có một yêu cầu đang chờ thanh toán</strong>
                <p>
                  {pending.packageName} · Dự kiến{" "}
                  {formatDate(pending.startDate)} –{" "}
                  {formatDate(pending.endDate)}. Hoàn tất yêu cầu này trước khi
                  tạo yêu cầu mới.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  setInvoice(
                    snapshot.invoices.find(
                      (item) => item.id === pending.invoiceId,
                    ) ?? null,
                  )
                }
              >
                Xem hóa đơn
              </button>
            </div>
          )}
          {(!isCounter || memberId) && (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">CHỌN BƯỚC TIẾP THEO</span>
                  <h2>
                    {kind === "RENEW"
                      ? "Gia hạn hành trình tập luyện"
                      : "Tìm gói tập phù hợp"}
                  </h2>
                </div>
                <p>
                  <ShieldCheck size={16} />
                  Gia hạn được cộng tiếp sau thời hạn còn lại
                </p>
              </div>
              <div className="package-card-grid">
                {snapshot.packages.map((pkg) => (
                  <article
                    className={`membership-package ${pkg.durationMonths === 3 ? "featured" : ""}`}
                    key={pkg.id}
                  >
                    {pkg.durationMonths === 3 && (
                      <div className="package-ribbon">
                        <Sparkles size={13} />
                        Duy trì thói quen
                      </div>
                    )}
                    <span className="package-duration">
                      <CalendarDays size={16} />
                      {durationLabel(pkg.durationMonths)}
                    </span>
                    <h3>{pkg.name}</h3>
                    <div className="package-price">
                      {formatMoney(pkg.price)}
                      <small>/ {durationLabel(pkg.durationMonths)}</small>
                    </div>
                    <p className="package-price-note">
                      Tương đương{" "}
                      {formatMoney(Math.round(pkg.price / pkg.durationMonths))}
                      /tháng
                    </p>
                    <ul>
                      {pkg.benefits.map((benefit, i) => (
                        <li key={`${i}-${benefit}`}>
                          <Check size={16} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`button ${pkg.durationMonths === 3 ? "primary" : "secondary"}`}
                      disabled={!!pending || !memberId || !!error}
                      onClick={() => selectPackage(pkg)}
                    >
                      {kind === "RENEW" ? "Gia hạn gói này" : "Đăng ký gói này"}
                      <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!snapshot.packages.length && (
                <div className="panel empty-state">
                  <CreditCard size={30} />
                  <h3>Chưa có gói tập đang mở</h3>
                  <p>Vui lòng liên hệ lễ tân để được hỗ trợ.</p>
                </div>
              )}
              <section className="panel history-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">THEO DÕI ĐĂNG KÝ</span>
                    <h2>Lịch sử gói tập & hóa đơn</h2>
                  </div>
                  <span className="count-badge">
                    {snapshot.subscriptions.length} đăng ký
                  </span>
                </div>
                {snapshot.subscriptions.length ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Gói tập</th>
                          <th>Thời gian sử dụng</th>
                          <th>Giá trị</th>
                          <th>Trạng thái</th>
                          <th>Hóa đơn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...snapshot.subscriptions]
                          .sort((a, b) =>
                            b.createdAt.localeCompare(a.createdAt),
                          )
                          .map((sub) => {
                            const status = getSubscriptionStatus(sub);
                            const document = snapshot.invoices.find(
                              (item) => item.id === sub.invoiceId,
                            );
                            return (
                              <tr key={sub.id}>
                                <td>
                                  <strong>{sub.packageName}</strong>
                                  <small>
                                    {sub.kind === "RENEW"
                                      ? "Gia hạn"
                                      : "Đăng ký mới"}{" "}
                                    · {durationLabel(sub.durationMonths)}
                                  </small>
                                </td>
                                <td>
                                  {formatDate(sub.startDate)} –{" "}
                                  {formatDate(sub.endDate)}
                                  {sub.status === "PENDING" && (
                                    <small>
                                      Thời gian dự kiến, chưa kích hoạt
                                    </small>
                                  )}
                                </td>
                                <td className="money-cell">
                                  {formatMoney(sub.amount)}
                                </td>
                                <td>
                                  <span
                                    className={`status-chip ${status.toLowerCase()}`}
                                  >
                                    {statusLabels[status]}
                                  </span>
                                </td>
                                <td>
                                  {document && (
                                    <button
                                      className="text-button"
                                      onClick={() => setInvoice(document)}
                                    >
                                      <FileText size={15} />
                                      {document.number}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <FileText size={26} />
                    <h3>Hành trình của bạn bắt đầu từ đây</h3>
                    <p>Đăng ký đầu tiên và hóa đơn sẽ xuất hiện tại đây.</p>
                  </div>
                )}
              </section>
            </>
          )}
          {isCounter && !memberId && (
            <section className="panel empty-state counter-empty">
              <Users size={38} />
              <h2>Chọn thành viên để bắt đầu</h2>
              <p>
                Bạn có thể đăng ký gói mới, gia hạn gói hiện tại và in hóa đơn
                cho thành viên.
              </p>
              <div className="steps">
                <span>01 · Chọn thành viên</span>
                <ArrowRight size={16} />
                <span>02 · Chọn gói tập</span>
                <ArrowRight size={16} />
                <span>03 · Xuất hóa đơn</span>
              </div>
            </section>
          )}
        </>
      )}
      {quote && (
        <Dialog
          title={
            quote.kind === "RENEW"
              ? "Xác nhận gia hạn gói tập"
              : "Xác nhận đăng ký gói tập"
          }
          description="Kiểm tra thông tin trước khi tạo hóa đơn chờ thanh toán."
          onClose={() => {
            if (!submitting) setQuote(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={submitting}
                onClick={() => setQuote(null)}
              >
                Quay lại
              </button>
              <button
                className="button primary"
                disabled={submitting}
                onClick={confirmOrder}
              >
                {submitting ? "Đang lưu..." : "Xác nhận & tạo hóa đơn"}
                <ArrowRight size={16} />
              </button>
            </>
          }
        >
          <div className="order-summary">
            <div className="order-package">
              <span className="page-icon">
                <Dumbbell size={22} />
              </span>
              <div>
                <h3>{quote.packageName}</h3>
                <p>
                  {durationLabel(quote.durationMonths)} · {quote.memberName}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Email thành viên</dt>
                <dd>{quote.memberEmail}</dd>
              </div>
              <div>
                <dt>Bắt đầu dự kiến</dt>
                <dd>{formatDate(quote.startDate)}</dd>
              </div>
              <div>
                <dt>Ngày cuối sử dụng dự kiến</dt>
                <dd>{formatDate(quote.endDate)}</dd>
              </div>
              <div className="order-total">
                <dt>Tổng cần thanh toán</dt>
                <dd>{formatMoney(quote.amount)}</dd>
              </div>
            </dl>
          </div>
          <label className="field payment-field">
            <span>Phương thức thanh toán</span>
            <select
              value={quote.paymentMethod}
              onChange={(event) =>
                setQuote({
                  ...quote,
                  paymentMethod: event.target.value as PaymentMethod,
                })
              }
            >
              {Object.entries(paymentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="info-note">
            <Clock3 size={18} />
            <p>
              Yêu cầu sẽ ở trạng thái <strong>Chờ thanh toán</strong>. Việc chọn
              phương thức chưa thực hiện giao dịch. Gói chỉ có hiệu lực sau khi
              thanh toán được xác nhận.
            </p>
          </div>
          {quoteError && (
            <p className="form-error" role="alert">
              {quoteError}
            </p>
          )}
        </Dialog>
      )}
      {invoice && (
        <Dialog
          title="Chi tiết hóa đơn"
          onClose={() => setInvoice(null)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setInvoice(null)}
              >
                Đóng
              </button>
              <button className="button primary" onClick={() => window.print()}>
                <FileText size={17} />
                In / Lưu PDF
              </button>
            </>
          }
        >
          <InvoiceDocument invoice={invoice} />
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
