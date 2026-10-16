import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { myTeachingScheduleApi } from "../../services/myTeachingScheduleApi";
import { describeError } from "../../services/apiErrors";
import type {
  TeachingSession,
  TeachingSchedulePage,
  TeachingSessionStatus,
} from "../../types/myTeachingSchedule";

const PAGE_SIZE = 20;
function getVietnamDate(daysFromToday = 0): string {
  const now = new Date();

  const vietnamDate = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );

  vietnamDate.setDate(vietnamDate.getDate() + daysFromToday);

  const year = vietnamDate.getFullYear();
  const month = String(vietnamDate.getMonth() + 1).padStart(2, "0");
  const day = String(vietnamDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  if (!value) return "Chưa cập nhật";

  const parts = value.slice(0, 10).split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value: string): string {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "SCHEDULED":
      return "Đã lên lịch";
    case "CANCELED":
    case "CANCELLED":
      return "Đã hủy";
    case "COMPLETED":
      return "Đã hoàn thành";
    default:
      return status;
  }
}

export function MyTeachingSchedulePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [fromDate, setFromDate] = useState(() => getVietnamDate(0));
  const [toDate, setToDate] = useState(() => getVietnamDate(7));
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    if (fromDate && toDate && fromDate > toDate) {
      setSessions([]);
      setTotalItems(0);
      setTotalPages(1);
      setError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
      setLoading(false);
      return;
    }
    try {
      const result: TeachingSchedulePage =
        await myTeachingScheduleApi.getMySchedule({
          from: fromDate || undefined,
          to: toDate || undefined,
          status: statusFilter
            ? (statusFilter as TeachingSessionStatus)
            : undefined,
          page,
          pageSize: PAGE_SIZE,
        });

      setSessions(result.items);
      setTotalPages(Math.max(1, result.totalPages));
      setTotalItems(result.totalItems);
    } catch (err) {
      setSessions([]);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, statusFilter]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  return (
    <section className="panel my-teaching-schedule-page">
      <div className="page-header">
        <div>
          <h1>Lịch dạy của tôi</h1>
          <p>
            Xem lịch các buổi học được phân công, bao gồm cả buổi học đã hủy.
          </p>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={() => void loadSchedule()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </div>

      {/* Bộ lọc lịch dạy */}
      <div className="toolbar">
        <label>
          Từ ngày
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <label>
          Đến ngày
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setToDate(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <select
          aria-label="Lọc trạng thái buổi học"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="SCHEDULED">Đã lên lịch</option>
          <option value="COMPLETED">Đã hoàn thành</option>
          <option value="CANCELED">Đã hủy</option>
        </select>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setFromDate(getVietnamDate(0));
            setToDate(getVietnamDate(7));
            setStatusFilter("");
            setPage(1);
          }}
        >
          Đặt lại bộ lọc
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      {!error && (
        <p>
          Tổng số: <strong>{totalItems}</strong> buổi học
        </p>
      )}

      {loading ? (
        <p>Đang tải lịch dạy...</p>
      ) : error ? (
        <p>Chưa thể hiển thị lịch dạy. Vui lòng thử lại sau.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thời gian</th>
                <th>Lớp học</th>
                <th>Bộ môn</th>
                <th>Phòng</th>
                <th>Học viên</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{formatDate(session.date)}</td>

                  <td>
                    {formatTime(session.startTime)}
                    {" - "}
                    {formatTime(session.endTime)}
                  </td>

                  <td>{session.className}</td>
                  <td>{session.sportName}</td>
                  <td>{session.roomName}</td>

                  <td>
                    {session.bookedCount}/{session.capacity}
                  </td>

                  <td>
                    <div>{getStatusLabel(session.status)}</div>

                    {(session.status === "CANCELED" ||
                      session.status === "CANCELLED") &&
                      session.cancelReason && (
                        <small>Lý do: {session.cancelReason}</small>
                      )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        navigate(
                          `/coach/my-schedule/${session.id}/registrations`,
                        )
                      }
                    >
                      Xem học viên
                    </button>
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8}>Không có buổi dạy nào phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!error && (
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((previous) => previous - 1)}
          >
            Trang trước
          </button>

          <span>
            Trang {page}/{totalPages}
          </span>

          <button
            type="button"
            className="button secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((previous) => previous + 1)}
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}
