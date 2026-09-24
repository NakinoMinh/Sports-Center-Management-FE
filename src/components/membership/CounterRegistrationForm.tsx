import { useState, type FormEvent } from "react";
import { Dialog } from "../common/Dialog";
import { membershipService } from "../../services/membershipService";
import type {
  MembershipActor,
  MembershipOrder,
  MembershipPackage,
  PaymentMethod,
} from "../../types/membership";
import { durationLabel, formatMoney } from "../../utils/format";

export function CounterRegistrationForm({
  actor,
  packages,
  onClose,
  onCreated,
}: {
  actor: MembershipActor;
  packages: MembershipPackage[];
  onClose: () => void;
  onCreated: (member: MembershipActor, order: MembershipOrder) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    packageId: "",
    paymentMethod: "CASH" as PaymentMethod,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pkg = packages.find((p) => p.id === form.packageId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!pkg) {
      setError("Bắt buộc chọn gói tập trước khi đăng ký thành viên.");
      return;
    }
    setBusy(true);
    try {
      const result = await membershipService.registerMemberAtCounter(actor, {
        ...form,
        expectedPrice: pkg.price,
      });
      onCreated(result.member, result.order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể đăng ký thành viên.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Đăng ký thành viên mới tại quầy"
      description="Tạo tài khoản Member và yêu cầu gói tập cùng lúc. Không thay đổi phiên đăng nhập của lễ tân."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="counter-fieldset">
          <div className="field-grid">
            <label className="field">
              <span>Họ và tên *</span>
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Số điện thoại *</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901234567"
              />
            </label>
            <label className="field field-full">
              <span>Email *</span>
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Tên đăng nhập *</span>
              <input
                required
                minLength={3}
                maxLength={30}
                autoComplete="off"
                pattern="[a-zA-Z0-9_]{3,30}"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
              <small>3–30 chữ, số hoặc dấu gạch dưới.</small>
            </label>
            <label className="field">
              <span>Mật khẩu khởi tạo *</span>
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <small>
                Từ 8 ký tự. Bàn giao riêng cho thành viên; demo chưa gửi email.
              </small>
            </label>
            <label className="field field-full">
              <span>Gói tập bắt buộc *</span>
              <select
                required
                value={form.packageId}
                onChange={(e) =>
                  setForm({ ...form, packageId: e.target.value })
                }
              >
                <option value="">— Chọn gói cho thành viên mới —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.tier} · {durationLabel(p.durationMonths)} ·{" "}
                    {formatMoney(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-full">
              <span>Phương thức thanh toán</span>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
              >
                <option value="CASH">Tiền mặt tại quầy</option>
                <option value="BANK_TRANSFER">
                  Chuyển khoản (chưa kết nối)
                </option>
                <option value="CARD">Thẻ (chưa kết nối)</option>
              </select>
            </label>
          </div>
          <div className="info-note">
            <p>
              {pkg
                ? `Cần thanh toán ${formatMoney(pkg.price)}. `
                : "Chưa chọn gói tập. "}
              Tạo yêu cầu chưa có nghĩa là đã thu tiền. Gói chỉ được kích hoạt
              sau khi xác nhận thanh toán; thời hạn bắt đầu từ ngày xác nhận.
            </p>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={!pkg || busy}
            >
              {busy ? "Đang tạo…" : "Tạo thành viên & đăng ký gói"}
            </button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
