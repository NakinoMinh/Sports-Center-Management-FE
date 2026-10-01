import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
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
  addDateDays,
  addMonthsClamped,
  getSubscriptionStatus,
  resolveOrderKind,
  orderKindLabels,
  todayDate,
} from "../../services/membershipService";
import {
  membershipApi,
  subscriptionFromInvoice,
} from "../../services/membershipApi";
import { memberApi } from "../../services/memberApi";
import { isApiConfigured } from "../../services/apiClient";
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
import { CounterRegistrationForm } from "../../components/membership/CounterRegistrationForm";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt tại quầy",
  BANK_TRANSFER: "Chuyển khoản (chưa kết nối)",
  CARD: "Thẻ tại quầy (chưa kết nối)",
};
const statusLabels = {
  ACTIVE: "Đang hoạt động",
  SUSPENDED: "Tạm ngưng",
  UPCOMING: "Sắp bắt đầu",
  EXPIRED: "Đã hết hạn",
  PENDING_PAYMENT: "Chờ thanh toán",
  SCHEDULED_DOWNGRADE: "Đã lên lịch hạ gói",
  REPLACED: "Đã nâng gói",
  CANCELED: "Đã hủy",
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
  const [searchParams] = useSearchParams();
  const [selectedMember, setSelectedMember] = useState(searchParams.get("member") ?? "");
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quote, setQuote] = useState<MembershipQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<MembershipInvoice | null>(null);
  const [registering, setRegistering] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const isCounter = mode === "receptionist";
  const memberId = isCounter ? selectedMember : (currentUser?.id ?? "");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      if (isApiConfigured()) {
        const publicPackages = (await membershipApi.listPublicPackages()).sort((a, b) => a.price - b.price);
        const membersList = isCounter
          ? await memberApi.listAllMembers()
          : [currentUser];
        const memberInvoices = memberId
          ? await membershipApi.listInvoices({ memberId })
          : [];
        const memberSubs = memberInvoices.map(subscriptionFromInvoice);
        setSnapshot({
          packages: publicPackages,
          members: membersList,
          subscriptions: memberSubs,
          invoices: memberInvoices,
        });
        setInvoice((opened) =>
          opened
            ? (memberInvoices.find((item) => item.id === opened.id) ?? null)
            : null,
        );
        setError("");
        return;
      }
      const invoices = memberId
        ? membershipService.listInvoices(currentUser, memberId)
        : [];
      setSnapshot({
        packages: membershipService.listPackages(currentUser).sort((a, b) => a.price - b.price),
        members: isCounter
          ? membershipService.listMembers(currentUser)
          : [currentUser],
        subscriptions: memberId
          ? membershipService.getMemberSubscriptions(currentUser, memberId)
          : [],
        invoices,
      });
      setInvoice((opened) =>
        opened
          ? (invoices.find((item) => item.id === opened.id) ?? null)
          : null,
      );
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

  const confirmed = snapshot.subscriptions.filter(
    (sub) => sub.status === "CONFIRMED",
  );
  const current = [...confirmed]
    .filter((sub) => getSubscriptionStatus(sub) === "ACTIVE")
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const pending = snapshot.subscriptions.find(
    (sub) => sub.status === "PENDING_PAYMENT",
  );
  const kind = confirmed.length ? "RENEW" : "REGISTER";
  const member = snapshot.members.find((item) => item.id === memberId);

  function selectPackage(pkg: MembershipPackage) {
    if (!currentUser) return;
    setError("");
    setNotice("");
    setQuoteError("");
    try {
      if (isApiConfigured()) {
        const target = member ?? currentUser;
        const confirmedSubs = snapshot.subscriptions.filter(
          (sub) => sub.status === "CONFIRMED" && !sub.replacedOn,
        );
        const today = todayDate();
        const latestEnd = confirmedSubs.reduce(
          (latest, item) => (item.endDate > latest ? item.endDate : latest),
          "",
        );
        const orderKind = resolveOrderKind(snapshot.subscriptions, pkg);
        const startDate =
          orderKind !== "UPGRADE" && latestEnd >= today
            ? addDateDays(latestEnd, 1)
            : today;
        const endDate = addDateDays(addMonthsClamped(startDate, pkg.durationMonths), -1);

        setQuote({
          memberId: target.id,
          memberName: target.fullName,
          memberEmail: target.email,
          packageId: pkg.id,
          packageName: pkg.name,
          packagePrice: pkg.price,
          durationMonths: pkg.durationMonths,
          benefits: pkg.benefits,
          amount: pkg.price,
          startDate,
          endDate,
          kind: orderKind,
          paymentMethod: "CASH",
        });
        return;
      }
      setQuote(
        membershipService.quoteMembershipOrder(currentUser, {
          memberId,
          packageId: pkg.id,
          kind: resolveOrderKind(snapshot.subscriptions, pkg),
          paymentMethod: "CASH",
        }),
      );
    } catch (err) {
      refresh();
      setError(err instanceof Error ? err.message : "Không thể lập đăng ký.");
    }
  }

  async function confirmOrder() {
    if (!quote || !currentUser || submitting) return;
    setSubmitting(true);
    setQuoteError("");
    try {
      if (isApiConfigured()) {
        const order = isCounter
          ? await membershipApi.counterRegisterOrRenew(
              quote.memberId,
              quote.packageId,
              quote.paymentMethod,
            )
          : await membershipApi.registerOrRenew(
              currentUser,
              quote.packageId,
              quote.paymentMethod,
            );
        setQuote(null);
        setInvoice(order.invoice);
        setSnapshot((previous) => ({
          ...previous,
          subscriptions: [order.subscription, ...previous.subscriptions],
          invoices: [order.invoice, ...previous.invoices],
        }));
        setNotice(
          isCounter
            ? "Đã đăng ký/gia hạn và ghi nhận thanh toán tại quầy."
            : "Đã tạo yêu cầu và hóa đơn chờ thanh toán. Gói mới chưa được kích hoạt.",
        );
        return;
      }
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
          <div className="counter-actions">
            <Link className="button secondary" to="/receptionist/membership-status">
              <ShieldCheck size={17} /> Kiểm tra trạng thái gói
            </Link>
            <button
              className="button primary"
              disabled={loading || !!error}
              onClick={() => setRegistering(true)}
            >
              Đăng ký thành viên mới tại quầy
            </button>
            <Link className="button secondary" to="/payments/cash">
              Xác nhận thu tiền mặt
            </Link>
          </div>
          <div className="member-picker-heading">
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
              <div className="info-note">
                <p>
                  Cùng gói hoặc cùng giá: gia hạn nối tiếp. Chọn gói giá cao hơn:
                  trừ giá trị ngày còn lại và bắt đầu đủ kỳ hạn mới khi thanh toán.
                  Gói giá thấp hơn bắt đầu sau kỳ đã trả tiền. Nếu đã trả trước
                  các kỳ tương lai, gói mới sẽ nối tiếp sau toàn bộ các kỳ đó,
                  thanh toán đủ giá để bảo toàn thời gian đã mua.
                </p>
              </div>
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
                {snapshot.packages.slice().sort((a, b) => a.price - b.price).map((pkg) => (
                  <article
                    className={`membership-package ${pkg.durationMonths === 3 ? "featured" : ""}`}
                    key={pkg.id}
                  >
                    {pkg.durationMonths === 3 && (
                      <div className="package-ribbon">
                        <Sparkles size={13} />
                        Gợi ý sử dụng
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
                      {
                        orderKindLabels[
                          resolveOrderKind(snapshot.subscriptions, pkg)
                        ]
                      }
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
                                    {orderKindLabels[sub.kind]} ·{" "}
                                    {durationLabel(sub.durationMonths)}
                                  </small>
                                </td>
                                <td>
                                  {formatDate(sub.startDate)} –{" "}
                                  {formatDate(sub.endDate)}
                                  {sub.replacedOn && (
                                    <small>
                                      Đã thay thế từ{" "}
                                      {formatDate(sub.replacedOn)}
                                    </small>
                                  )}
                                  {sub.status === "PENDING_PAYMENT" && (
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
          title={`Xác nhận: ${orderKindLabels[quote.kind]}`}
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
          {quote.kind === "UPGRADE" && (
            <div className="info-note">
              <p>
                Giá trị còn lại = {formatMoney(quote.previousPackagePrice ?? 0)} ×{" "}
                {quote.remainingDays}/{quote.previousPeriodDays} ngày ={" "}
                {formatMoney(quote.creditAmount ?? 0)} (làm tròn đến đồng).<br />
                Cần trả = {formatMoney(quote.packagePrice)} −{" "}
                {formatMoney(quote.creditAmount ?? 0)} ={" "}
                <strong>{formatMoney(quote.amount)}</strong>. Gói mới có đủ{" "}
                {quote.durationMonths} tháng từ ngày thanh toán. Báo giá chỉ có
                hiệu lực trong ngày; sang ngày khác cần hủy và lập lại.
              </p>
            </div>
          )}
          {quote.kind === "DOWNGRADE" && (
            <div className="info-note">
              <p>
                Giữ quyền lợi gói đã thanh toán đến hết kỳ.
                Gói giá thấp hơn chỉ bắt đầu từ {formatDate(quote.startDate)}, sau khi
                đã xác nhận thanh toán. Nếu có các kỳ trả trước, lịch hạ nằm sau
                toàn bộ các kỳ đó.
              </p>
            </div>
          )}
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
              {invoice.status === "PENDING_PAYMENT" && (
                <button
                  className="button danger"
                  onClick={() => setCanceling(true)}
                >
                  Hủy yêu cầu chưa thanh toán
                </button>
              )}
              {isCounter &&
                invoice.status === "PENDING_PAYMENT" &&
                invoice.paymentMethod === "CASH" && (
                  <Link
                    className="button secondary"
                    to={`/payments/cash?invoice=${invoice.id}`}
                  >
                    Đến xác nhận thu tiền
                  </Link>
                )}
            </>
          }
        >
          <InvoiceDocument invoice={invoice} />
        </Dialog>
      )}
      {canceling && invoice && currentUser && (
        <Dialog
          title="Hủy yêu cầu chưa thanh toán?"
          onClose={() => setCanceling(false)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setCanceling(false)}
              >
                Giữ yêu cầu
              </button>
              <button
                className="button danger"
                onClick={async () => {
                  try {
                    if (isApiConfigured()) {
                      await membershipApi.cancelPendingOrder(invoice.id);
                    } else {
                      membershipService.cancelPendingOrder(
                        currentUser,
                        invoice.id,
                      );
                    }
                    setInvoice(null);
                    setCanceling(false);
                    await refresh();
                    setNotice(
                      "Đã hủy yêu cầu chưa thanh toán. Gói đang hoạt động không thay đổi.",
                    );
                  } catch (err) {
                    setCanceling(false);
                    setInvoice(null);
                    await refresh();
                    setError(
                      err instanceof Error ? err.message : "Không thể hủy.",
                    );
                  }
                }}
              >
                Xác nhận hủy
              </button>
            </>
          }
        >
          <p>
            Chỉ hủy hóa đơn {invoice.number} và kỳ dự kiến đi kèm. Không hoàn
            tiền và không ảnh hưởng gói đã thanh toán.
          </p>
        </Dialog>
      )}
      {registering && currentUser && (
        <CounterRegistrationForm
          actor={currentUser}
          packages={snapshot.packages}
          onClose={() => setRegistering(false)}
          onCreated={(newMember, order) => {
            setRegistering(false);
            setSelectedMember(newMember.id);
            setInvoice(order.invoice);
            setNotice(
              `Đã tạo thành viên ${newMember.fullName} và yêu cầu gói. Cần xác nhận thanh toán để kích hoạt.`,
            );
          }}
        />
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
