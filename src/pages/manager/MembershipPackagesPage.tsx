import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  Layers3,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import {
  PackageForm,
  type PackageFormValues,
} from "../../components/membership/PackageForm";
import { useAuth } from "../../hooks/useAuth";
import { membershipService } from "../../services/membershipService";
import type {
  MemberSubscription,
  MembershipActor,
  MembershipPackage,
} from "../../types/membership";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
const durationLabel = (months: number) =>
  months === 1 ? "Gói tháng" : months === 3 ? "Gói quý" : "Gói năm";
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Không thể thực hiện thao tác. Vui lòng thử lại.";

function readCatalog(actor: MembershipActor | null): {
  packages: MembershipPackage[];
  subscriptions: MemberSubscription[];
  error: string;
} {
  if (!actor || actor.role !== "CENTER_MANAGER")
    return { packages: [], subscriptions: [], error: "" };
  try {
    return {
      packages: membershipService.listPackages(actor, { includeHidden: true }),
      subscriptions: membershipService.getMemberSubscriptions(actor),
      error: "",
    };
  } catch (caught) {
    return { packages: [], subscriptions: [], error: errorMessage(caught) };
  }
}

export function MembershipPackagesPage() {
  const { currentUser } = useAuth();
  const [catalog, setCatalog] = useState(() => readCatalog(currentUser));
  const { packages, subscriptions } = catalog;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");
  const [editing, setEditing] = useState<MembershipPackage | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<MembershipPackage | null>(null);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    setCatalog(readCatalog(currentUser));
    setError("");
  }

  const subscribers = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const subscription of subscriptions) {
      if (!counts.has(subscription.packageId))
        counts.set(subscription.packageId, new Set());
      counts.get(subscription.packageId)!.add(subscription.memberId);
    }
    return counts;
  }, [subscriptions]);

  const visiblePackages = packages.filter((item) => {
    const matchesSearch = item.name
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi"));
    const matchesStatus =
      filter === "all" ||
      (filter === "active" ? item.isActive : !item.isActive);
    return matchesSearch && matchesStatus;
  });
  const activeCount = packages.filter((item) => item.isActive).length;
  const deletingHasSubscribers = Boolean(
    deleting && subscribers.get(deleting.id)?.size,
  );

  function savePackage(values: PackageFormValues) {
    if (!currentUser) return;
    try {
      membershipService.savePackage(
        currentUser,
        values,
        editing && editing !== "new" ? editing.id : undefined,
      );
      setNotice(
        editing === "new"
          ? "Đã tạo gói tập mới. Thành viên có thể đăng ký ngay."
          : "Đã cập nhật gói tập. Các lượt đăng ký trước đó được giữ nguyên.",
      );
      setEditing(null);
      setFormError("");
      refresh();
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  }

  function changeVisibility(item: MembershipPackage) {
    if (!currentUser) return;
    try {
      membershipService.setPackageVisibility(
        currentUser,
        item.id,
        !item.isActive,
      );
      setNotice(
        item.isActive
          ? `Đã ẩn “${item.name}”. Gói tập đã đăng ký vẫn còn hiệu lực.`
          : `Đã mở bán lại “${item.name}”.`,
      );
      setDeleting(null);
      setFormError("");
      refresh();
    } catch (caught) {
      if (deleting) setFormError(errorMessage(caught));
      else setError(errorMessage(caught));
    }
  }

  function deletePackage() {
    if (!currentUser || !deleting) return;
    try {
      membershipService.deletePackage(currentUser, deleting.id);
      setNotice(`Đã xóa “${deleting.name}”.`);
      setDeleting(null);
      setFormError("");
      refresh();
    } catch (caught) {
      setFormError(errorMessage(caught));
    }
  }

  if (currentUser?.role !== "CENTER_MANAGER") {
    return (
      <div className="empty-state">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ quản lý trung tâm có thể quản lý danh mục gói tập.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ TRUNG TÂM</p>
          <h1>Gói thành viên</h1>
          <p>Thiết kế những lựa chọn tập luyện phù hợp với từng thành viên.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setEditing("new");
              setFormError("");
            }}
          >
            <Plus size={18} aria-hidden="true" />
            Tạo gói tập
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Tổng số gói tập</p>
            <strong>{packages.length.toString().padStart(2, "0")}</strong>
            <small>Trong danh mục trung tâm</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <BadgeCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Đang mở bán</p>
            <strong>{activeCount.toString().padStart(2, "0")}</strong>
            <small>Sẵn sàng cho thành viên đăng ký</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet">
            <EyeOff size={22} aria-hidden="true" />
          </div>
          <div>
            <p>Đang ẩn</p>
            <strong>
              {(packages.length - activeCount).toString().padStart(2, "0")}
            </strong>
            <small>Lưu lại thông tin và lịch sử</small>
          </div>
        </div>
      </div>

      {notice && (
        <div className="feedback success" role="status">
          <BadgeCheck size={18} aria-hidden="true" />
          {notice}
        </div>
      )}
      {(error || catalog.error) && (
        <div className="feedback error" role="alert">
          {error || catalog.error}
          <button type="button" className="button secondary" onClick={refresh}>
            Thử lại
          </button>
        </div>
      )}

      <section className="panel" aria-labelledby="package-list-title">
        <div className="panel-heading">
          <div>
            <h2 id="package-list-title">Danh mục gói tập</h2>
            <p>Quản lý giá, thời hạn và quyền lợi trong một nơi.</p>
          </div>
          <span className="count-label">{packages.length} gói tập</span>
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
          <select
            aria-label="Lọc trạng thái gói tập"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang mở bán</option>
            <option value="hidden">Đang ẩn</option>
          </select>
        </div>

        {visiblePackages.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Tên gói & quyền lợi</th>
                  <th scope="col">Thời hạn</th>
                  <th scope="col">Giá gói</th>
                  <th scope="col">Thành viên</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="package-table-name">
                        <span className="package-icon">
                          <Package size={20} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{item.name}</strong>
                          <details className="package-benefits">
                            <summary>{item.benefits.length} quyền lợi</summary>
                            <ul>
                              {item.benefits.map((benefit, index) => (
                                <li key={`${index}-${benefit}`}>{benefit}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{item.durationMonths} tháng</strong>
                      <small className="cell-caption">
                        {durationLabel(item.durationMonths)}
                      </small>
                    </td>
                    <td>
                      <strong>{currency.format(item.price)}</strong>
                      <small className="cell-caption">
                        {currency.format(
                          Math.round(item.price / item.durationMonths),
                        )}{" "}
                        / tháng
                      </small>
                    </td>
                    <td>
                      <span className="inline-icon">
                        <Users size={16} aria-hidden="true" />
                        {subscribers.get(item.id)?.size ?? 0}
                      </span>
                      <small className="cell-caption">Đã đăng ký</small>
                    </td>
                    <td>
                      <span
                        className={`status-chip ${item.isActive ? "active" : "hidden"}`}
                      >
                        {item.isActive ? "Đang mở bán" : "Đang ẩn"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Chỉnh sửa ${item.name}`}
                          title="Chỉnh sửa gói tập"
                          onClick={() => {
                            setEditing(item);
                            setFormError("");
                          }}
                        >
                          <Pencil size={17} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`${item.isActive ? "Ẩn" : "Hiện"} ${item.name}`}
                          title={item.isActive ? "Ẩn gói tập" : "Hiện gói tập"}
                          onClick={() => changeVisibility(item)}
                        >
                          {item.isActive ? (
                            <EyeOff size={17} aria-hidden="true" />
                          ) : (
                            <Eye size={17} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Xóa ${item.name}`}
                          title="Xóa gói tập"
                          onClick={() => {
                            setDeleting(item);
                            setFormError("");
                          }}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Package size={36} aria-hidden="true" />
            <h3>
              {packages.length
                ? "Không tìm thấy gói tập"
                : "Bắt đầu với gói tập đầu tiên"}
            </h3>
            <p>
              {packages.length
                ? "Thử một tên khác hoặc thay đổi bộ lọc trạng thái."
                : "Tạo gói tập để thành viên lựa chọn và bắt đầu hành trình tập luyện."}
            </p>
            {packages.length ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setEditing("new");
                  setFormError("");
                }}
              >
                Tạo gói tập
              </button>
            )}
          </div>
        )}
        <div className="table-footer">
          <span>
            Hiển thị {visiblePackages.length} / {packages.length} gói tập
          </span>
          <span>Gói đã có người đăng ký chỉ có thể ẩn.</span>
        </div>
      </section>

      {editing && (
        <Dialog
          title={editing === "new" ? "Tạo gói tập mới" : "Chỉnh sửa gói tập"}
          description="Điền thông tin gói tập. Các trường có dấu * là bắt buộc."
          onClose={() => setEditing(null)}
        >
          <PackageForm
            initialValues={editing === "new" ? undefined : editing}
            onSubmit={savePackage}
            onCancel={() => setEditing(null)}
            error={formError}
          />
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title={
            deletingHasSubscribers ? "Giữ lại lịch sử đăng ký" : "Xóa gói tập?"
          }
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeleting(null)}
              >
                Hủy
              </button>
              {deletingHasSubscribers ? (
                deleting.isActive && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => changeVisibility(deleting)}
                  >
                    <EyeOff size={17} aria-hidden="true" />
                    Ẩn gói tập
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className="button danger"
                  onClick={deletePackage}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Xác nhận xóa
                </button>
              )}
            </>
          }
        >
          <p>
            {deletingHasSubscribers ? (
              <>
                “{deleting.name}” đã có thành viên đăng ký nên không thể xóa.{" "}
                {deleting.isActive
                  ? "Bạn có thể ẩn gói để ngừng nhận đăng ký mới mà vẫn giữ thông tin của thành viên."
                  : "Gói này đang được ẩn và không nhận đăng ký mới."}
              </>
            ) : (
              <>
                Bạn có chắc muốn xóa “{deleting.name}”? Thao tác này không thể
                hoàn tác.
              </>
            )}
          </p>
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
