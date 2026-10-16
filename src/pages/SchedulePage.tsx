import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { classApi } from "../services/classApi";
import { describeError } from "../services/apiErrors";
import { useAuth } from "../hooks/useAuth";
import { SessionRegistrationPanel } from "../components/classes/SessionRegistrationPanel";
import { Dialog } from "../components/common/Dialog";
import { centerToday, addCalendarDays, formatTimeRange, sessionStatusLabels } from "../utils/classSchedule";
import { formatDate } from "../utils/format";
import type { ClassSession, ClassRegistration, SessionRosterMember, TrainingClass } from "../types/classes";

type Props = { mode: "center" | "browse" | "mine" | "coach" };
const TITLES = { center: "Lịch trung tâm", browse: "Khám phá lớp học", mine: "Lịch học của tôi", coach: "Lịch dạy của tôi" };
export function SchedulePage({ mode }: Props) {
  const { currentUser } = useAuth();
  const [date, setDate] = useState(centerToday());
  const [days, setDays] = useState(7);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [classes, setClasses] = useState<TrainingClass[]>([]);
  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("");
  const [coach, setCoach] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<SessionRosterMember[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    const request = ++requestId.current;
    setIsLoading(true);
    try {
      const filter = {from: date, to: addCalendarDays(date, days - 1)};
      const classList = mode === "browse" ? await classApi.listClasses() : [];
      const mine = mode === "browse" || mode === "mine" ? await classApi.listMyRegistrations(true, mode === "mine" ? filter : {}) : [];
      const data = mode === "mine" ? mine.filter(r => r.session.date >= filter.from && r.session.date <= filter.to).map(r => r.session)
        : mode === "coach" ? await classApi.listTeachingSessions(filter) : await classApi.listSessions(filter);
      if (request !== requestId.current) return;
      setClasses(classList); setRegistrations(mine); setSessions([...new Map(data.map(s => [s.id, s])).values()]); setError("");
    } catch (caught) { if (request === requestId.current) setError(describeError(caught)); }
    finally { if (request === requestId.current) setIsLoading(false); setHasLoaded(true); }
  }, [currentUser, mode, date, days]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 150); return () => { window.clearTimeout(timer); requestId.current++; }; }, [refresh]);
  useEffect(() => {
    if (!selected || mode !== "coach") return;
    let isCurrent = true;
    const timer = window.setTimeout(() => {
    setIsRosterLoading(true); setRosterError(""); setRoster([]);
    void classApi.listSessionRegistrations(selected.id).then(items => {if (isCurrent) setRoster(items);}).catch(caught => {if (isCurrent) setRosterError(describeError(caught));}).finally(() => {if(isCurrent) setIsRosterLoading(false);});
    }, 0);
    return () => { isCurrent = false; window.clearTimeout(timer); };
  }, [selected, mode]);
  const visible = useMemo(() => sessions.filter(s => (!sport || s.sportId === sport) && (!coach || s.coachId === coach) && (!room || s.roomId === room) && (!status || s.status === status) && (s.className + " " + s.sportName).toLocaleLowerCase().includes(search.toLocaleLowerCase())), [sessions, sport, coach, room, status, search]);
  const activeFor = (id: string) => registrations.find(r => r.sessionId === id && r.status === "BOOKED");
  // Roster sau khi lọc, tính một lần để danh sách và trạng thái rỗng dùng chung
  // một kết quả: trước đây thông báo "Chưa có học viên" đọc `roster` chưa lọc,
  // nên tìm một tên không khớp cho ra danh sách trống mà không giải thích gì.
  const visibleRoster = useMemo(() => {
    const keyword = rosterSearch.trim().toLocaleLowerCase();
    return roster.filter(r =>
      (includeCanceled || r.status === "BOOKED") &&
      `${r.memberName} ${r.memberCode}`.toLocaleLowerCase().includes(keyword));
  }, [roster, rosterSearch, includeCanceled]);
  const selectedSession = selected && (sessions.find(s => s.id === selected.id) ?? selected);
  return <>
    <div className="page-heading"><div><h1>{TITLES[mode]}</h1><p>Thời gian tại trung tâm · số chỗ được cập nhật từ hệ thống.</p></div><button className="button secondary" disabled={isLoading} onClick={() => void refresh()}>Làm mới</button></div>
    <section className="panel"><div className="toolbar">
      <label className="field">Từ ngày<input type="date" value={date} onChange={e => setDate(e.target.value || centerToday())}/></label>
      <label className="field">Khoảng xem<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={1}>Một ngày</option><option value={7}>Bảy ngày</option></select></label>
      <label className="field">Tìm lớp<input value={search} onChange={e => setSearch(e.target.value)}/></label>
      <label className="field">Bộ môn<select value={sport} onChange={e => setSport(e.target.value)}><option value="">Tất cả</option>{[...new Map(sessions.map(s => [s.sportId,s.sportName])).entries()].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="field">HLV<select value={coach} onChange={e => setCoach(e.target.value)}><option value="">Tất cả</option>{[...new Map(sessions.map(s => [s.coachId,s.coachName])).entries()].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="field">Phòng<select value={room} onChange={e => setRoom(e.target.value)}><option value="">Tất cả</option>{[...new Map(sessions.map(s => [s.roomId,s.roomName])).entries()].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="field">Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(sessionStatusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    {error && <p role="alert">{error}</p>}
    {isLoading && !hasLoaded ? <p role="status">Đang tải lịch…</p> : <div className="reception-class-grid">{visible.map(s => <article className="reception-class-card" key={s.id}><h2>{s.className}</h2><p>{s.sportName} · {s.coachName} · {s.roomName}</p><p>{formatDate(s.date)} · {formatTimeRange(s.startTime,s.endTime)}</p><p>{sessionStatusLabels[s.status]} · Còn {s.remainingCapacity}/{s.capacity} chỗ</p>{s.cancelReason && <p>Lý do hủy: {s.cancelReason}</p>}{mode === "mine" && <p>{activeFor(s.id) ? "Đang giữ chỗ" : "Đăng ký đã hủy"}</p>}<button className="button secondary" onClick={() => {setSelected(s);setRosterSearch("");}}>Chi tiết{mode === "coach" ? " / học viên" : ""}</button>{(mode === "browse" || mode === "mine") && <SessionRegistrationPanel session={s} registration={activeFor(s.id)} onChanged={refresh}/>}</article>)}</div>}
    {hasLoaded && !isLoading && !error && !visible.length && <p className="empty-state">Không có buổi học phù hợp trong khoảng đã chọn.</p>}
    </section>
    {selectedSession && <Dialog title={selectedSession.className} onClose={() => setSelected(null)}><p>{selectedSession.sportName} · {selectedSession.coachName} · {selectedSession.roomName}</p><p>{formatDate(selectedSession.date)} · {formatTimeRange(selectedSession.startTime,selectedSession.endTime)}</p><p>{classes.find(item => item.id === selectedSession.classId)?.description}</p><p>{selectedSession.notes || "Chưa có ghi chú."}</p>{(mode === "browse" || mode === "mine") && <SessionRegistrationPanel session={selectedSession} registration={activeFor(selectedSession.id)} onChanged={refresh}/>}{mode === "coach" && <><label className="field">Tìm học viên<input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)}/></label><label><input type="checkbox" checked={includeCanceled} onChange={e => setIncludeCanceled(e.target.checked)}/> Gồm đăng ký đã hủy</label>{isRosterLoading ? <p>Đang tải học viên…</p> : rosterError ? <p role="alert">{rosterError}</p> : <ul>{visibleRoster.map(r => <li key={r.id}>{r.memberName} · {r.memberCode} · {r.status === "BOOKED" ? "Đang giữ chỗ" : "Đã hủy"}</li>)}</ul>}{!isRosterLoading && !rosterError && !visibleRoster.length && <p>{roster.length ? "Không có học viên khớp với tìm kiếm." : "Chưa có học viên."}</p>}</>}</Dialog>}
  </>;
}
