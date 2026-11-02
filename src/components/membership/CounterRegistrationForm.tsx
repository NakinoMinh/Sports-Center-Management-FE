import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as v from "../../utils/validation";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { Dialog } from "../common/Dialog";
import { membershipApi } from "../../services/membershipApi";
import type {
  MembershipActor,
  MembershipOrder,
  MembershipPackage,
  PaymentMethod,
} from "../../types/membership";
import { durationLabel, formatMoney } from "../../utils/format";

export function CounterRegistrationForm({
  actor: _actor,
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
    emailDelivery: "SENT" | "FAILED" | "NOT_CONFIGURED";
  } | null>(null);
  const pkg = packages.find((p) => p.id === form.packageId);
  const [fieldErrors, setFieldErrors] = useState<v.FieldErrors>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setFieldErrors({});
    if (!pkg) {
      setError("Bắt buộc chọn gói tập trước khi đăng ký thành viên.");
      return;
    }
    const errors = v.validateForm(form, {
      fullName: v.fullName,
      email: v.email,
      phone: v.phone,
      dateOfBirth: v.dateOfBirth,
    });
    if (v.hasErrors(errors)) {
      setFieldErrors(errors);
      setError(v.firstError(errors) ?? "");
      return;
    }
    setBusy(true);
    try {
      const result = await membershipApi.counterRegisterMember({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        packageId: form.packageId,
        expectedPrice: pkg.price,
        paymentMethod: form.paymentMethod,
      });

      setCreated(result);
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <Dialog
        title="Đã tạo thành viên & hóa đơn chờ thanh toán"
        onClose={() => onCreated(created.member, created.order)}
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => onCreated(created.member, created.order)}
            >
              Xem hóa đơn tại quầy
            </button>
            <Link
              className="button primary"
              to={`/payments/cash?invoice=${created.order.invoice.id}`}
            >
              Đến xác nhận thu tiền mặt
            </Link>
          </>
        }
      >
        <div className="order-summary">
          <h3>{created.member.fullName}</h3>
          <p>Email đăng nhập: {created.member.email}</p>
          <p>
            Mã hóa đơn: <strong>{created.order.invoice.number}</strong> · Cần
            thu: <strong>{formatMoney(created.order.invoice.amount)}</strong>
          </p>
          <p>
            Trạng thái hiện tại: <strong>Chờ thanh toán (PENDING_PAYMENT)</strong>
          </p>
        </div>
        <div className="info-note">
          <p>
            {created.emailDelivery === "SENT"
              ? "Thông tin kích hoạt tài khoản đã được gửi tới email của hội viên."
              : "Tài khoản hội viên và đơn đăng ký gói đã được lưu nguyên tử trên hệ thống."}{" "}
            Gói tập chỉ chuyển sang trạng thái hoạt động sau khi nhân viên xác
            nhận đã thu đủ tiền mặt tại quầy.
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
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="counter-fieldset">
          <div className="field-grid">
            <label className="field">
              <span>Họ và tên *</span>
              <input
                maxLength={80}
                autoComplete="name"
                value={form.fullName}
                aria-invalid={Boolean(fieldErrors.fullName)}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              {fieldErrors.fullName && (
                <small className="field-error">{fieldErrors.fullName}</small>
              )}
            </label>
            <label className="field">
              <span>Số điện thoại *</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="0901234567"
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone && (
                <small className="field-error">{fieldErrors.phone}</small>
              )}
            </label>
            <label className="field field-full">
              <span>Email *</span>
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {fieldErrors.email && (
                <small className="field-error">{fieldErrors.email}</small>
              )}
            </label>
            <label className="field">
              <span>Ngày sinh *</span>
              <input
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
                aria-invalid={Boolean(fieldErrors.dateOfBirth)}
              />
              {fieldErrors.dateOfBirth && (
                <small className="field-error">{fieldErrors.dateOfBirth}</small>
              )}
            </label>
            <div className="field">
              <span>Thông tin đăng nhập</span>
              <p>
                Hệ thống tự động khởi tạo bảo mật cho hội viên đăng nhập bằng
                email.
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
                {packages
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((p) => (
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
              </select>
            </label>
          </div>
          <div className="info-note">
            <p>
              {pkg
                ? `Cần thanh toán ${formatMoney(pkg.price)}. `
                : "Chưa chọn gói tập. "}
              Tạo yêu cầu sẽ sinh hóa đơn chờ thanh toán (PENDING_PAYMENT). Gói
              chỉ được kích hoạt sau khi xác nhận thu tiền mặt tại quầy.
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
