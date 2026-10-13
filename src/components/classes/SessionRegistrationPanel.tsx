import { useId, useState } from "react";
import { CalendarCheck, CalendarX, Users } from "lucide-react";
import { Dialog } from "../common/Dialog";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { classApi } from "../../services/classApi";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import {
  canCancelRegistration,
  canRegisterSession,
  remainingSeats,
} from "../../utils/classSchedule";
import type {
  ClassRegistration,
  ClassSession,
  RegistrationChannel,
  SessionMemberOption,
} from "../../types/classes";

interface SessionRegistrationPanelProps {
  session: ClassSession;
  /** Đăng ký hiện có của người/thành viên này trên buổi đó, nếu đã đặt. */
  registration?: ClassRegistration | null;
  /**
   * `MEMBER`: người đang đăng nhập tự đặt chỗ (UC24/UC25).
   * `RECEPTIONIST`: lễ tân đặt thay, bắt buộc có `onBehalfOf` (UC29).
   */
  channel?: RegistrationChannel;
  onBehalfOf?: SessionMemberOption | null;
  /** Trang gọi lại để tải lại danh sách sau khi đặt hoặc hủy. */
  onChanged: () => void | Promise<void>;
  /** `card` thêm viền và số chỗ; `inline` chỉ có nút, để nhúng vào bảng. */
  layout?: "card" | "inline";
}

/**
 * Nút đăng ký và hủy đăng ký một buổi học.
 *
 * Dùng chung cho hai màn hình: chi tiết buổi học của Member (UC24/UC25, do
 * Long ghép vào trang danh sách lớp) và màn hình quầy của lễ tân (UC29). Hai
 * nơi chạy cùng một tập quy tắc và cùng cách dịch lỗi, nên thành viên tự đặt
 * và lễ tân đặt thay không thể lệch nhau về hành vi.
 *
 * Component tự gọi service và tự hiển thị lỗi; trang chỉ cần cung cấp buổi học
 * và một hàm tải lại dữ liệu.
 */
