import { ShieldCheck } from "lucide-react";
import { accessRules } from "../../services/accessControl";
import { roleLabels } from "../../utils/navigation";
import type { UserRole } from "../../types/auth";
const rules: Record<keyof typeof accessRules, string> = {
  members: "Quản lý thành viên",
  packages: "Quản lý danh mục gói",
  permissions: "Xem phân quyền",
  membership: "Gói tập của bản thân",
  counter: "Nghiệp vụ tại quầy",
  payments: "Xác nhận tiền mặt",
  coach: "Không gian huấn luyện viên",
};
export function AccessControlPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">QUẢN TRỊ TRUY CẬP</span>
          <h1>Phân quyền hệ thống</h1>
          <p>
            Quyền truy cập theo bốn vai trò. Thành viên chỉ được thao tác dữ
            liệu của mình.
          </p>
        </div>
        <span className="page-icon">
          <ShieldCheck size={26} />
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Ma trận quyền đang áp dụng</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chức năng</th>
                {Object.values(roleLabels).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(rules).map(([key, label]) => (
                <tr key={key}>
                  <th>{label}</th>
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                    <td key={role}>
                      {(
                        accessRules[
                          key as keyof typeof accessRules
                        ] as readonly UserRole[]
                      ).includes(role)
                        ? "Được phép"
                        : "—"}
                    </td>
                  ))}
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
