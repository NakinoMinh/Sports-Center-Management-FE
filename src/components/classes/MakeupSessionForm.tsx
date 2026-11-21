import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { ApiError } from "../../services/apiClient";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { classApi } from "../../services/classApi";
import type { ClassSession } from "../../types/classes";
import {
  CENTER_TIME_SLOTS,
  centerToday,
  findTimeSlot,
  getCoachSlotAvailability,
  getRoomSlotAvailability,
} from "../../utils/classSchedule";
import {
  findMakeupMemberConflicts,
  makeupOverlapCandidates,
  makeupNotes,
  validateMakeupSchedule,
  type MakeupMemberConflict,
  type MakeupDraft,
  type MakeupReferences,
  type MakeupSessionRoster,
  type SessionSchedule,
} from "../../utils/makeupSchedule";
import * as v from "../../utils/validation";
import { formatDate } from "../../utils/format";

type MakeupSessionFormProps = {
  session: ClassSession;
  initialReason: string;
  onSaved: (session: ClassSession) => void;
  onClose: () => void;
  onWorkingChange: (isWorking: boolean) => void;
};

type MemberConflictDetails = {
  status: "LOADING" | "LOADED" | "UNAVAILABLE";
  members: MakeupMemberConflict[];
};

const ERROR_FIELDS: Readonly<Record<string, string>> = {
  COACH_SCHEDULE_CONFLICT: "coachId",
  COACH_INACTIVE: "coachId",
  COACH_NOT_FOUND: "coachId",
  COACH_DISCIPLINE_MISMATCH: "coachId",
  ROOM_SCHEDULE_CONFLICT: "roomId",
  ROOM_INACTIVE: "roomId",
  ROOM_NOT_FOUND: "roomId",
  MEMBER_SCHEDULE_CONFLICT: "date",
  MEMBERSHIP_NOT_VALID_FOR_SESSION: "date",
  PACKAGE_NOT_ELIGIBLE: "date",
  SESSION_IN_PAST: "date",
};

async function loadReferences(date: string, classId: string): Promise<MakeupReferences> {
  // Lịch tuần trên trang có thể đang lọc theo lớp/HLV/phòng, nên không đủ để kiểm tra trùng.
  const [sessions, coaches, rooms, classes] = await Promise.all([
    classApi.listSessions({ from: date, to: date, status: "SCHEDULED" }),
    classApi.listCoaches(),
    classApi.listRooms(),
    classApi.listClasses(),
  ]);
  return { sessions, coaches, rooms, trainingClass: classes.find((item) => item.id === classId) };
}

async function loadMemberConflictDetails(sourceSessionId: string, target: SessionSchedule): Promise<MakeupMemberConflict[]> {
  // Đọc lại sau khi server từ chối để thấy cả lịch vừa được người khác thêm vào.
  const [members, sessions] = await Promise.all([
    classApi.listSessionRegistrations(sourceSessionId),
    classApi.listSessions({ from: target.date, to: target.date, status: "SCHEDULED" }),
  ]);
  if (!members.some((member) => member.status === "BOOKED")) return [];
  const candidates = makeupOverlapCandidates(sessions, sourceSessionId, target);
  const rosters: MakeupSessionRoster[] = [];
  // Giới hạn số request cùng lúc khi nhiều lớp dùng chung ca học.
  for (let index = 0; index < candidates.length; index += 4) {
    rosters.push(...await Promise.all(candidates.slice(index, index + 4).map(async (candidate) => ({
      session: candidate,
      members: await classApi.listSessionRegistrations(candidate.id),
    }))));
  }
  return findMakeupMemberConflicts(sourceSessionId, target, members, rosters);
}

