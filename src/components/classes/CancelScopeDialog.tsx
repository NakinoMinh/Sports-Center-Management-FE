import { useCallback, useEffect, useId, useState } from "react";
import { AlertTriangle, CalendarX, Users } from "lucide-react";
import { Dialog } from "../common/Dialog";
import { classApi } from "../../services/classApi";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { formatDate } from "../../utils/format";
import { formatTimeRange } from "../../utils/classSchedule";
import type {
  CancelImpact,
  CancelScope,
  ClassSession,
  TrainingClass,
} from "../../types/classes";

interface CancelScopeDialogProps {
  /** Buổi học được chọn; phạm vi lớp dùng chính lớp của buổi này. */
  session: ClassSession;
  owningClass?: TrainingClass;
  onClose: () => void;
  /** Gọi khi đã hủy xong, kèm số buổi bị hủy để trang báo đúng con số. */
  onCanceled: (scope: CancelScope, canceledSessionCount: number) => void;
  onSubmit: (scope: CancelScope, reason: string) => Promise<number>;
}

/**
 * Hộp thoại hủy buổi học hoặc toàn bộ buổi tương lai của lớp (UC30).
 *
 * Số buổi, số đăng ký và số thành viên bị ảnh hưởng được lấy từ server trước
 * khi xác nhận: quản lý phải thấy hậu quả trước khi bấm, vì thao tác này hủy
 * cả đăng ký của thành viên và không tự hoàn tiền gói tập.
 */
export function CancelScopeDialog({
  session,
  owningClass,
  onClose,
  onCanceled,
  onSubmit,
}: CancelScopeDialogProps) {
  const prefix = useId();
  const [scope, setScope] = useState<CancelScope>("SESSION");
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<CancelImpact | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [reasonError, setReasonError] = useState("");

  const loadImpact = useCallback(async () => {
    setIsLoadingImpact(true);
    try {
      const result = await classApi.previewCancel(
        scope,
        scope === "SESSION"
          ? { sessionId: session.id }
          : { classId: session.classId },
      );
      setImpact(result);
      setError("");
    } catch (caught) {
      setImpact(null);
      setError(describeError(caught));
    } finally {
      setIsLoadingImpact(false);
    }
  }, [scope, session.id, session.classId]);

  useEffect(() => {
    // Hoãn một nhịp như các trang khác trong repo: gọi setState đồng bộ ngay
    // trong effect làm React dựng lại ngay lần render đầu.
    const timer = window.setTimeout(() => {
      void loadImpact();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadImpact]);

  async function handleConfirm() {
    if (!impact || isLoadingImpact) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      setReasonError("Nhập lý do hủy từ 3 đến 500 ký tự.");
      return;
    }
    setReasonError("");
    setIsWorking(true);
    try {
      const canceledCount = await onSubmit(scope, trimmed);
      onCanceled(scope, canceledCount);
    } catch (caught) {
      setReasonError(fieldErrorsOf(caught).reason ?? "");
      setError(describeError(caught));
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Dialog
      title="Hủy buổi học"
      description="Chọn phạm vi hủy và ghi lý do. Lịch sử đăng ký được giữ lại, hệ thống không tự hoàn tiền gói tập."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={isWorking}
          >
            Giữ nguyên lịch
          </button>
          <button
            type="button"
            className="button danger"
            onClick={handleConfirm}
            disabled={isWorking || isLoadingImpact || !impact}
          >
            <CalendarX size={17} aria-hidden="true" />
            {isWorking ? "Đang hủy…" : "Xác nhận hủy"}
          </button>
        </>
      }
    >
      <p className="cancel-scope-target">
        <strong>{session.className}</strong> · {session.sportName}
        <br />
        {formatDate(session.date)} ·{" "}
        {formatTimeRange(session.startTime, session.endTime)} ·{" "}
        {session.roomName} · {session.coachName}
      </p>

      <fieldset className="cancel-scope-choice">
        <legend>Phạm vi hủy</legend>
        <label htmlFor={`${prefix}-scope-session`}>
          <input
            id={`${prefix}-scope-session`}
            type="radio"
            name={`${prefix}-scope`}
            value="SESSION"
            checked={scope === "SESSION"}
            onChange={() => { setImpact(null); setScope("SESSION"); }}
            disabled={isWorking}
          />
          <span>
            Chỉ buổi này
            <small>Các buổi khác của lớp giữ nguyên.</small>
          </span>
        </label>
        <label htmlFor={`${prefix}-scope-class`}>
          <input
            id={`${prefix}-scope-class`}
            type="radio"
            name={`${prefix}-scope`}
            value="CLASS_FUTURE_SESSIONS"
            checked={scope === "CLASS_FUTURE_SESSIONS"}
            onChange={() => { setImpact(null); setScope("CLASS_FUTURE_SESSIONS"); }}
            disabled={isWorking}
          />
          <span>
            Mọi buổi tương lai của lớp “{owningClass?.name ?? session.className}
            ”
            <small>
              Buổi đã diễn ra không bị thay đổi. Lớp sẽ không nhận đăng ký mới.
            </small>
          </span>
        </label>
      </fieldset>

      <div className="cancel-scope-impact" role="status" aria-live="polite">
        {isLoadingImpact ? (
          <span>Đang tính số đăng ký bị ảnh hưởng…</span>
        ) : impact ? (
          <>
            <span className="inline-icon">
              <CalendarX size={16} aria-hidden="true" />
              {impact.affectedSessionCount} buổi học
            </span>
            <span className="inline-icon">
              <Users size={16} aria-hidden="true" />
              {impact.affectedRegistrationCount} đăng ký của{" "}
              {impact.affectedMemberCount} thành viên
            </span>
            {impact.affectedRegistrationCount > 0 && (
              <p>
                <AlertTriangle size={16} aria-hidden="true" /> Những đăng ký này
                sẽ bị hủy cùng lúc và thành viên cần được thông báo.
              </p>
            )}
          </>
        ) : (
          <span>Chưa lấy được số liệu ảnh hưởng.</span>
        )}
      </div>

      <div className="field field-full">
        <label htmlFor={`${prefix}-reason`}>
          Lý do hủy <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${prefix}-reason`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ví dụ: Huấn luyện viên nghỉ bệnh, phòng bảo trì…"
          maxLength={500}
          disabled={isWorking}
          aria-invalid={Boolean(reasonError)}
          aria-describedby={`${prefix}-reason-help${
            reasonError ? ` ${prefix}-reason-error` : ""
          }`}
        />
        <small id={`${prefix}-reason-help`}>
          Lý do được lưu vào lịch sử thao tác và hiển thị cho thành viên bị ảnh
          hưởng.
        </small>
        {reasonError && (
          <small className="form-error" id={`${prefix}-reason-error`}>
            {reasonError}
          </small>
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
