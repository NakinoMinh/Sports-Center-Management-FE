import { useState, type FormEvent } from "react";
import { Dialog } from "../common/Dialog";
import { membershipService } from "../../services/membershipService";
import { isApiConfigured } from "../../services/apiClient";
import { memberApi } from "../../services/memberApi";
import { membershipApi } from "../../services/membershipApi";
import type {
  MembershipActor,
  MembershipOrder,
  MembershipPackage,
  PaymentMethod,
} from "../../types/membership";
import { durationLabel, formatMoney } from "../../utils/format";

const generateInitialPassword = (): string => {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return `Pass@${(randomValues[0] % 90000) + 10000}`;
};

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
    dateOfBirth: "",
    packageId: "",
    paymentMethod: "CASH" as PaymentMethod,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    member: MembershipActor;
    order: MembershipOrder;
    initialPassword: string;
  } | null>(null);
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
      if (isApiConfigured()) {
        const initialPassword = generateInitialPassword();
        const newMember = await memberApi.createMember(
          {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            dateOfBirth: form.dateOfBirth,
          },
          initialPassword,
        );

        const order = await membershipApi.counterRegisterOrRenew(
          newMember.id,
          form.packageId,
          form.paymentMethod,
        );

        setCreated({
          member: newMember,
          order,
          initialPassword,
        });
        return;
      }

      const result =
        await membershipService.registerMemberWithGeneratedCredentials(actor, {
          ...form,
          expectedPrice: pkg.price,
        });
      setCreated(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể đăng ký thành viên.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <Dialog
        title="Đã tạo thành viên tại quầy"
        onClose={() => onCreated(created.member, created.order)}
        footer={
          <button
            className="button primary"
            onClick={() => onCreated(created.member, created.order)}
          >
            Đã bàn giao · Xem hóa đơn
          </button>
        }
      >
        <div className="order-summary">
          <h3>{created.member.fullName}</h3>
          <p>Email đăng nhập: {created.member.email}</p>
          <p>Mật khẩu khởi tạo (chỉ hiển thị lần này):</p>
          <code className="initial-password">{created.initialPassword}</code>
        </div>
        <div className="info-note">
          <p>
            Email chưa được gửi vì dịch vụ gửi email chưa kết nối. Bàn giao
            riêng thông tin đăng nhập cho thành viên trước khi đóng. Hóa đơn
            đã được ghi nhận và gói tập đã kích hoạt theo giao dịch tại quầy.
          </p>
        </div>
      </Dialog>
    );
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
              <span>Ngày sinh *</span>
              <input
                required
                type="date"
                min="1900-01-01"
                autoComplete="bday"
                value={form.dateOfBirth}
                onInput={(e) => {
                  const dateOfBirth = e.currentTarget.value;
                  setForm((previous) => ({ ...previous, dateOfBirth }));
                }}
                onChange={(e) =>
                  setForm({ ...form, dateOfBirth: e.target.value })
                }
              />
            </label>
            <div className="field">
              <span>Thông tin đăng nhập</span>
              <p>
                Mật khẩu được sinh tự động. Thành viên đăng nhập bằng email.
              </p>
            </div>
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
                {packages.slice().sort((a, b) => a.price - b.price).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {durationLabel(p.durationMonths)} ·{" "}
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
