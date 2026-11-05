import { useCallback, useEffect, useState } from "react";
import * as v from "../../utils/validation";
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
import { isApiConfigured } from "../../services/apiClient";
import { describeError } from "../../services/apiErrors";
import { todayDate } from "../../services/membershipService";
import { memberApi } from "../../services/memberApi";
import {
  receptionService,
  type ReceptionState,
  type SupportStatus,
} from "../../services/receptionService";
import {
  trainingOperationsApi,
  type MemberEligibilityInfo,
} from "../../services/trainingOperationsApi";
import { CounterClassBooking } from "../../components/classes/CounterClassBooking";
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
const empty: ReceptionState = { version: 1, visits: [], requests: [] };
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
  const [eligibilityMap, setEligibilityMap] = useState<
    Record<string, MemberEligibilityInfo>
  >({});
  const [members, setMembers] = useState<MembershipActor[]>([]);
  const [memberId, setMemberId] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayDate());
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<{
    kind: "request" | "update";
    id: string;
  } | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<v.FieldErrors>({});
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Gói tập");
  const [supportStatus, setSupportStatus] =
    useState<SupportStatus>("IN_PROGRESS");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const realMembers = await memberApi.listAllMembers();
      setMembers(realMembers);
      if (isApiConfigured()) {
        const snap = await trainingOperationsApi.getReceptionSnapshot();
        setEligibilityMap(snap.memberEligibility ?? {});
        setState({
          version: 1,
          visits: snap.visits.map((vItem) => ({
            id: vItem.id,
            memberId: vItem.memberId,
            date: vItem.date,
            checkedInAt: vItem.checkedInAt,
            checkedOutAt: vItem.checkedOutAt ?? undefined,
            createdBy: vItem.checkedInBy,
          })),
          requests: snap.requests.map((rItem) => ({
            id: rItem.id,
            memberId: rItem.memberId,
            category: rItem.category,
            subject: rItem.subject,
            description: rItem.note,
            status: (rItem.status === "CLOSED" ? "RESOLVED" : rItem.status) as SupportStatus,
            createdAt: rItem.createdAt,
            createdBy: rItem.createdBy,
            updates: rItem.resolutionNote
              ? [
                  {
                    at: rItem.updatedAt,
                    by: rItem.updatedBy ?? rItem.createdBy,
                    status: (rItem.status === "CLOSED" ? "RESOLVED" : rItem.status) as SupportStatus,
                    note: rItem.resolutionNote,
                  },
                ]
              : [],
          })),
        });
      } else {
        setState(receptionService.getSnapshot(currentUser));
      }
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
    void refresh();
    const sync = () => void refresh();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const timer = window.setInterval(sync, 60000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function runAsync(
    action: () => Promise<void> | void,
    message: string,
    inDialog = false,
  ) {
    setNotice("");
    setActionError("");
    try {
      await action();
      await refresh();
      setNotice(message);
      setDialog(null);
      setDialogError("");
    } catch (err) {
      const msg = describeError(err);
      if (inDialog) setDialogError(msg);
      else setActionError(msg);
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
  const requests = state.requests.filter(
    (request) =>
      (!memberId || request.memberId === memberId) &&
      (!search.trim() ||
        filteredMembers.some((member) => member.id === request.memberId)) &&
      (filter === "ALL" || request.status === filter),
  );
  const activeRequest = state.requests.find((item) => item.id === dialog?.id);
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
          <button className="button secondary" onClick={() => void refresh()}>
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
      <section className="panel reception-member-panel">
        <div className="panel-heading">
          <div>
            <h2>Thành viên cần hỗ trợ</h2>
            <p>
              Tìm theo tên không dấu, email, số điện thoại hoặc mã thành viên.
            </p>
          </div>
          <button className="button secondary" onClick={() => void refresh()}>
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
              {isApiConfigured() && (
                <p style={{ marginTop: "0.35rem" }}>
                  <span
                    className={`status-chip ${
                      eligibilityMap[memberId]?.canCheckIn
                        ? "active"
                        : eligibilityMap[memberId]?.checkedInToday
                          ? "pending_payment"
                          : "canceled"
                    }`}
                  >
                    {eligibilityMap[memberId]?.statusText ??
                      "Chưa đăng ký gói tập nào — Cần mua gói tập trước khi vào tập"}
                  </span>
                </p>
              )}
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
                    Thành viên được điểm danh vào tập khi gói còn hiệu lực (đã
                    thanh toán, không bị bảo lưu) và đã ghi nhận ra về cho lượt tập trước đó.
                  </p>
                </div>
                <button
                  className="button primary"
                  disabled={
                    !memberId ||
                    !!error ||
                    (isApiConfigured() &&
                      !eligibilityMap[memberId]?.canCheckIn)
                  }
                  onClick={() =>
                    currentUser &&
                    void runAsync(async () => {
                      if (isApiConfigured()) {
                        await trainingOperationsApi.checkInMember({ memberId });
                      } else {
                        receptionService.checkIn(currentUser, memberId);
                      }
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
                                void runAsync(async () => {
                                  if (isApiConfigured()) {
                                    await trainingOperationsApi.checkOutMember(
                                      visit.id,
                                    );
                                  } else {
                                    receptionService.checkOut(
                                      currentUser,
                                      visit.id,
                                    );
                                  }
                                }, "Đã ghi nhận giờ ra về.")
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
            <CounterClassBooking
              member={
                selected
                  ? {
                      id: selected.id,
                      memberCode: selected.username,
                      fullName: selected.fullName,
                      email: selected.email,
                      phone: selected.phone ?? "",
                      isActive: selected.isActive !== false,
                    }
                  : null
              }
            />
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
          {dialog && (
            <Dialog
              title={
                dialog.kind === "request"
                  ? "Tiếp nhận yêu cầu mới"
                  : "Chi tiết yêu cầu hỗ trợ"
              }
              onClose={() => setDialog(null)}
            >
              <form
                className="reception-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!currentUser) return;
                  const formErrors = v.validateForm(
                    { subject, note },
                    {
                      ...(dialog.kind === "request"
                        ? {
                            subject: v.all(
                              v.required("Tiêu đề"),
                              v.minLength("Tiêu đề", 3),
                              v.maxLength("Tiêu đề", 120),
                            ),
                          }
                        : {}),
                      note: v.all(
                        v.required(
                          dialog.kind === "request"
                            ? "Nội dung yêu cầu"
                            : "Ghi chú xử lý",
                        ),
                        v.minLength(
                          dialog.kind === "request"
                            ? "Nội dung yêu cầu"
                            : "Ghi chú xử lý",
                          dialog.kind === "request" ? 10 : 4,
                        ),
                      ),
                    },
                  );
                  if (v.hasErrors(formErrors)) {
                    setFieldErrors(formErrors);
                    return;
                  }
                  setFieldErrors({});
                  void runAsync(
                    async () => {
                      if (dialog.kind === "request") {
                        if (isApiConfigured()) {
                          await trainingOperationsApi.createSupportRequest({
                            memberId,
                            category,
                            subject,
                            note,
                          });
                        } else {
                          receptionService.createRequest(currentUser, {
                            memberId,
                            category,
                            subject,
                            description: note,
                          });
                        }
                      }
                      if (dialog.kind === "update") {
                        if (isApiConfigured()) {
                          await trainingOperationsApi.updateSupportRequest(
                            dialog.id,
                            {
                              status: supportStatus,
                              resolutionNote: note,
                            },
                          );
                        } else {
                          receptionService.updateRequest(
                            currentUser,
                            dialog.id,
                            supportStatus,
                            note,
                          );
                        }
                      }
                    },
                    "Đã lưu yêu cầu hỗ trợ.",
                    true,
                  );
                }}
              >
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
                        maxLength={120}
                        value={subject}
                        aria-invalid={Boolean(fieldErrors.subject)}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                      {fieldErrors.subject && (
                        <small className="field-error">
                          {fieldErrors.subject}
                        </small>
                      )}
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
                <label className="field">
                  <span>
                    {dialog.kind === "request"
                      ? "Nội dung yêu cầu"
                      : "Ghi chú xử lý"}
                  </span>
                  <textarea
                    maxLength={2000}
                    rows={4}
                    value={note}
                    aria-invalid={Boolean(fieldErrors.note)}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {fieldErrors.note && (
                    <small className="field-error">{fieldErrors.note}</small>
                  )}
                </label>
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
                  <button type="submit" className="button primary">
                    Lưu yêu cầu
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
