import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Globe2,
  Layers3,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { classApi } from "../../services/classApi";
import {
  packageSportApi,
} from "../../services/packageSportApi";
import { describeError } from "../../services/apiErrors";
import { formatMoney, durationLabel } from "../../utils/format";
import type { Sport } from "../../types/classes";
import type {
  PackageSportEntitlement,
  PackageSummary,
} from "../../types/packageSports";

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/**
 * Quyền bộ môn của gói tập (FR-09) — màn hình bổ sung cho UC24.
 *
 * FR-09 yêu cầu chỉ cho đăng ký lớp khi "gói cho phép tham gia lớp đó", nhưng
 * không có UC nào trong Sprint 2 cấu hình quan hệ gói–bộ môn. Thiếu màn hình
 * này thì mã lỗi `PACKAGE_NOT_ELIGIBLE` không bao giờ bật được và luật trong
 * FR-09 chỉ nằm trên giấy.
 *
 * Quy ước: **không chọn bộ môn nào = gói vào được tất cả**. Nhờ vậy bảy gói đã
 * bán từ Sprint 1 giữ nguyên quyền lợi, không cần migration dữ liệu.
 */
export function PackageSportsPage() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [entitlements, setEntitlements] = useState<
    Record<string, PackageSportEntitlement>
  >({});
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PackageSummary | null>(null);
  const [draftSportIds, setDraftSportIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [packageList, sportList] = await Promise.all([
        packageSportApi.listPackages(),
        classApi.listSports(),
      ]);
      // Quyền của từng gói là một request riêng; tải song song để màn hình
      // không phải chờ tuần tự n lần.
      const entitlementList = await Promise.all(
        packageList.map((item) => packageSportApi.getEntitlement(item.id)),
      );
      setPackages(packageList);
      setSports(sportList);
      setEntitlements(
        Object.fromEntries(
          entitlementList.map((item) => [item.packageId, item]),
        ),
      );
      setError("");
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    // Hoãn một nhịp như các trang khác trong repo: gọi setState đồng bộ ngay
    // trong effect làm React dựng lại ngay lần render đầu.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const activeSports = useMemo(
    () => sports.filter((sport) => sport.isActive),
    [sports],
  );

  const visiblePackages = useMemo(() => {
    const needle = normalize(search.trim());
    return packages.filter(
      (item) => !needle || normalize(item.name).includes(needle),
    );
  }, [packages, search]);

  const restrictedCount = packages.filter(
    (item) => entitlements[item.id] && !entitlements[item.id].allowsAllSports,
  ).length;

  const sportName = (id: string): string =>
    sports.find((sport) => sport.id === id)?.name ?? id;

  function openEditor(item: PackageSummary) {
    setEditing(item);
    // Bộ môn đã ngừng hoạt động nhưng đang được cấp quyền vẫn phải hiện ra,
    // nếu không người dùng lưu lại là mất quyền đó mà không hay.
    setDraftSportIds(entitlements[item.id]?.sportIds ?? []);
    setFormError("");
  }

  function toggleSport(sportId: string) {
    setDraftSportIds((current) =>
      current.includes(sportId)
        ? current.filter((id) => id !== sportId)
        : [...current, sportId],
    );
  }

  async function saveEntitlement() {
    if (!editing) return;
    setIsSaving(true);
    try {
      // Bộ môn đã ngừng hoạt động bị loại trước khi gửi: server từ chối cả
      // yêu cầu nếu danh sách còn chứa chúng (SPORT_INACTIVE), mà người dùng
      // thì chỉ muốn lưu phần còn hợp lệ.
      const saved = await packageSportApi.saveEntitlement(
        editing.id,
        draftSportIds.filter((id) =>
          activeSports.some((sport) => sport.id === id),
        ),
      );
      setEntitlements((current) => ({ ...current, [saved.packageId]: saved }));
      toast.success(
        saved.allowsAllSports
          ? `“${editing.name}” giờ vào được mọi bộ môn.`
          : `Đã lưu ${saved.sportIds.length} bộ môn cho “${editing.name}”.`,
      );
      setEditing(null);
      setFormError("");
    } catch (caught) {
      setFormError(describeError(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (currentUser?.role !== "CENTER_MANAGER") {
    return (
      <div className="empty-state">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ quản lý trung tâm có thể cấu hình quyền bộ môn của gói tập.</p>
      </div>
    );
  }

  if (isLoading && !hasLoaded) {
    return (
      <div className="empty-state" role="status">
        Đang tải quyền bộ môn của các gói tập…
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ TRUNG TÂM</p>
          <h1>Quyền bộ môn của gói tập</h1>
          <p>
            Quyết định mỗi gói được tham gia lớp của những bộ môn nào. Thành
            viên đăng ký lớp ngoài quyền sẽ bị từ chối ngay khi đặt chỗ.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Tổng số gói</p>
            <strong>{String(packages.length).padStart(2, "0")}</strong>
            <small>Trong danh mục trung tâm</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Globe2 size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Vào được mọi bộ môn</p>
            <strong>
              {String(packages.length - restrictedCount).padStart(2, "0")}
            </strong>
            <small>Không giới hạn bộ môn nào</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Có giới hạn</p>
            <strong>{String(restrictedCount).padStart(2, "0")}</strong>
            <small>Chỉ một số bộ môn được phép</small>
          </div>
        </div>
      </div>

      {error && (
        <div className="feedback error" role="alert">
          {error}
          <button
            type="button"
            className="button secondary"
            onClick={() => void refresh()}
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="package-sport-title">
        <div className="panel-heading">
          <div>
            <h2 id="package-sport-title">Gói tập và bộ môn được phép</h2>
            <p>
              Không chọn bộ môn nào nghĩa là gói vào được <strong>tất cả</strong>
              . Gói cũ chưa cấu hình giữ nguyên quyền lợi như trước.
            </p>
          </div>
          <span className="count-label">{packages.length} gói</span>
        </div>

        <div className="toolbar">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Tìm kiếm gói tập"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên gói tập..."
            />
          </div>
        </div>

        {visiblePackages.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Gói tập</th>
                  <th scope="col">Thời hạn</th>
                  <th scope="col">Bộ môn được phép</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.map((item) => {
                  const entitlement = entitlements[item.id];
                  const allowsAll = entitlement?.allowsAllSports ?? true;
                  return (
                    <tr
                      key={item.id}
                      className={item.isActive ? "" : "row-inactive"}
                    >
                      <td>
                        <div className="package-table-name">
                          <span className="package-icon">
                            <Layers3 size={20} aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{item.name}</strong>
                            <small className="cell-caption">
                              {formatMoney(item.price)}
                              {item.isActive ? "" : " · đang ẩn"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{item.durationMonths} tháng</strong>
                        {/* durationLabel chỉ khác khi quy ra năm; gói 3 tháng
                            mà in "3 tháng" hai lần trông như lỗi hiển thị. */}
                        {durationLabel(item.durationMonths) !==
                          `${item.durationMonths} tháng` && (
                          <small className="cell-caption">
                            {durationLabel(item.durationMonths)}
                          </small>
                        )}
                      </td>
                      <td>
                        {allowsAll ? (
                          <span className="status-chip active">
                            Tất cả bộ môn
                          </span>
                        ) : (
                          <div className="sport-chip-list">
                            {entitlement.sportIds.map((sportId) => (
                              <span className="sport-chip" key={sportId}>
                                {sportName(sportId)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => openEditor(item)}
                        >
                          <SlidersHorizontal size={16} aria-hidden="true" />
                          Cấu hình
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Layers3 size={36} aria-hidden="true" />
            <h3>Không tìm thấy gói tập</h3>
            <p>Thử một tên khác hoặc xóa từ khóa tìm kiếm.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => setSearch("")}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        <div className="table-footer">
          <span>
            Hiển thị {visiblePackages.length} / {packages.length} gói
          </span>
          <span>
            Thay đổi áp dụng cho lần đặt chỗ tiếp theo, không hủy đăng ký đã có.
          </span>
        </div>
      </section>

      {editing && (
        <Dialog
          title={`Quyền bộ môn · ${editing.name}`}
          description="Chọn những bộ môn gói này được tham gia. Không chọn gì nghĩa là vào được tất cả."
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button primary"
                onClick={saveEntitlement}
                disabled={isSaving}
              >
                <Save size={17} aria-hidden="true" />
                {isSaving ? "Đang lưu…" : "Lưu quyền"}
              </button>
            </>
          }
        >
          <p
            className={`entitlement-summary ${draftSportIds.length ? "is-restricted" : "is-open"}`}
            role="status"
          >
            {draftSportIds.length ? (
              <>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  Gói chỉ vào được <strong>{draftSportIds.length}</strong> bộ
                  môn đã chọn. Lớp thuộc bộ môn khác sẽ bị từ chối khi đặt chỗ.
                </span>
              </>
            ) : (
              <>
                <Globe2 size={16} aria-hidden="true" />
                <span>
                  Chưa chọn bộ môn nào, nên gói này{" "}
                  <strong>vào được mọi bộ môn</strong>.
                </span>
              </>
            )}
          </p>

          <fieldset className="sport-picker">
            <legend>Bộ môn</legend>
            {activeSports.length ? (
              activeSports.map((sport) => (
                <label key={sport.id} htmlFor={`sport-${sport.id}`}>
                  <input
                    id={`sport-${sport.id}`}
                    type="checkbox"
                    checked={draftSportIds.includes(sport.id)}
                    onChange={() => toggleSport(sport.id)}
                    disabled={isSaving}
                  />
                  <span>{sport.name}</span>
                </label>
              ))
            ) : (
              <p>Chưa có bộ môn nào đang hoạt động.</p>
            )}
          </fieldset>

          {draftSportIds.some(
            (id) => !activeSports.some((sport) => sport.id === id),
          ) && (
            <p className="info-note">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>
                Gói đang được cấp quyền cho bộ môn đã ngừng hoạt động:{" "}
                {draftSportIds
                  .filter((id) => !activeSports.some((s) => s.id === id))
                  .map(sportName)
                  .join(", ")}
                . Lưu lại sẽ bỏ các bộ môn này khỏi danh sách.
              </span>
            </p>
          )}

          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
