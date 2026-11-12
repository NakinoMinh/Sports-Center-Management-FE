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
import { buildMembershipQuote, getSubscriptionStatus, resolveOrderKind, orderKindLabels } from "../../services/membershipService";
import {
  membershipApi,
  subscriptionFromInvoice,
} from "../../services/membershipApi";
import { memberApi } from "../../services/memberApi";
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
import { MembershipTermsDialog } from "../../components/membership/MembershipTermsDialog";
import { MemberTermsStatus } from "../../components/membership/MemberTermsStatus";
import { membershipTermsApi } from "../../services/membershipTermsApi";
import { describeError } from "../../services/apiErrors";
import type { CurrentMembershipTerms, MemberTermsStatus as TermsStatus } from "../../types/membership";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt tại quầy",
  BANK_TRANSFER: "Chuyển khoản",
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
  const [selectedMember, setSelectedMember] = useState(
    searchParams.get("member") ?? "",
  );
  const [memberEmailSearch, setMemberEmailSearch] = useState("");
  const [submittedEmailSearch, setSubmittedEmailSearch] = useState("");
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
  const [terms, setTerms] = useState<CurrentMembershipTerms | null>(null);
  const [counterTermsStatus, setCounterTermsStatus] = useState<TermsStatus | null>(null);
  const [termsBusy, setTermsBusy] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [intendedPackage, setIntendedPackage] = useState<MembershipPackage | null>(null);
  const isCounter = mode === "receptionist";
  const memberId = isCounter ? selectedMember : (currentUser?.id ?? "");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const publicPackages = (await membershipApi.listPublicPackages()).sort(
        (a, b) => a.price - b.price,
      );
      const membersList = isCounter
        ? await memberApi.listAllMembers(submittedEmailSearch)
        : [currentUser];
      const memberInvoices = memberId
        ? await membershipApi.listInvoices({ memberId })
        : [];
      const memberSubs = memberInvoices.map(subscriptionFromInvoice);
      if (isCounter) {
        setCounterTermsStatus(memberId ? await membershipTermsApi.getMemberStatus(memberId) : null);
      } else {
        setTerms(await membershipTermsApi.getCurrent());
      }
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
  }, [currentUser, isCounter, memberId, submittedEmailSearch]);

  const refreshCounterTerms = useCallback(async () => {
    if (!memberId || !isCounter) return;
    setTermsBusy(true);
    try {
      setCounterTermsStatus(await membershipTermsApi.getMemberStatus(memberId));
      setTermsError("");
    } catch (err) {
      setTermsError(describeError(err));
    } finally {
      setTermsBusy(false);
    }
  }, [isCounter, memberId]);

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

  const confirmed = snapshot.subscriptions.filter(
    (sub) => sub.status === "CONFIRMED",
  );
  const current = [...confirmed]
    .filter((sub) => {
      const st = getSubscriptionStatus(sub);
      return st === "ACTIVE" || st === "SUSPENDED";
    })
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const isCurrentSuspended = current
    ? getSubscriptionStatus(current) === "SUSPENDED"
    : false;
  const upcomingSub = [...confirmed]
    .filter((sub) => {
      const st = getSubscriptionStatus(sub);
      return st === "UPCOMING" || st === "SCHEDULED_DOWNGRADE";
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const pending = snapshot.subscriptions.find(
    (sub) => sub.status === "PENDING_PAYMENT",
  );
  const kind = confirmed.length ? "RENEW" : "REGISTER";
  const member = snapshot.members.find((item) => item.id === memberId);

  function openQuote(pkg: MembershipPackage) {
    if (!currentUser) return;
    setError("");
    setNotice("");
    setQuoteError("");
    try {
      const target = member ?? currentUser;
      setQuote(buildMembershipQuote(target, snapshot.subscriptions, pkg, "CASH"));
    } catch (err) {
      refresh();
      setError(err instanceof Error ? err.message : "Không thể lập đăng ký.");
    }
  }

  function selectPackage(pkg: MembershipPackage) {
    if (isCounter && !counterTermsStatus?.accepted) {
      setError("Học viên chưa tự chấp nhận điều khoản hiện hành. Không thể tạo đơn gói tại quầy.");
      return;
    }
    if (!isCounter && !terms?.accepted) {
      setIntendedPackage(pkg);
      setTermsError("");
      setShowTerms(true);
      return;
    }
    openQuote(pkg);
  }

  async function confirmOrder() {
    if (!quote || !currentUser || submitting) return;
    setSubmitting(true);
    setQuoteError("");
    try {
      const order = isCounter
        ? await membershipApi.counterRegisterOrRenew(
            quote.memberId,
            quote.packageId,
            quote.paymentMethod,
            quote.packagePrice,
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
          ? "Đã tạo yêu cầu và hóa đơn chờ thanh toán tại quầy. Vui lòng xác nhận thu tiền mặt để kích hoạt gói."
          : "Đã tạo yêu cầu và hóa đơn chờ thanh toán. Gói mới chưa được kích hoạt.",
      );
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
            <Link
              className="button secondary"
              to="/receptionist/membership-status"
            >
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
            <Link className="button secondary" to="/invoices">
              Tra cứu hóa đơn
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
            <span>Tìm thành viên bằng email</span>
            <div className="member-search-row">
              <input
                type="email"
                value={memberEmailSearch}
                placeholder="Nhập email thành viên"
                onChange={(event) => setMemberEmailSearch(event.target.value)}
              />

              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setSubmittedEmailSearch(memberEmailSearch.trim());
                  setSelectedMember("");
                  setNotice("");
                  setQuote(null);
                  setInvoice(null);
                }}
              >
                Tìm kiếm
              </button>
            </div>
          </label>
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
            <>
              <div className="selected-member">
                <CheckCircle2 size={18} />
                <span>Đang hỗ trợ <strong>{member.fullName}</strong> · {member.email}</span>
              </div>
              <MemberTermsStatus status={counterTermsStatus} busy={termsBusy} onRefresh={refreshCounterTerms} />
              {termsError && <p className="form-error" role="alert">{termsError}</p>}
            </>
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
                  className={`status-chip ${
                    current
                      ? isCurrentSuspended
                        ? "warning"
                        : "active"
                      : "neutral"
                  }`}
                >
                  <span className="status-dot" />
                  {current
                    ? isCurrentSuspended
                      ? "Gói hiện tại đang tạm ngưng (bảo lưu)"
                      : "Gói hiện tại đang hoạt động"
                    : "Chưa có gói đang hoạt động"}
                </span>
                {isCurrentSuspended && current?.suspensionReason && (
                  <p style={{ marginTop: "0.5rem", color: "#fbbf24" }}>
                    Lý do bảo lưu: <strong>{current.suspensionReason}</strong>
                  </p>
                )}
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
          {isCurrentSuspended && current && (
            <div className="pending-notice">
              <Clock3 size={22} />
              <div>
                <strong>Gói tập hiện tại đang tạm ngưng (bảo lưu)</strong>
                <p>
                  {current.packageName} · HSD đến {formatDate(current.endDate)}
                  {current.suspensionReason
                    ? ` · Lý do: ${current.suspensionReason}`
                    : ""}
                  . Vui lòng mở lại gói tập trước khi thực hiện gia hạn hoặc mua gói mới.
                </p>
              </div>
              {isCounter && (
                <Link
                  className="button secondary"
                  to="/receptionist/membership-status"
                >
                  Mở lại gói tập
                </Link>
              )}
            </div>
          )}
          {upcomingSub && (
            <div className="pending-notice">
              <CalendarDays size={22} />
              <div>
                <strong>Đã có sẵn gói tập nối tiếp trong tương lai</strong>
                <p>
                  {upcomingSub.packageName} · Dự kiến bắt đầu từ{" "}
                  {formatDate(upcomingSub.startDate)} đến{" "}
                  {formatDate(upcomingSub.endDate)}. Không cần gia hạn thêm cho
                  đến khi kỳ này bắt đầu.
                </p>
              </div>
            </div>
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
                  Mọi gia hạn, nâng gói, hạ gói hoặc đổi gói đều được tính nguyên
                  giá và bắt đầu sau ngày kết thúc kỳ đã thanh toán gần nhất.
                  Gói hiện tại không thay đổi và không thể hủy sau khi thanh toán.
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
                {snapshot.packages
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((pkg) => (
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
                        {formatMoney(
                          Math.round(pkg.price / pkg.durationMonths),
                        )}
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
                        disabled={
                          !!pending ||
                          isCurrentSuspended ||
                          !!upcomingSub ||
                          !memberId ||
                          !!error ||
                          (isCounter && !counterTermsStatus?.accepted)
                        }
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
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <Link className="button secondary" to="/invoices">
                      <FileText size={16} />
                      Tra cứu hóa đơn & biên nhận
                    </Link>
                    <span className="count-badge">
                      {snapshot.subscriptions.length} đăng ký
                    </span>
                  </div>
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
      {showTerms && terms && (
        <MembershipTermsDialog
          terms={terms}
          busy={termsBusy}
          error={termsError}
          onClose={() => { setShowTerms(false); setIntendedPackage(null); setTermsError(""); }}
          onAccept={async (version, contentHash) => {
            setTermsBusy(true); setTermsError("");
            try {
              await membershipTermsApi.accept(version, contentHash);
              const currentTerms = await membershipTermsApi.getCurrent();
              setTerms(currentTerms);
              setShowTerms(false);
              const selected = intendedPackage;
              setIntendedPackage(null);
              if (selected) openQuote(selected);
            } catch (err) {
              setTermsError(describeError(err));
              try { setTerms(await membershipTermsApi.getCurrent()); } catch { /* keep the actionable error */ }
            } finally { setTermsBusy(false); }
          }}
        />
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
          <div className="info-note">
            <p>
              Gói này được tính nguyên giá <strong>{formatMoney(quote.packagePrice)}</strong>
              {" "}và bắt đầu theo lịch từ <strong>{formatDate(quote.startDate)}</strong>.
              Gói hiện tại không thay đổi; không nâng, hạ hoặc đổi gói giữa kỳ.
            </p>
          </div>
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
                    await membershipApi.cancelPendingOrder(invoice.id);
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
          onClose={() => setRegistering(false)}
          onCreated={(newMember, emailDelivery) => {
            setRegistering(false);
            setSelectedMember(newMember.id);
            void refresh();
            setNotice(
              `Đã tạo tài khoản cho ${newMember.fullName}${emailDelivery === "SENT" ? " và gửi thông tin đăng nhập qua email" : ""}. Học viên phải tự đăng nhập và chấp nhận điều khoản trước khi đăng ký gói.`,
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
