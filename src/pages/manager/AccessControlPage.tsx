import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { isApiConfigured } from "../../services/apiClient";
import { describeError } from "../../services/apiErrors";
import { accessRules, applyDynamicPermissions } from "../../services/accessControl";
import { trainingOperationsApi } from "../../services/trainingOperationsApi";
import { roleLabels } from "../../utils/navigation";
import type { UserRole } from "../../types/auth";

const rules: Record<keyof typeof accessRules, string> = {
  members: "Quản lý thành viên",
  packages: "Quản lý danh mục gói",
  classes: "Quản lý lớp học & lịch học",
  sports: "Quản lý bộ môn",
  centerSchedule: "Xem lịch trung tâm",
  memberClasses: "Khám phá lớp & lịch cá nhân",
  notifications: "Thông báo lớp học",
  permissions: "Xem & cấu hình phân quyền",
  membership: "Gói tập của bản thân",
  counter: "Nghiệp vụ tại quầy",
  payments: "Xác nhận tiền mặt",
  invoices: "Tra cứu hóa đơn & biên nhận",
  reports: "Xem báo cáo doanh thu, hội viên & lớp",
  coach: "Không gian huấn luyện viên",
};

const ALL_ROLES = Object.keys(roleLabels) as UserRole[];

export function AccessControlPage() {
  const [matrix, setMatrix] = useState<Record<string, UserRole[]>>(() => {
    const initial: Record<string, UserRole[]> = {};
    for (const [key, val] of Object.entries(accessRules)) {
      initial[key] = [...val];
    }
    return initial;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadPermissions = useCallback(async () => {
    if (!isApiConfigured()) return;
    try {
      const serverConfig = await trainingOperationsApi.getPermissions();
      applyDynamicPermissions(serverConfig);
      setMatrix((prev) => {
        const merged = { ...prev };
        for (const [key, roles] of Object.entries(serverConfig)) {
          if (roles && roles.length > 0) {
            merged[key] = roles;
          }
        }
        return merged;
      });
    } catch {
      // Giữ ma trận mặc định nếu server chưa có bản ghi tùy chỉnh
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  async function toggleRole(featureKey: string, role: UserRole) {
    if (savingKey) return;
    if (featureKey === "permissions" && role === "CENTER_MANAGER") {
      setError("Không thể gỡ quyền Quản trị phân quyền của Quản lý trung tâm.");
      return;
    }

    const currentRoles = matrix[featureKey] ?? [];
    const hasRole = currentRoles.includes(role);
    const nextRoles = hasRole
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    if (nextRoles.length === 0) {
      setError("Mỗi chức năng phải có ít nhất 1 vai trò được cấp quyền.");
      return;
    }

    setSavingKey(`${featureKey}:${role}`);
    setError("");
    setNotice("");

    try {
      if (isApiConfigured()) {
        await trainingOperationsApi.updatePermission({
          featureKey,
          allowedRoles: nextRoles,
        });
      }
      setMatrix((prev) => ({ ...prev, [featureKey]: nextRoles }));
      applyDynamicPermissions({ [featureKey]: nextRoles });
      setNotice(
        `Đã cập nhật quyền "${rules[featureKey as keyof typeof accessRules] ?? featureKey}" cho vai trò ${roleLabels[role]}.`,
      );
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ TRUY CẬP</span>
          <h1>Phân quyền hệ thống</h1>
          <p>
            Quản lý và điều chỉnh ma trận quyền truy cập cho từng vai trò. Mọi thay đổi được lưu xuống hệ thống, áp dụng ngay cho thanh điều hướng và ghi nhận vào Nhật ký thao tác (Audit Log).
          </p>
        </div>
        <div className="header-actions-group">
          <button
            type="button"
            className="button secondary"
            onClick={() => void loadPermissions()}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
          <span className="page-icon">
            <ShieldCheck size={26} />
          </span>
        </div>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ma trận quyền đang áp dụng</h2>
            <p>
              Tích chọn hoặc bỏ tích để cấp / thu hồi quyền truy cập chức năng theo vai trò.
            </p>
          </div>
          <span className="count-badge">{Object.keys(rules).length} phân hệ</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chức năng hệ thống</th>
                {ALL_ROLES.map((role) => (
                  <th key={role}>{roleLabels[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(rules).map(([key, label]) => (
                <tr key={key}>
                  <td>
                    <strong>{label}</strong>
                    <small className="muted">Mã phân hệ: {key}</small>
                  </td>
                  {ALL_ROLES.map((role) => {
                    const allowed = (matrix[key] ?? []).includes(role);
                    const locked =
                      key === "permissions" && role === "CENTER_MANAGER";
                    return (
                      <td key={role}>
                        <label
                          className={`permission-toggle-pill ${
                            allowed ? "is-allowed" : ""
                          } ${locked ? "is-locked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={allowed}
                            disabled={locked || savingKey !== null}
                            onChange={() => void toggleRole(key, role)}
                          />
                          <span>{allowed ? "Được phép" : "Không cấp"}</span>
                          {locked && <Lock size={12} />}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="info-note">
        <p>
          Danh mục gói công khai cho mọi người. Vai trò được kiểm tra khi mở
          trang và khi thực hiện thao tác. Tài khoản ngừng hoạt động hoặc bị
          khóa không được tiếp tục sử dụng.
        </p>
      </div>
    </>
  );
}