export function SessionRegistrationPanel({
  session,
  registration = null,
  channel = "MEMBER",
  onBehalfOf = null,
  onChanged,
  layout = "card",
}: SessionRegistrationPanelProps) {
  const prefix = useId();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [dialogError, setDialogError] = useState("");

  const isCounter = channel === "RECEPTIONIST";
  const subjectName = isCounter
    ? (onBehalfOf?.fullName ?? "thành viên")
    : "bạn";
  const activeRegistration =
    registration && registration.status === "BOOKED" ? registration : null;
  const availability = activeRegistration
    ? canCancelRegistration(activeRegistration)
    : canRegisterSession(session);
  const seatsLeft = remainingSeats(session);

  // Lễ tân chưa chọn thành viên thì không có gì để đặt; nói rõ thay vì để nút
  // bật mà bấm vào lại báo lỗi.
  const missingMember = isCounter && !onBehalfOf;

  async function handleRegister() {
    if (!currentUser) return;
    setIsWorking(true);
    try {
      if (isCounter && onBehalfOf)
        await classApi.registerAtCounter(
          session.id,
          onBehalfOf.id,
          currentUser,
        );
      else await classApi.registerMyself(session.id, currentUser);
      toast.success(
        isCounter
          ? `Đã đăng ký ${onBehalfOf?.fullName} vào buổi ${session.startTime} ngày ${session.date}.`
          : `Đã đặt chỗ buổi ${session.startTime} ngày ${session.date}.`,
      );
      await onChanged();
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCancel() {
    if (!currentUser || !activeRegistration) return;
    const trimmed = reason.trim();
    // Lễ tân hủy thay thì lý do là bắt buộc để audit nói được vì sao; thành
    // viên tự hủy thì lý do là tùy chọn.
    if (isCounter && (trimmed.length < 3 || trimmed.length > 500)) {
      setReasonError("Nhập lý do hủy từ 3 đến 500 ký tự.");
      return;
    }
    if (!isCounter && trimmed.length > 500) {
      setReasonError("Lý do tối đa 500 ký tự.");
      return;
    }
    setReasonError("");
    setIsWorking(true);
    try {
      if (isCounter)
        await classApi.cancelAtCounter(
          activeRegistration.id,
          trimmed,
          currentUser,
        );
      else
        await classApi.cancelMyRegistration(
          activeRegistration.id,
          trimmed,
          currentUser,
        );
      toast.success(
        isCounter
          ? `Đã hủy đăng ký của ${activeRegistration.memberName}. Chỗ được trả lại cho buổi học.`
          : "Đã hủy đăng ký. Chỗ được trả lại cho buổi học.",
      );
      setIsCancelOpen(false);
      setReason("");
      setDialogError("");
      await onChanged();
    } catch (caught) {
      setReasonError(fieldErrorsOf(caught).reason ?? "");
      setDialogError(describeError(caught));
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div
      className={`session-registration ${layout === "card" ? "is-card" : "is-inline"}`}
    >
      {layout === "card" && (
        <p className="session-registration-seats">
          <span className="inline-icon">
            <Users size={16} aria-hidden="true" />
            {seatsLeft > 0
              ? `Còn ${seatsLeft}/${session.capacity} chỗ`
              : `Đã đủ ${session.capacity} chỗ`}
          </span>
          {activeRegistration && (
            <span className="status-chip active">Đã đăng ký</span>
          )}
        </p>
      )}

      <div className="session-registration-actions">
        {activeRegistration ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setIsCancelOpen(true);
              setReason("");
              setReasonError("");
              setDialogError("");
            }}
            disabled={isWorking || !availability.isAllowed}
            title={availability.reason || undefined}
          >
            <CalendarX size={17} aria-hidden="true" />
            Hủy đăng ký
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            onClick={handleRegister}
            disabled={isWorking || !availability.isAllowed || missingMember}
            title={availability.reason || undefined}
          >
            <CalendarCheck size={17} aria-hidden="true" />
            {isWorking
              ? "Đang xử lý…"
              : isCounter
                ? "Đăng ký tại quầy"
                : "Đặt chỗ"}
          </button>
        )}
      </div>

      {(missingMember || !availability.isAllowed) && (
        <p className="session-registration-reason">
          {missingMember
            ? "Chọn thành viên trước khi đăng ký thay."
            : availability.reason}
        </p>
      )}

      {isCancelOpen && activeRegistration && (
        <Dialog
          title="Hủy đăng ký buổi học"
          description={`${activeRegistration.session.className} · ${activeRegistration.session.date} · ${activeRegistration.session.startTime}–${activeRegistration.session.endTime}`}
          onClose={() => setIsCancelOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => setIsCancelOpen(false)}
                disabled={isWorking}
              >
                Giữ đăng ký
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleCancel}
                disabled={isWorking}
              >
                {isWorking ? "Đang hủy…" : "Xác nhận hủy"}
              </button>
            </>
          }
        >
          <p>
            Chỗ sẽ được trả lại cho buổi học và lịch sử đăng ký của{" "}
            {subjectName} vẫn được giữ.
          </p>
          <div className="field field-full">
            <label htmlFor={`${prefix}-reason`}>
              Lý do hủy{" "}
              {isCounter ? (
                <span aria-hidden="true">*</span>
              ) : (
                <small>(không bắt buộc)</small>
              )}
            </label>
            <textarea
              id={`${prefix}-reason`}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                isCounter
                  ? "Ví dụ: Thành viên gọi điện xin hủy vì đi công tác."
                  : "Ví dụ: Trùng lịch công việc."
              }
              maxLength={500}
              disabled={isWorking}
              aria-invalid={Boolean(reasonError)}
              aria-describedby={
                reasonError ? `${prefix}-reason-error` : undefined
              }
            />
            {reasonError && (
              <small className="form-error" id={`${prefix}-reason-error`}>
                {reasonError}
              </small>
            )}
          </div>
          {dialogError && (
            <p className="form-error" role="alert">
              {dialogError}
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
