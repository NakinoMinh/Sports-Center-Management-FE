import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { classRosterApi } from "../../services/classRosterApi";
import { describeError } from "../../services/apiErrors";
import type { ClassRegistration } from "../../types/classRoster";

const PAGE_SIZE = 20;

export function ClassRosterPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const parsedSessionId = Number(sessionId);

  const [registrations, setRegistrations] = useState<ClassRegistration[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [search, setSearch] = useState("");
  const requestId = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isValidSessionId =
    Number.isInteger(parsedSessionId) && parsedSessionId > 0;

  const loadRoster = useCallback(async () => {
    const id = ++requestId.current;
    if (!isValidSessionId) {
      setError("ID buổi học không hợp lệ.");
      setRegistrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await classRosterApi.getRegistrations(parsedSessionId, {
        page,
        pageSize: PAGE_SIZE,
        includeCanceled,
        search,
      });

      if (id !== requestId.current) return;
      setRegistrations(result.items);
      setTotalPages(Math.max(1, result.totalPages));
      setTotalItems(result.totalItems);
    } catch (err) {
      if (id !== requestId.current) return;
      setRegistrations([]);
      setTotalItems(0);
      setTotalPages(1);
      setError(describeError(err));
    } finally {
      if (id === requestId.current) {
        setHasLoaded(true);
        setLoading(false);
      }
    }
  }, [parsedSessionId, isValidSessionId, page, includeCanceled, search]);

  useEffect(() => {
    // Debounce filter edits and ignore responses from the previous filter.
    const timer = setTimeout(() => void loadRoster(), 150);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [loadRoster]);

  return (
    <section className="panel class-roster-page">
      {" "}
      <div className="page-header">
        <div>
          <h1>Danh sách học viên</h1>
          <p>Xem các học viên đăng ký vào buổi học #{sessionId}.</p>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={() => navigate("/coach/my-schedule")}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại lịch dạy
        </button>
      </div>
      <div className="toolbar">
        <label>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm tên hoặc mã học viên..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={includeCanceled}
            onChange={(event) => {
              setIncludeCanceled(event.target.checked);
              setPage(1);
            }}
          />
          Bao gồm đăng ký đã hủy
        </label>

        <button
          type="button"
          className="button secondary"
          onClick={() => void loadRoster()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>
        Tổng số: <strong>{totalItems}</strong> lượt đăng ký
      </p>
      {loading && !hasLoaded ? (
        <p>Đang tải danh sách học viên...</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã học viên</th>
                <th>Họ và tên</th>
                <th>Trạng thái đăng ký</th>
                <th>Kênh đăng ký</th>
              </tr>
            </thead>

            <tbody>
              {registrations.map((registration, index) => (
                <tr key={registration.id}>
                  <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td>{registration.memberCode}</td>
                  <td>{registration.memberName}</td>
                  <td>{registration.status}</td>
                  <td>{registration.registeredVia}</td>
                </tr>
              ))}

              {registrations.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    {search.trim()
                      ? "Không tìm thấy học viên phù hợp trong buổi học."
                      : "Không có học viên đăng ký."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => current - 1)}
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
          onClick={() => setPage((current) => current + 1)}
        >
          Trang sau
        </button>
      </div>
    </section>
  );
}
