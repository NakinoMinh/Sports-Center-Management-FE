import type { MemberTermsStatus as Status } from "../../types/membership";
import { formatDate } from "../../utils/format";

export function MemberTermsStatus({ status, busy, onRefresh }: {
  status: Status | null;
  busy: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  return <div className={`member-terms-status ${status?.accepted ? "accepted" : "required"}`}>
    <div>
      <strong>{status?.accepted ? "Đã chấp nhận điều khoản hiện hành" : "Chưa chấp nhận điều khoản hiện hành"}</strong>
      <p>{status?.accepted
        ? `Phiên bản ${status.acceptedVersion ?? status.currentVersion} · ${status.acceptedAtUtc ? formatDate(status.acceptedAtUtc) : "Đã ghi nhận"}`
        : "Học viên phải tự đăng nhập bằng tài khoản của họ để đọc và chấp nhận. Nhân viên không thể xác nhận thay."}</p>
    </div>
    <button type="button" className="button secondary" disabled={busy} onClick={onRefresh}>
      {busy ? "Đang kiểm tra…" : "Kiểm tra lại"}
    </button>
  </div>;
}
