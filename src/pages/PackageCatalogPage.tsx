import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type {
  MemberSubscription,
  MembershipPackage,
  SubscriptionDisplayStatus,
} from "../types/membership";
import {
  membershipApi,
  subscriptionFromInvoice,
} from "../services/membershipApi";
import { describeError } from "../services/apiErrors";
import { getMembershipStatusSummary } from "../services/membershipService";
import { useAuth } from "../hooks/useAuth";
import { homeForRole } from "../utils/navigation";
import { durationLabel, formatDate, formatMoney } from "../utils/format";
import { membershipStatusLabels } from "../utils/membershipLabels";
import { buildCatalogComparisonPlans } from "../utils/catalogComparison";

type CurrentMembership = {
  subscription: MemberSubscription | null;
  status: SubscriptionDisplayStatus | "NONE";
  remainingDays: number;
};

const emptyCurrentMembership: CurrentMembership = {
  subscription: null,
  status: "NONE",
  remainingDays: 0,
};

export function PackageCatalogPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const inWorkspace = isAuthenticated && !!currentUser;
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentMembership, setCurrentMembership] =
    useState<CurrentMembership>(emptyCurrentMembership);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");
  const memberId = currentUser?.role === "MEMBER" ? currentUser.id : "";
  const isMember = Boolean(memberId);
  const refresh = useCallback(async () => {
    try {
      const items = await membershipApi.listPublicPackages();
      setPackages(items.sort((a, b) => a.price - b.price));
      setError("");
    } catch (err) {
      setPackages([]);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshCurrentMembership = useCallback(async () => {
    if (!memberId) return;
    setMembershipLoading(true);
    try {
      const invoices = await membershipApi.listInvoices({ memberId });
      const summary = getMembershipStatusSummary(
        invoices.map(subscriptionFromInvoice),
      );
      const hasCurrentPlan =
        summary.status === "ACTIVE" || summary.status === "SUSPENDED";
      setCurrentMembership({
        subscription: hasCurrentPlan ? (summary.subscription ?? null) : null,
        status: hasCurrentPlan
          ? (summary.status as CurrentMembership["status"])
          : "NONE",
        remainingDays: hasCurrentPlan ? summary.remainingDays : 0,
      });
      setMembershipError("");
    } catch (err) {
      setCurrentMembership(emptyCurrentMembership);
      setMembershipError(describeError(err));
    } finally {
      setMembershipLoading(false);
    }
  }, [memberId]);
  useEffect(() => {
    // Synchronize public catalog changes without requiring a signed-in account.
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
  useEffect(() => {
    if (!memberId) return;
    // Synchronize the member's plan independently so a failure never hides the public catalog.
    // oxlint-disable-next-line react/set-state-in-effect
    void refreshCurrentMembership();
    window.addEventListener("focus", refreshCurrentMembership);
    window.addEventListener("storage", refreshCurrentMembership);
    return () => {
      window.removeEventListener("focus", refreshCurrentMembership);
      window.removeEventListener("storage", refreshCurrentMembership);
    };
  }, [memberId, refreshCurrentMembership]);
  const currentSubscription = isMember
    ? currentMembership.subscription
    : null;
  const compared = packages.filter(
    (pkg) =>
      selected.includes(pkg.id) && pkg.id !== currentSubscription?.packageId,
  );
  const comparisonPlans = buildCatalogComparisonPlans(
    currentSubscription,
    compared,
  );
  const target = currentUser ? homeForRole(currentUser.role) : "/register";
  return (
    <div className={inWorkspace ? "workspace-catalog" : "workspace public-catalog"}>
      {!inWorkspace && <header className="catalog-nav">
        <Link to="/" className="catalog-brand">
          <Dumbbell /> TITAN ARENA
        </Link>
        <div className="counter-actions">
          <Link className="button secondary" to="/">
            Trang chủ
          </Link>
          <Link className="button primary" to={currentUser ? target : "/login"}>
            {currentUser ? "Không gian làm việc" : "Đăng nhập"}
          </Link>
        </div>
      </header>}
      <section className={inWorkspace ? undefined : "catalog-main"} aria-label="Danh mục gói tập">
        <div className="page-heading">
          <div>
            <span className="eyebrow">CHỌN GÓI PHÙ HỢP VỚI BẠN</span>
            <h1>Gói tập tại Titan Arena</h1>
            <p>
              Khám phá giá, thời hạn và quyền lợi. Chọn tối đa 3 gói để so sánh.
            </p>
          </div>
          <span className="page-icon">
            <Scale size={26} />
          </span>
        </div>
        {isMember && (
          <section
            className="catalog-current-plan"
            aria-labelledby="catalog-current-plan-title"
          >
            {membershipLoading ? (
              <div className="catalog-current-state" role="status">
                Đang tải gói hiện tại của bạn...
              </div>
            ) : membershipError ? (
              <div className="catalog-current-state" role="alert">
                <div>
                  <strong>Chưa tải được gói hiện tại</strong>
                  <p>{membershipError}</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => void refreshCurrentMembership()}
                >
                  Thử lại
                </button>
              </div>
            ) : currentSubscription ? (
              <>
                <div className="catalog-current-content">
                  <div className="catalog-current-heading">
                    <div>
                      <span className="eyebrow">GÓI HIỆN TẠI CỦA BẠN</span>
                      <div className="catalog-current-title-row">
                        <h2 id="catalog-current-plan-title">
                          {currentSubscription.packageName}
                        </h2>
                        <span
                          className={`status-chip ${currentMembership.status.toLowerCase()}`}
                        >
                          {membershipStatusLabels[currentMembership.status]}
                        </span>
                      </div>
                    </div>
                    <Link className="text-button" to="/member/membership">
                      Xem chi tiết <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="catalog-current-meta">
                    <span>
                      <CalendarDays size={17} />
                      {formatDate(currentSubscription.startDate)} –{" "}
                      {formatDate(currentSubscription.endDate)}
                    </span>
                    {currentMembership.remainingDays > 0 && (
                      <span>
                        <Clock3 size={17} />
                        Còn {currentMembership.remainingDays} ngày sử dụng
                      </span>
                    )}
                  </div>
                  <ul className="catalog-current-benefits">
                    {currentSubscription.benefits.map((benefit) => (
                      <li key={benefit}>
                        <Check size={16} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="catalog-current-price">
                  <span>Giá đã đăng ký</span>
                  <strong>{formatMoney(currentSubscription.packagePrice)}</strong>
                  <small>
                    {formatMoney(
                      Math.round(
                        currentSubscription.packagePrice /
                          currentSubscription.durationMonths,
                      ),
                    )}
                    /tháng
                  </small>
                </div>
              </>
            ) : (
              <div className="catalog-current-state catalog-current-empty">
                <ShieldCheck size={24} />
                <div>
                  <strong id="catalog-current-plan-title">
                    Bạn chưa có gói tập hiện tại
                  </strong>
                  <p>Chọn một gói bên dưới để bắt đầu tập luyện tại Titan Arena.</p>
                </div>
              </div>
            )}
          </section>
        )}
        <div className="toolbar">
          <label className="field">
            <span>Thời hạn</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="ALL">Tất cả thời hạn</option>
              <option value="1">Tháng</option>
              <option value="3">Quý</option>
              <option value="12">Năm</option>
            </select>
          </label>
          <span className="count-badge">
            Đã chọn {compared.length}/3 {currentSubscription ? "gói mới" : "gói"}
          </span>
          {compared.length > 0 && (
            <a className="button secondary" href="#compare">
              Xem bảng so sánh
            </a>
          )}
        </div>
        {error && (
          <div className="error-notice" role="alert">
            {error}
            <button className="button secondary" onClick={refresh}>
              Thử lại
            </button>
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            Đang tải gói tập...
          </div>
        ) : (
          <div className="package-card-grid">
            {packages
              .slice()
              .sort((a, b) => a.price - b.price)
              .filter(
                (pkg) =>
                  duration === "ALL" || String(pkg.durationMonths) === duration,
              )
              .map((pkg) => {
                const isCurrentPackage = currentSubscription?.packageId === pkg.id;
                return (
                <article
                  className={`membership-package${isCurrentPackage ? " catalog-current-match" : ""}`}
                  key={pkg.id}
                >
                  {isCurrentPackage && (
                    <span className="package-ribbon">
                      <ShieldCheck size={14} /> Đang sử dụng
                    </span>
                  )}
                  <span className="eyebrow">
                    {durationLabel(pkg.durationMonths)}
                  </span>
                  <h2>{pkg.name}</h2>
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
                    {(pkg.benefits ?? []).map((benefit, index) => (
                      <li key={index}>
                        <Check size={16} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrentPackage ? (
                    <div className="catalog-current-card-note">
                      <Check size={16} /> Được ghim sẵn trong bảng so sánh
                    </div>
                  ) : (
                    <label className="catalog-compare">
                      <input
                        type="checkbox"
                        checked={compared.some((item) => item.id === pkg.id)}
                        disabled={
                          compared.length >= 3 && !selected.includes(pkg.id)
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...compared.map((item) => item.id), pkg.id]
                              : selected.filter((id) => id !== pkg.id),
                          )
                        }
                      />{" "}
                      So sánh {pkg.name}
                    </label>
                  )}
                  <Link
                    className={`button ${isCurrentPackage ? "secondary" : "primary"}`}
                    to={target}
                  >
                    {isCurrentPackage
                      ? "Xem gói của tôi"
                      : currentUser?.role === "MEMBER"
                      ? "Đến đăng ký gói"
                      : currentUser
                        ? "Đến không gian làm việc"
                        : "Tạo tài khoản để đăng ký"}
                    <ArrowRight size={16} />
                  </Link>
                </article>
                );
              })}
          </div>
        )}
        {!loading &&
          !error &&
          !packages.some(
            (pkg) =>
              duration === "ALL" || String(pkg.durationMonths) === duration,
          ) && (
            <div className="panel empty-state">
              Chưa có gói đang mở cho thời hạn này.
            </div>
          )}
        <section id="compare" className="panel reception-history">
          <div className="panel-heading">
            <h2>So sánh gói tập</h2>
            {compared.length > 0 && (
              <button className="text-button" onClick={() => setSelected([])}>
                Bỏ chọn tất cả
              </button>
            )}
          </div>
          {comparisonPlans.length < 2 ? (
            <div className="empty-state">
              {currentSubscription
                ? "Gói hiện tại đã được ghim. Chọn ít nhất 1 gói mới để bắt đầu so sánh."
                : "Chọn từ 2 đến 3 gói để so sánh giá và quyền lợi."}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    {comparisonPlans.map((plan) => (
                      <th key={plan.key}>
                        {plan.isCurrent && (
                          <span className="catalog-table-current">Gói hiện tại</span>
                        )}
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Tổng giá</th>
                    {comparisonPlans.map((plan) => (
                      <td key={plan.key}>{formatMoney(plan.price)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th>Thời hạn</th>
                    {comparisonPlans.map((plan) => (
                      <td key={plan.key}>{durationLabel(plan.durationMonths)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th>Trung bình / tháng</th>
                    {comparisonPlans.map((plan) => (
                      <td key={plan.key}>
                        {formatMoney(
                          Math.round(plan.price / plan.durationMonths),
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>Quyền lợi</th>
                    {comparisonPlans.map((plan) => (
                      <td key={plan.key}>
                        <ul className="catalog-benefits">
                          {plan.benefits.map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