export function MakeupSessionForm({
  session, initialReason, onSaved, onClose, onWorkingChange,
}: MakeupSessionFormProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<MakeupDraft>({
    date: session.date,
    slotId: findTimeSlot(session.startTime, session.endTime)?.id ?? "",
    coachId: session.coachId,
    roomId: session.roomId,
    reason: initialReason,
  });
  const [references, setReferences] = useState<MakeupReferences | null>(null);
  const [loadedDate, setLoadedDate] = useState("");
  const [failedDate, setFailedDate] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [memberConflictDetails, setMemberConflictDetails] = useState<MemberConflictDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = useRef(false);
  const isReady = Boolean(draft.date) && references !== null && loadedDate === draft.date;
  const hasLoadError = Boolean(draft.date) && failedDate === draft.date;
  const slot = CENTER_TIME_SLOTS.find((item) => item.id === draft.slotId);
  const context = {
    date: draft.date, startTime: slot?.startTime ?? "", endTime: slot?.endTime ?? "",
    sessions: isReady ? references.sessions : [], excludeSessionId: session.id,
  };

  useEffect(() => {
    let isActive = true;
    const timer = window.setTimeout(async () => {
      if (!draft.date || v.reportDate(draft.date)) return;
      setFailedDate("");
      try {
        const result = await loadReferences(draft.date, session.classId);
        if (!isActive) return;
        setReferences(result);
        setLoadedDate(draft.date);
      } catch (caught) {
        if (!isActive) return;
        setReferences(null);
        setFailedDate(draft.date);
        toast.error(describeError(caught));
      }
    }, 0);
    return () => { isActive = false; window.clearTimeout(timer); };
  }, [draft.date, session.classId, reloadCount, toast]);

  function handleChange(field: keyof MakeupDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors({});
    if (field === "date" || field === "slotId") setMemberConflictDetails(null);
    if (field === "date") {
      setLoadedDate("");
      setFailedDate("");
      const dateError = v.all(v.required("Ngày học bù"), v.reportDate)(value);
      if (dateError) setErrors({ date: dateError });
    } else if (field === "slotId" && !value) {
      setErrors({ slotId: "Vui lòng chọn khung giờ học bù." });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current || !isReady || !slot) return;
    const validationErrors = validateMakeupSchedule(draft, session, references);
    setErrors(validationErrors);
    if (v.hasErrors(validationErrors)) return;
    isSubmitting.current = true;
    setIsSaving(true);
    setMemberConflictDetails(null);
    onWorkingChange(true);
    try {
      // Kiểm tra lại sát lúc lưu để bắt các lịch vừa được người khác thêm vào.
      const latest = await loadReferences(draft.date, session.classId);
      setReferences(latest);
      const latestErrors = validateMakeupSchedule(draft, session, latest);
      setErrors(latestErrors);
      if (v.hasErrors(latestErrors)) return;
      const saved = await classApi.saveSession({
        classId: session.classId,
        coachId: draft.coachId,
        roomId: draft.roomId,
        date: draft.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: session.capacity,
        notes: makeupNotes(session, draft.reason),
      }, session.id);
      onSaved(saved);
    } catch (caught) {
      const message = describeError(caught);
      const fields = fieldErrorsOf(caught);
      const field = caught instanceof ApiError ? ERROR_FIELDS[caught.code ?? ""] : undefined;
      setErrors({
        ...fields,
        ...(fields.startTime || fields.endTime ? { slotId: fields.startTime ?? fields.endTime } : {}),
        ...(fields.notes ? { reason: fields.notes } : {}),
        ...(fields.capacity ? { roomId: fields.capacity } : {}),
        ...(field ? { [field]: message } : {}),
      });
      toast.error(message);
      if (caught instanceof ApiError && caught.code === "MEMBER_SCHEDULE_CONFLICT") {
        setMemberConflictDetails({ status: "LOADING", members: [] });
        try {
          const members = await loadMemberConflictDetails(session.id, {
            date: draft.date, startTime: slot.startTime, endTime: slot.endTime,
          });
          setMemberConflictDetails({ status: members.length ? "LOADED" : "UNAVAILABLE", members });
        } catch {
          // Việc tải chi tiết không được che mất kết quả từ chối đổi lịch của server.
          setMemberConflictDetails({ status: "UNAVAILABLE", members: [] });
        }
      }
    } finally {
      isSubmitting.current = false;
      setIsSaving(false);
      onWorkingChange(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="info-note">
        <CalendarClock size={18} aria-hidden="true" />
        Lịch mới phải phù hợp với lịch HLV, phòng và điều kiện gói của hội viên.
        Hội viên và HLV sẽ nhận thông báo đổi lịch.
      </p>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="makeup-date">Ngày học bù *</label>
          <input id="makeup-date" type="date" value={draft.date} min={centerToday()}
            onChange={(event) => handleChange("date", event.target.value)} disabled={isSaving}
            aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "makeup-date-error" : undefined} />
          {errors.date && <small className="form-error" id="makeup-date-error">{errors.date}</small>}
        </div>
        <div className="field">
          <label htmlFor="makeup-slot">Khung giờ học bù *</label>
          <select id="makeup-slot" value={draft.slotId} disabled={isSaving}
            onChange={(event) => handleChange("slotId", event.target.value)}
            aria-invalid={Boolean(errors.slotId)} aria-describedby={errors.slotId ? "makeup-slot-error" : undefined}>
            <option value="">— Chọn khung giờ —</option>
            {CENTER_TIME_SLOTS.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.startTime} – {item.endTime}</option>)}
          </select>
          {errors.slotId && <small className="form-error" id="makeup-slot-error">{errors.slotId}</small>}
        </div>
        <div className="field field-full">
          <label htmlFor="makeup-coach">Huấn luyện viên *</label>
          <select id="makeup-coach" value={draft.coachId} disabled={isSaving || !isReady}
            onChange={(event) => handleChange("coachId", event.target.value)}
            aria-invalid={Boolean(errors.coachId)} aria-describedby={errors.coachId ? "makeup-coach-error" : undefined}>
            <option value="">— Chọn huấn luyện viên —</option>
            {references?.coaches.map((coach) => {
              const availability = getCoachSlotAvailability(coach, { ...context, sportName: session.sportName });
              return <option key={coach.id} value={coach.id} disabled={!availability.isAvailable}>
                {coach.fullName} — {availability.reason}
              </option>;
            })}
          </select>
          {errors.coachId && <small className="form-error" id="makeup-coach-error">{errors.coachId}</small>}
        </div>
        <div className="field field-full">
          <label htmlFor="makeup-room">Phòng tập *</label>
          <select id="makeup-room" value={draft.roomId} disabled={isSaving || !isReady}
            onChange={(event) => handleChange("roomId", event.target.value)}
            aria-invalid={Boolean(errors.roomId)} aria-describedby={errors.roomId ? "makeup-room-error" : undefined}>
            <option value="">— Chọn phòng tập —</option>
            {references?.rooms.map((room) => {
              const availability = getRoomSlotAvailability(room, context);
              const hasCapacity = room.capacity >= session.capacity;
              return <option key={room.id} value={room.id} disabled={!availability.isAvailable || !hasCapacity}>
                {room.name} · {room.capacity} chỗ — {hasCapacity ? availability.reason : "Không đủ sức chứa buổi học"}
              </option>;
            })}
          </select>
          {errors.roomId && <small className="form-error" id="makeup-room-error">{errors.roomId}</small>}
        </div>
        <div className="field field-full">
          <label htmlFor="makeup-reason">Lý do đổi lịch *</label>
          <textarea id="makeup-reason" rows={3} value={draft.reason} maxLength={500} disabled={isSaving}
            onChange={(event) => handleChange("reason", event.target.value)}
            aria-invalid={Boolean(errors.reason)} aria-describedby={`makeup-reason-help${errors.reason ? " makeup-reason-error" : ""}`} />
          <small id="makeup-reason-help">Lý do được thêm vào ghi chú buổi học, giữ lại ghi chú hiện có; tổng tối đa 500 ký tự.</small>
          {errors.reason && <small className="form-error" id="makeup-reason-error">{errors.reason}</small>}
        </div>
      </div>
      {memberConflictDetails && (
        <section className="session-registration is-card" aria-labelledby="makeup-conflicts-title" aria-live="polite">
          <strong id="makeup-conflicts-title">Hội viên và lớp bị trùng lịch</strong>
          {memberConflictDetails.status === "LOADING" ? (
            <p role="status">Đang tải danh sách hội viên và lớp bị trùng…</p>
          ) : memberConflictDetails.status === "UNAVAILABLE" ? (
            <p className="form-error" role="status">
              Lịch chưa được dời. Chưa xác định được đầy đủ danh sách bị trùng; hãy thử xác nhận lại hoặc chọn ngày, giờ khác.
            </p>
          ) : (
            <>
              <p className="form-error">Có {memberConflictDetails.members.length} hội viên bị trùng. Lịch chưa được dời; hãy chọn ngày hoặc khung giờ khác.</p>
              <ul className="session-registration">
                {memberConflictDetails.members.map((member) => (
                  <li key={member.memberId} className="session-registration is-card">
                    <strong>{member.memberName}{member.memberCode && member.memberCode !== "—" ? ` · ${member.memberCode}` : ""}</strong>
                    <ul className="session-registration">
                      {member.sessions.map((conflict) => (
                        <li key={conflict.id} className="session-registration">
                          <span>{conflict.className}</span>
                          <small>{formatDate(conflict.date)} · {conflict.startTime} – {conflict.endTime} · {conflict.roomName}</small>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {errors.session && <p className="form-error" role="alert">{errors.session}</p>}
      <p role="status" aria-live="polite">
        {isSaving ? "Đang kiểm tra lại điều kiện và lưu lịch bù…" : isReady
          ? `Đã kiểm tra lịch ngày ${formatDate(draft.date)}. Giữ nguyên sức chứa ${session.capacity} và ${session.bookedCount} đăng ký.`
          : hasLoadError ? "Chưa kiểm tra được lịch. Hãy thử tải lại trước khi xác nhận."
          : draft.date && !v.reportDate(draft.date) ? "Đang kiểm tra lịch của ngày học bù…" : "Vui lòng chọn ngày học bù hợp lệ."}
      </p>
      {hasLoadError && <button type="button" className="button secondary" onClick={() => setReloadCount((value) => value + 1)}>Thử tải lại lịch</button>}
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={isSaving}>Giữ nguyên lịch</button>
        <button type="submit" className="button primary" disabled={isSaving || !isReady || !slot}>
          {isSaving ? "Đang lưu…" : "Xác nhận lịch bù"}
        </button>
      </div>
    </form>
  );
}
