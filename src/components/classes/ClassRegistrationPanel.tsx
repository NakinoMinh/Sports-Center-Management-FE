import { useId, useState } from "react";
import { CalendarCheck, CalendarX, Users } from "lucide-react";
import { Dialog } from "../common/Dialog";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { ApiError } from "../../services/apiClient";
import { classApi } from "../../services/classApi";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { describeRecurrence } from "../../utils/classSchedule";
import type {
  ClassEnrollment,
  ClassScheduleBlock,
  RegistrationChannel,
  SessionMemberOption,
  TrainingClass,
} from "../../types/classes";

/** Mã lỗi nghĩa là dữ liệu trên màn hình đã cũ, nên tải lại ngay. */
const STALE_CODES = [
  "CLASS_FULL",
  "CONCURRENCY_CONFLICT",
  "DUPLICATE_REGISTRATION",
  "CLASS_NOT_OPEN",
  "CLASS_HAS_NO_VALID_SESSION",
];

/**
 * Mô tả lịch lớp trong một dòng cho tiêu đề hộp thoại: mỗi đợt một mệnh đề, nối
 * bằng dấu chấm phẩy, nên lớp nhiều ca không bị mô tả theo giờ của một ca.
 */
const describeSchedule = (blocks: readonly ClassScheduleBlock[]): string =>
  blocks.length === 0
    ? "chưa có lịch"
    : blocks
        .map((block) =>
          describeRecurrence(block.daysOfWeek, block.startTime, block.endTime),
        )
        .join("; ");

interface ClassRegistrationPanelProps {
  trainingClass: TrainingClass;
  /** Lượt đăng ký hiện có của thành viên trên lớp này, nếu đã đăng ký. */
  enrollment?: ClassEnrollment | null;
  /**
   * `MEMBER`: người đang đăng nhập tự đăng ký (UC24/UC25).
   * `RECEPTIONIST`: lễ tân đăng ký thay, bắt buộc có `onBehalfOf` (UC29).
   */
  channel?: RegistrationChannel;
  onBehalfOf?: SessionMemberOption | null;
  onChanged: () => void | Promise<void>;
  layout?: "card" | "inline";
}

/**
 * Đăng ký và hủy đăng ký cả lớp học.
 *
 * Thành viên chọn lớp, không chọn từng buổi: một lượt đăng ký giữ chỗ cho mọi
 * buổi còn ở tương lai của lớp, và hủy thì nhả chỗ ở mọi buổi chưa bắt đầu.
 * Server là nơi quyết định — nó từ chối kèm ngày cụ thể khi có buổi đã đủ chỗ
 * hoặc trùng lịch, nên màn hình chỉ chặn trước những trường hợp thấy rõ.
 */
export function ClassRegistrationPanel({
  trainingClass,
  enrollment = null,
  channel = "MEMBER",
  onBehalfOf = null,
  onChanged,
  layout = "card",
}: ClassRegistrationPanelProps) {
  const prefix = useId();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [dialogError, setDialogError] = useState("");

  const isCounter = channel === "RECEPTIONIST";
  const active =
    enrollment && enrollment.status === "BOOKED" ? enrollment : null;
  const missingMember = isCounter && !onBehalfOf;
  const isOpen = trainingClass.status === "OPEN";
  const hasUpcoming = trainingClass.upcomingSessionCount > 0;
  const seatsLeft = Math.max(
    0,
    trainingClass.capacity - trainingClass.activeRegistrationCount,
  );

  const blockedReason = !isOpen
    ? "Lớp chưa mở đăng ký."
    : !hasUpcoming
      ? "Lớp không còn buổi nào ở tương lai."
      : seatsLeft === 0
        ? "Lớp đã đủ số lượng học viên."
        : "";

  async function handleRegister() {
    if (!currentUser) return;
    setIsWorking(true);
    try {
      const result =
        isCounter && onBehalfOf
          ? await classApi.registerClassAtCounter(
              trainingClass.id,
              onBehalfOf.id,
            )
          : await classApi.registerClass(trainingClass.id);
      toast.success(
        isCounter
          ? `Đã đăng ký ${onBehalfOf?.fullName} vào lớp “${trainingClass.name}” với ${result.bookedSessionCount} buổi.`
          : `Đã đăng ký lớp “${trainingClass.name}” với ${result.bookedSessionCount} buổi.`,
      );
      await onChanged();
    } catch (caught) {
      toast.error(describeError(caught));
      if (
        caught instanceof ApiError &&
        STALE_CODES.includes(caught.code ?? "")
      ) {
        try {
          await onChanged();
        } catch (refreshError) {
          toast.error(describeError(refreshError));
        }
      }
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCancel() {
    if (!currentUser || !active) return;
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
        await classApi.cancelClassAtCounter(
          trainingClass.id,
          active.memberId,
          trimmed,
        );
      else await classApi.cancelMyClass(trainingClass.id, trimmed);
      toast.success(
        `Đã hủy đăng ký lớp “${trainingClass.name}”. Các buổi chưa diễn ra được trả lại chỗ.`,
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
              ? `Còn ${seatsLeft}/${trainingClass.capacity} chỗ`
              : `Đã đủ ${trainingClass.capacity} chỗ`}
          </span>
          {active && (
            <span className="status-chip active">
              Đã đăng ký · {active.upcomingSessionCount} buổi sắp tới
            </span>
          )}
        </p>
      )}

      <div className="session-registration-actions">
        {active ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setIsCancelOpen(true);
              setReason("");
              setReasonError("");
              setDialogError("");
            }}
            disabled={isWorking || active.upcomingSessionCount === 0}
            title={
              active.upcomingSessionCount === 0
                ? "Mọi buổi đã đăng ký đều đã diễn ra."
                : undefined
            }
          >
            <CalendarX size={17} aria-hidden="true" />
            Hủy đăng ký lớp
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            onClick={handleRegister}
            disabled={isWorking || Boolean(blockedReason) || missingMember}
            title={blockedReason || undefined}
          >
            <CalendarCheck size={17} aria-hidden="true" />
            {isWorking
              ? "Đang xử lý…"
              : isCounter
                ? "Đăng ký lớp tại quầy"
                : `Đăng ký cả lớp (${trainingClass.upcomingSessionCount} buổi)`}
          </button>
        )}
      </div>

      {(missingMember || blockedReason) && (
        <p className="session-registration-reason">
          {missingMember
            ? "Chọn thành viên trước khi đăng ký thay."
            : blockedReason}
        </p>
      )}

      {isCancelOpen && active && (
        <Dialog
          title="Hủy đăng ký cả lớp?"
          description={`${trainingClass.name} · ${describeSchedule(trainingClass.scheduleBlocks)}`}
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
          {dialogError && (
            <p className="form-error" role="alert">
              {dialogError}
            </p>
          )}
          <p>
            Hủy sẽ nhả chỗ ở {active.upcomingSessionCount} buổi chưa diễn ra.
            Các buổi đã học vẫn được giữ trong lịch sử.
          </p>
          <div className="field">
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
              maxLength={500}
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
        </Dialog>
      )}
    </div>
  );
}
