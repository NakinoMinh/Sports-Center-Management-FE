import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Dumbbell, Scale } from "lucide-react";
import { sportsCenterApi } from "../services/sportsCenterApi";
import type { PublicMembershipPackage } from "../types/membership";
import { useAuth } from "../hooks/useAuth";
import { homeForRole } from "../utils/navigation";
import { durationLabel, formatMoney } from "../utils/format";

export function PackageCatalogPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const inWorkspace = isAuthenticated && !!currentUser;
  const [packages, setPackages] = useState<PublicMembershipPackage[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async (isCanceled: () => boolean = () => false) => {
    try {
      const result = await sportsCenterApi.listActivePackages();
      if (isCanceled()) return;
      setPackages(result);
      setError("");
    } catch (err) {
      if (isCanceled()) return;
      setPackages([]);
      setError((err as Error).message);
    } finally {
      if (!isCanceled()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let canceled = false;
    const handleRefresh = () => void refresh(() => canceled);
    // Synchronize public catalog changes without requiring a signed-in account.
    // oxlint-disable-next-line react/set-state-in-effect
    handleRefresh();
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    const timer = window.setInterval(handleRefresh, 60000);
    return () => {
      canceled = true;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.clearInterval(timer);
    };
  }, [refresh]);
  const compared = packages.filter((pkg) => selected.includes(pkg.id));
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
          <span className="count-badge">Đã chọn {compared.length}/3 gói</span>
          {compared.length > 0 && (
            <a className="button secondary" href="#compare">
              Xem bảng so sánh
            </a>
          )}
        </div>
        {error && (
          <div className="error-notice" role="alert">
            {error}
            <button className="button secondary" onClick={() => void refresh()}>
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
              .filter(
                (pkg) =>
                  duration === "ALL" || String(pkg.durationMonths) === duration,
              )
              .map((pkg) => (
                <article className="membership-package" key={pkg.id}>
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
                    {pkg.benefits.map((benefit, index) => (
                      <li key={index}>
                        <Check size={16} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
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
                  <Link className="button primary" to={target}>
                    {currentUser?.role === "MEMBER"
                      ? "Đến đăng ký gói"
                      : currentUser
                        ? "Đến không gian làm việc"
                        : "Tạo tài khoản để đăng ký"}
                    <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
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
          {compared.length < 2 ? (
            <div className="empty-state">
              Chọn từ 2 đến 3 gói để so sánh giá và quyền lợi.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    {compared.map((pkg) => (
                      <th key={pkg.id}>{pkg.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Tổng giá</th>
                    {compared.map((pkg) => (
                      <td key={pkg.id}>{formatMoney(pkg.price)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th>Thời hạn</th>
                    {compared.map((pkg) => (
                      <td key={pkg.id}>{durationLabel(pkg.durationMonths)}</td>
                    ))}
                  </tr>
                  <tr>
                    <th>Trung bình / tháng</th>
                    {compared.map((pkg) => (
                      <td key={pkg.id}>
                        {formatMoney(
                          Math.round(pkg.price / pkg.durationMonths),
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>Quyền lợi</th>
                    {compared.map((pkg) => (
                      <td key={pkg.id}>
                        <ul className="catalog-benefits">
                          {pkg.benefits.map((benefit, index) => (
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
