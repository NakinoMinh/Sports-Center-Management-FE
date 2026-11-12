import { useState, type FormEvent } from "react";
import * as v from "../../utils/validation";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { membershipApi } from "../../services/membershipApi";
import type { MembershipActor } from "../../types/membership";
import { Dialog } from "../common/Dialog";

type EmailDelivery = "SENT" | "FAILED" | "NOT_CONFIGURED";

export function CounterRegistrationForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (member: MembershipActor, emailDelivery: EmailDelivery) => void;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", dateOfBirth: "" });
  const [fieldErrors, setFieldErrors] = useState<v.FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ member: MembershipActor; emailDelivery: EmailDelivery } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const errors = v.validateForm(form, {
      fullName: v.fullName, email: v.email, phone: v.phone, dateOfBirth: v.dateOfBirth,
    });
    setFieldErrors(errors);
    if (v.hasErrors(errors)) { setError(v.firstError(errors) ?? ""); return; }
    setBusy(true); setError("");
    try { setCreated(await membershipApi.counterRegisterMember(form)); }
    catch (err) { setFieldErrors(fieldErrorsOf(err)); setError(describeError(err)); }
    finally { setBusy(false); }
  }

  if (created) return (
    <Dialog title="Đã tạo tài khoản học viên" onClose={() => onCreated(created.member, created.emailDelivery)}
      footer={<button className="button primary" onClick={() => onCreated(created.member, created.emailDelivery)}>Hoàn tất</button>}>
      <div className="order-summary">
        <h3>{created.member.fullName}</h3>
        <p>Email đăng nhập: <strong>{created.member.email}</strong></p>
      </div>
      <div className="info-note"><p>
        {created.emailDelivery === "SENT" ? "Thông tin đăng nhập đã được gửi qua email. " : "Tài khoản đã được lưu. "}
        Học viên phải tự đăng nhập bằng tài khoản của họ, đọc kỹ và chấp nhận toàn bộ điều khoản trước khi đăng ký gói. Nhân viên không thể xác nhận thay.
      </p></div>
    </Dialog>
  );

  return (
    <Dialog title="Tạo tài khoản học viên tại quầy"
      description="Bước này chỉ tạo tài khoản. Không tạo gói tập hoặc hóa đơn."
      onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="counter-fieldset">
          <div className="field-grid">
            <label className="field"><span>Họ và tên *</span><input maxLength={100} value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              {fieldErrors.fullName && <small className="field-error">{fieldErrors.fullName}</small>}</label>
            <label className="field"><span>Số điện thoại *</span><input type="tel" inputMode="numeric" maxLength={10}
              value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} />
              {fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}</label>
            <label className="field field-full"><span>Email *</span><input type="email" value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })} />
              {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}</label>
            <label className="field"><span>Ngày sinh *</span><input type="date" min="1900-01-01" value={form.dateOfBirth}
              onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
              {fieldErrors.dateOfBirth && <small className="field-error">{fieldErrors.dateOfBirth}</small>}</label>
          </div>
          <div className="info-note"><p>Sau khi tạo tài khoản, yêu cầu học viên đăng nhập và chấp nhận điều khoản. Chỉ khi đó quầy mới có thể lập đơn gói cho kỳ sử dụng phù hợp.</p></div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="button primary" disabled={busy}>{busy ? "Đang tạo…" : "Tạo tài khoản"}</button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
