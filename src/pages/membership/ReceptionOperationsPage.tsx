import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardCheck,
  LifeBuoy,
  RefreshCw,
  Search,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { useAuth } from "../../hooks/useAuth";
import { membershipService, todayDate } from "../../services/membershipService";
import {
  receptionService,
  type ReceptionState,
  type SupportStatus,
} from "../../services/receptionService";
import { isApiConfigured } from "../../services/apiClient";
import { NoDatabaseNotice } from "../../components/common/NoDatabaseNotice";
import type { MembershipActor } from "../../types/membership";
import { formatDate } from "../../utils/format";

type Mode = "attendance" | "classes" | "support";
const titles = {
  attendance: "Điểm danh tại trung tâm",
  classes: "Đăng ký & hủy lớp học",
  support: "Yêu cầu hỗ trợ",
};
const descriptions = {
  attendance:
    "Kiểm tra quyền sử dụng, ghi nhận giờ đến và giờ ra về của thành viên.",
  classes: "Tra cứu lịch học, số chỗ còn lại và hỗ trợ thành viên đặt lớp.",
  support: "Tiếp nhận yêu cầu tại quầy và theo dõi quá trình xử lý.",
};
const supportLabels: Record<SupportStatus, string> = {
  OPEN: "Mới tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
};
const empty: ReceptionState = {
  version: 1,
  sessions: [],
  bookings: [],
  visits: [],
  requests: [],
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
const time = (value: string) =>
  new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function ReceptionOperationsPage({ mode }: { mode: Mode }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState(empty);
  const [members, setMembers] = useState<MembershipActor[]>([]);
  const [memberId, setMemberId] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayDate());
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<{
    kind: "book" | "cancel" | "request" | "update";
    id: string;
  } | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Gói tập");
  const [supportStatus, setSupportStatus] =
    useState<SupportStatus>("IN_PROGRESS");
  const refresh = useCallback(() => {
    if (!currentUser) return;
    try {
      setState(receptionService.getSnapshot(currentUser));
      setNow(Date.now());
      setMembers(membershipService.listMembers(currentUser));
      setError("");
    } catch (err) {
      setState(empty);
      setMembers([]);
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    // Synchronize the external browser storage adapter.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);
  function run(action: () => void, message: string, inDialog = false) {
    setNotice("");
    setActionError("");
    try {
      action();
      refresh();
      setNotice(message);
      setDialog(null);
      setDialogError("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu thao tác.";
      if (inDialog) setDialogError(message);
      else setActionError(message);
    }
  }
  function open(kind: NonNullable<typeof dialog>["kind"], id = "") {
    setDialog({ kind, id });
    setDialogError("");
    setNote("");
    setSubject("");
    const request = state.requests.find((item) => item.id === id);
    setSupportStatus(request?.status ?? "IN_PROGRESS");
  }
  const memberName = (id: string) =>
    members.find((item) => item.id === id)?.fullName || id;
  const selected = members.find((item) => item.id === memberId);
  const matches = (member: MembershipActor) =>
    normalize(
      `${member.fullName} ${member.email} ${member.phone ?? ""} ${member.id}`,
    ).includes(normalize(search.trim()));
  const filteredMembers = members.filter(matches);
  const visits = state.visits.filter(
    (visit) =>
      (!date || visit.date === date) &&
      (!memberId || visit.memberId === memberId) &&
      (!search.trim() ||
        filteredMembers.some((member) => member.id === visit.memberId)),
  );
  const sessions = state.sessions.filter(
    (session) => !date || session.date === date,
  );
  const bookings = state.bookings.filter(
    (booking) =>
      (!memberId || booking.memberId === memberId) &&
      (!search.trim() ||
        filteredMembers.some((member) => member.id === booking.memberId)),
  );
  const requests = state.requests.filter(
    (request) =>
      (!memberId || request.memberId === memberId) &&
      (!search.trim() ||
        filteredMembers.some((member) => member.id === request.memberId)) &&
      (filter === "ALL" || request.status === filter),
  );
  const activeRequest = state.requests.find((item) => item.id === dialog?.id);
  const activeSession = state.sessions.find((item) => item.id === dialog?.id);
  const icon =
    mode === "attendance" ? (
      <ClipboardCheck size={26} />
    ) : mode === "classes" ? (
      <CalendarDays size={26} />
    ) : (
      <LifeBuoy size={26} />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DỊCH VỤ TẠI QUẦY</span>
          <h1>{titles[mode]}</h1>
          <p>{descriptions[mode]}</p>
        </div>
        <span className="page-icon">{icon}</span>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
          <button className="button secondary" onClick={refresh}>
            Tải lại
          </button>
        </div>
      )}
      {notice && (
        <div className="success-notice" role="status">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="error-notice" role="alert">
          {actionError}
          <button
            className="button secondary"
            onClick={() => setActionError("")}
          >
            Đóng
          </button>
        </div>
      )}
      {isApiConfigured() ? (
        <NoDatabaseNotice
          featureName={titles[mode]}
          description={`Nghiệp vụ "${titles[mode]}" chưa được xây dựng bảng lưu trữ và API xử lý trong cơ sở dữ liệu Backend.`}
        />
      ) : (
        <>
          <section className="panel reception-member-panel">
            <div className="panel-heading">
              <div>
                <h2>Thành viên cần hỗ trợ</h2>
            <p>
              Tìm theo tên không dấu, email, số điện thoại hoặc mã thành viên.
            </p>
          </div>
          <button className="button secondary" onClick={refresh}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm thành viên"
              placeholder="Tên, email, số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setMemberId("");
                setNotice("");
              }}
            />
          </label>
          <label className="field">
            <span>Chọn thành viên</span>
            <select
              value={memberId}
              onChange={(e) => {
                setMemberId(e.target.value);
                setNotice("");
              }}
            >
              <option value="">— Tất cả / Chọn thành viên —</option>
              {filteredMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} · {member.email}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!filteredMembers.length && !loading && (
          <p className="membership-status-help">
            Không tìm thấy thành viên phù hợp.
          </p>
        )}
        {selected && (
          <div className="reception-member-summary">
            <div>
              <strong>{selected.fullName}</strong>
              <p>
                {selected.email} · {selected.phone || "Chưa có số điện thoại"}
              </p>
            </div>
            <Link
              className="button secondary"
              to={`/receptionist/memberships?member=${encodeURIComponent(memberId)}`}
            >
              Đăng ký / Gia hạn gói
            </Link>
          </div>
        )}
      </section>
      {loading ? (
        <div className="panel empty-state" role="status">
          Đang tải dữ liệu...
        </div>
      ) : (
        <>
          {mode === "attendance" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Sổ điểm danh</h2>
                  <p>
                    Mỗi thành viên được ghi nhận một lượt mỗi ngày. Chỉ gói còn
                    hiệu lực mới được vào tập.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={!memberId || !!error}
                  onClick={() =>
                    currentUser &&
                    run(() => {
                      receptionService.checkIn(currentUser, memberId);
                      setDate(todayDate());
                    }, `Đã điểm danh ${selected?.fullName}.`)
                  }
                >
                  Điểm danh hôm nay
                </button>
              </div>
              <div className="toolbar">
                <label className="field">
                  <span>Ngày điểm danh</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <span className="count-badge">{visits.length} lượt</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Ngày</th>
                      <th>Giờ đến</th>
                      <th>Giờ về</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <strong>{memberName(visit.memberId)}</strong>
                        </td>
                        <td>{formatDate(visit.date)}</td>
                        <td>{time(visit.checkedInAt)}</td>
                        <td>
                          {visit.checkedOutAt
                            ? `${formatDate(visit.checkedOutAt)} · ${time(visit.checkedOutAt)}`
                            : "Chưa ghi nhận ra về"}
                        </td>
                        <td>
                          {!visit.checkedOutAt && (
                            <button
                              className="text-button"
                              disabled={!!error}
                              onClick={() =>
                                currentUser &&
                                run(
                                  () =>
                                    receptionService.checkOut(
                                      currentUser,
                                      visit.id,
                                    ),
                                  "Đã ghi nhận giờ ra về.",
                                )
                              }
                            >
                              Ghi nhận ra về
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visits.length && (
                <div className="empty-state">
                  <ClipboardCheck size={30} />
                  <h3>Chưa có lượt điểm danh phù hợp</h3>
                  <p>
                    Chọn thành viên để điểm danh hoặc đổi ngày để xem lịch sử.
                  </p>
                </div>
              )}
            </section>
          )}
          {mode === "classes" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Lịch lớp học</h2>
                    <p>Gói tập phải có hiệu lực vào ngày diễn ra buổi học.</p>
                  </div>
                  <label className="field">
                    <span>Ngày học</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="reception-class-grid">
                  {sessions.map((session) => {
                    const count = state.bookings.filter(
                      (booking) =>
                        booking.sessionId === session.id &&
                        booking.status === "BOOKED",
                    ).length;
                    const booked = state.bookings.some(
                      (booking) =>
                        booking.sessionId === session.id &&
                        booking.memberId === memberId &&
                        booking.status === "BOOKED",
                    );
                    const started =
                      new Date(
                        `${session.date}T${session.startTime}:00`,
                      ).getTime() <= now;
                    return (
                      <article
                        className="reception-class-card"
                        key={session.id}
                      >
                        <span className="eyebrow">
                          {session.discipline} · {session.room}
                        </span>
                        <h3>{session.name}</h3>
                        <p>
                          {formatDate(session.date)} · {session.startTime}–
                          {session.endTime}
                        </p>
                        <p>HLV: {session.coach}</p>
                        <span
                          className={`status-chip ${count >= session.capacity ? "expired" : "active"}`}
                        >
                          Còn {Math.max(0, session.capacity - count)} /{" "}
                          {session.capacity} chỗ
                        </span>
                        <button
                          className="button primary"
                          disabled={
                            !memberId ||
                            booked ||
                            started ||
                            count >= session.capacity ||
                            !!error
                          }
                          onClick={() => open("book", session.id)}
                        >
                          {started
                            ? "Đã bắt đầu"
                            : booked
                              ? "Đã đăng ký"
                              : count >= session.capacity
                                ? "Đã đủ chỗ"
                                : "Đăng ký cho thành viên"}
                        </button>
                      </article>
                    );
                  })}
                </div>
                {!sessions.length && (
                  <div className="empty-state">
                    <h3>Chưa có buổi học trong ngày này</h3>
                    <p>Chọn ngày khác để tra cứu lịch học.</p>
                  </div>
                )}
              </section>
              <section className="panel reception-history">
                <div className="panel-heading">
                  <h2>
                    Lịch sử đăng ký lớp{" "}
                    {selected ? `· ${selected.fullName}` : ""}
                  </h2>
                  <span className="count-badge">{bookings.length} đăng ký</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thành viên</th>
                        <th>Buổi học</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => {
                        const session = state.sessions.find(
                          (item) => item.id === booking.sessionId,
                        );
                        return (
                          <tr key={booking.id}>
                            <td>{memberName(booking.memberId)}</td>
                            <td>
                              <strong>
                                {session?.name ??
                                  "Buổi học không còn trong lịch"}
                              </strong>
                              <small>
                                {session &&
                                  `${formatDate(session.date)} · ${session.startTime}–${session.endTime}`}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`status-chip ${booking.status === "BOOKED" ? "active" : "canceled"}`}
                              >
                                {booking.status === "BOOKED"
                                  ? "Đã đăng ký"
                                  : "Đã hủy"}
                              </span>
                              {booking.cancelReason && (
                                <small>Lý do: {booking.cancelReason}</small>
                              )}
                            </td>
                            <td>
                              {booking.status === "BOOKED" &&
                                session &&
                                new Date(
                                  `${session.date}T${session.startTime}:00`,
                                ).getTime() > now && (
                                  <button
                                    className="text-button"
                                    disabled={!!error}
                                    onClick={() => open("cancel", booking.id)}
                                  >
                                    Hủy đăng ký
                                  </button>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!bookings.length && (
                  <div className="empty-state">Chưa có đăng ký lớp học.</div>
                )}
              </section>
            </>
          )}
          {mode === "support" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Theo dõi yêu cầu</h2>
                  <p>Lưu nội dung tiếp nhận và ghi chú cho từng lần xử lý.</p>
                </div>
                <button
                  className="button primary"
                  disabled={!memberId || !!error}
                  onClick={() => open("request")}
                >
                  Tiếp nhận yêu cầu
                </button>
              </div>
              <div className="toolbar">
                <label className="field">
                  <span>Trạng thái xử lý</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    {Object.entries(supportLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="count-badge">{requests.length} yêu cầu</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thành viên</th>
                      <th>Yêu cầu</th>
                      <th>Ngày tiếp nhận</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td>{memberName(request.memberId)}</td>
                        <td>
                          <strong>{request.subject}</strong>
                          <small>{request.category}</small>
                        </td>
                        <td>{formatDate(request.createdAt)}</td>
                        <td>
                          <span
                            className={`status-chip ${request.status === "RESOLVED" ? "active" : "pending_payment"}`}
                          >
                            {supportLabels[request.status]}
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => open("update", request.id)}
                          >
                            Chi tiết / Xử lý
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!requests.length && (
                <div className="empty-state">
                  <LifeBuoy size={30} />
                  <h3>Chưa có yêu cầu phù hợp</h3>
                  <p>Chọn thành viên để tiếp nhận yêu cầu mới.</p>
                </div>
              )}
            </section>
          )}
        </>
      )}
      {dialog && (
        <Dialog
          title={
            dialog.kind === "book"
              ? "Xác nhận đăng ký lớp"
              : dialog.kind === "cancel"
                ? "Hủy đăng ký lớp"
                : dialog.kind === "request"
                  ? "Tiếp nhận yêu cầu mới"
                  : "Chi tiết yêu cầu hỗ trợ"
          }
          onClose={() => setDialog(null)}
        >
          <form
            className="reception-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!currentUser) return;
              run(
                () => {
                  if (dialog.kind === "book")
                    receptionService.bookClass(
                      currentUser,
                      memberId,
                      dialog.id,
                    );
                  if (dialog.kind === "cancel")
                    receptionService.cancelBooking(
                      currentUser,
                      dialog.id,
                      note,
                    );
                  if (dialog.kind === "request")
                    receptionService.createRequest(currentUser, {
                      memberId,
                      category,
                      subject,
                      description: note,
                    });
                  if (dialog.kind === "update")
                    receptionService.updateRequest(
                      currentUser,
                      dialog.id,
                      supportStatus,
                      note,
                    );
                },
                dialog.kind === "book"
                  ? "Đã đăng ký lớp cho thành viên."
                  : dialog.kind === "cancel"
                    ? "Đã hủy đăng ký và trả lại chỗ cho lớp."
                    : "Đã lưu yêu cầu hỗ trợ.",
                true,
              );
            }}
          >
            {dialog.kind === "book" && (
              <div className="order-summary">
                <h3>{activeSession?.name}</h3>
                <p>Thành viên: {selected?.fullName}</p>
                <p>
                  {activeSession &&
                    `${formatDate(activeSession.date)} · ${activeSession.startTime}–${activeSession.endTime}`}
                </p>
                <p>
                  {activeSession?.room} · HLV: {activeSession?.coach}
                </p>
              </div>
            )}
            {dialog.kind === "cancel" && (
              <p>
                Hủy lớp cho{" "}
                <strong>
                  {memberName(
                    state.bookings.find((item) => item.id === dialog.id)
                      ?.memberId ?? "",
                  )}
                </strong>
                . Lịch sử đăng ký và lý do hủy sẽ được giữ lại.
              </p>
            )}
            {dialog.kind === "request" && (
              <>
                <p>
                  Thành viên: <strong>{selected?.fullName}</strong>
                </p>
                <label className="field">
                  <span>Nhóm yêu cầu</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {[
                      "Gói tập",
                      "Lớp học",
                      "Thanh toán",
                      "Cơ sở vật chất",
                      "Khác",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tiêu đề</span>
                  <input
                    required
                    minLength={3}
                    maxLength={120}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
              </>
            )}
            {dialog.kind === "update" && activeRequest && (
              <>
                <div className="order-summary">
                  <h3>{activeRequest.subject}</h3>
                  <p>
                    {memberName(activeRequest.memberId)} ·{" "}
                    {activeRequest.category} ·{" "}
                    {formatDate(activeRequest.createdAt)}
                  </p>
                  <p className="reception-preserve-text">
                    {activeRequest.description}
                  </p>
                </div>
                <h3>Lịch sử xử lý</h3>
                {activeRequest.updates.length ? (
                  activeRequest.updates.map((update, index) => (
                    <div className="info-note" key={index}>
                      <p>
                        <strong>{supportLabels[update.status]}</strong> ·{" "}
                        {formatDate(update.at)} {time(update.at)}
                        <br />
                        {update.note}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>Yêu cầu mới tiếp nhận, chưa có ghi chú xử lý.</p>
                )}
                <label className="field">
                  <span>Trạng thái mới</span>
                  <select
                    value={supportStatus}
                    onChange={(e) =>
                      setSupportStatus(e.target.value as SupportStatus)
                    }
                  >
                    {Object.entries(supportLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {dialog.kind !== "book" && (
              <label className="field">
                <span>
                  {dialog.kind === "cancel"
                    ? "Lý do hủy"
                    : dialog.kind === "request"
                      ? "Nội dung yêu cầu"
                      : "Ghi chú xử lý"}
                </span>
                <textarea
                  required
                  minLength={dialog.kind === "request" ? 10 : 3}
                  maxLength={dialog.kind === "cancel" ? 500 : 2000}
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
            {dialogError && (
              <p className="form-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="counter-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDialog(null)}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className={`button ${dialog.kind === "cancel" ? "danger" : "primary"}`}
              >
                {dialog.kind === "book"
                  ? "Xác nhận đăng ký"
                  : dialog.kind === "cancel"
                    ? "Xác nhận hủy"
                    : "Lưu yêu cầu"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      </>
      )}
    </>
  );
}
