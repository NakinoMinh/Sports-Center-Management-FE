import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Calendar,
  Clock,
  DoorOpen,
  Edit2,
  Eye,
  GraduationCap,
  Plus,
  Power,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import * as v from "../../utils/validation";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { roomApi } from "../../services/roomApi";
import { classApi } from "../../services/classApi";
import type { Room, RoomInput } from "../../types/room";
import type { TrainingClass, ClassSession } from "../../types/classes";
import { classStatusLabels, describeRecurrence } from "../../utils/classSchedule";
import { formatDate } from "../../utils/format";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const STANDARD_ROOM_TYPES = ["STUDIO", "GYM", "POOL", "COURT"];

const ROOM_TYPE_LABELS: Record<string, string> = {
  STUDIO: "Studio",
  GYM: "Phòng Gym",
  POOL: "Hồ bơi",
  COURT: "Sân thể thao",
  OTHER: "Khác",
};

const STATUS_CHIP: Record<string, string> = {
  DRAFT: "pending",
  OPEN: "active",
  CLOSED: "suspended",
  ARCHIVED: "hidden",
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  COMPLETED: "Đã hoàn thành",
  CANCELED: "Đã hủy",
};

const emptyForm: RoomInput = {
  name: "",
  location: "",
  capacity: 1,
  roomType: null,
  isActive: true,
};

export function RoomsPage() {
  const toast = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  // Form states
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [form, setForm] = useState<RoomInput>({ ...emptyForm });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customRoomType, setCustomRoomType] = useState<string>("");
  const [confirming, setConfirming] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  // Room details states
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [roomClasses, setRoomClasses] = useState<TrainingClass[]>([]);
  const [roomSessions, setRoomSessions] = useState<ClassSession[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailTab, setDetailTab] = useState<"classes" | "sessions">("classes");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAll();
      setRooms(data);
      setError("");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const filteredRooms = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLocaleLowerCase("vi").includes(keyword) ||
        room.location.toLocaleLowerCase("vi").includes(keyword);

      const matchesStatus =
        status === "ALL" ||
        (status === "ACTIVE" ? room.isActive : !room.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rooms, search, status]);

  const openForm = (room: Room | "new") => {
    setFieldErrors({});
    setEditing(room);
    setError("");

    if (room === "new") {
      setForm({ ...emptyForm });
      setSelectedCategory("");
      setCustomRoomType("");
    } else {
      setForm({
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        roomType: room.roomType ?? null,
        isActive: room.isActive,
      });

      if (!room.roomType) {
        setSelectedCategory("");
        setCustomRoomType("");
      } else if (STANDARD_ROOM_TYPES.includes(room.roomType)) {
        setSelectedCategory(room.roomType);
        setCustomRoomType("");
      } else {
        setSelectedCategory("OTHER");
        setCustomRoomType(room.roomType === "OTHER" ? "" : room.roomType);
      }
    }
  };

  const openRoomDetails = useCallback(async (room: Room) => {
    setViewingRoom(room);
    setLoadingDetails(true);
    setDetailsError("");
    setRoomClasses([]);
    setRoomSessions([]);
    setDetailTab("classes");

    try {
      const [sessions, allClasses] = await Promise.all([
        classApi.listSessions({ roomId: room.id }),
        classApi.listClasses(),
      ]);

      setRoomSessions(sessions);

      const sessionClassIds = new Set(sessions.map((s) => String(s.classId)));
      const matchedClasses = allClasses.filter((c) => {
        const usesInSchedule = c.scheduleBlocks?.some(
          (b) => String(b.roomId) === String(room.id)
        );
        const usesInSessions = sessionClassIds.has(String(c.id));
        return usesInSchedule || usesInSessions;
      });

      setRoomClasses(matchedClasses);
    } catch (err) {
      setDetailsError(describeError(err));
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = v.validateForm(form, {
      name: v.all(v.required("Tên phòng"), v.maxLength("Tên phòng", 80)),
      location: v.text("Vị trí", 120),
      capacity: v.positiveInteger("Sức chứa", { max: 500 }),
    });

    let finalRoomType: string | null = null;
    if (selectedCategory === "OTHER") {
      if (!customRoomType.trim()) {
        errors.roomType = "Vui lòng nhập loại phòng.";
      } else if (customRoomType.trim().length > 50) {
        errors.roomType = "Loại phòng tối đa 50 ký tự.";
      } else {
        finalRoomType = customRoomType.trim();
      }
    } else if (selectedCategory) {
      finalRoomType = selectedCategory;
    }

    setFieldErrors(errors);
    if (v.hasErrors(errors)) return;

    const payload: RoomInput = {
      ...form,
      roomType: finalRoomType,
    };

    setSaving(true);

    try {
      if (editing === "new") {
        await roomApi.create(payload);
        toast.success("Thêm phòng thành công.");
      } else if (editing) {
        await roomApi.update(editing.id, payload);
        toast.success("Cập nhật phòng thành công.");
      }

      setEditing(null);
      await refresh();
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (room: Room) => {
    try {
      await roomApi.setActive(room.id, !room.isActive);
      setConfirming(null);

      toast.success(
        room.isActive ? "Đã ngừng hoạt động phòng." : "Đã kích hoạt phòng.",
      );

      await refresh();
    } catch (err) {
      setConfirming(null);
      toast.error(describeError(err));
    }
  };

  return (
    <section className="panel rooms-page">
      <div className="page-header">
        <div>
          <h1>Quản lý phòng tập</h1>
          <p>Quản lý thông tin, sức chứa và trạng thái phòng tập.</p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() => openForm("new")}
        >
          <Plus size={17} aria-hidden="true" />
          Thêm phòng
        </button>
      </div>

      <div className="toolbar">
        <label>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm tên phòng hoặc vị trí..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          aria-label="Lọc trạng thái phòng"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>

        <button
          type="button"
          className="button secondary"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      <p>
        Tổng số: <strong>{filteredRooms.length}</strong> phòng
      </p>

      {loading && !hasLoaded ? (
        <p>Đang tải danh sách phòng...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên phòng</th>
                <th>Vị trí</th>
                <th>Loại phòng</th>
                <th>Sức chứa</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id}>
                  <td>
                    <button
                      type="button"
                      className="room-name-btn"
                      onClick={() => void openRoomDetails(room)}
                      title={`Xem chi tiết phòng ${room.name}`}
                    >
                      <DoorOpen size={18} aria-hidden="true" />
                      <span>{room.name}</span>
                    </button>
                  </td>

                  <td className="cell-freetext">
                    {room.location || "Chưa cập nhật"}
                  </td>
                  <td>
                    {room.roomType
                      ? (ROOM_TYPE_LABELS[room.roomType] ?? room.roomType)
                      : "Chưa phân loại"}
                  </td>
                  <td>{room.capacity} người</td>

                  <td>
                    <span
                      className={`room-status ${
                        room.isActive ? "active" : "inactive"
                      }`}
                    >
                      <span className="room-status-dot" />
                      {room.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </td>

                  <td>
                    <div className="room-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => void openRoomDetails(room)}
                        title="Xem chi tiết phòng và lớp học sử dụng phòng"
                      >
                        <Eye size={15} aria-hidden="true" />
                        Chi tiết
                      </button>

                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => openForm(room)}
                      >
                        <Edit2 size={15} aria-hidden="true" />
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setConfirming(room)}
                      >
                        <Power size={15} aria-hidden="true" />
                        {room.isActive ? "Ngừng" : "Kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={6}>Không tìm thấy phòng phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog tạo / chỉnh sửa phòng */}
      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm phòng mới" : "Chỉnh sửa phòng"}
          description="Nhập thông tin phòng tập."
          onClose={() => {
            if (!saving) setEditing(null);
          }}
        >
          <form noValidate onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-group">
              <label htmlFor="room-name">Tên phòng *</label>
              <input
                id="room-name"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "room-name-error" : undefined}
                required
                maxLength={80}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              {fieldErrors.name && (
                <small id="room-name-error" className="form-error">
                  {fieldErrors.name}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="room-location">Vị trí</label>
              <input
                id="room-location"
                aria-invalid={Boolean(fieldErrors.location)}
                aria-describedby={fieldErrors.location ? "room-location-error" : undefined}
                maxLength={120}
                value={form.location}
                onChange={(event) =>
                  setForm({ ...form, location: event.target.value })
                }
              />
              {fieldErrors.location && (
                <small id="room-location-error" className="form-error">
                  {fieldErrors.location}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="room-type">Loại phòng</label>
              <select
                id="room-type"
                value={selectedCategory}
                onChange={(event) => {
                  const val = event.target.value;
                  setSelectedCategory(val);
                  if (val === "OTHER") {
                    setForm({ ...form, roomType: customRoomType.trim() || null });
                  } else {
                    setCustomRoomType("");
                    setForm({ ...form, roomType: val || null });
                  }
                  if (fieldErrors.roomType) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.roomType;
                      return next;
                    });
                  }
                }}
              >
                <option value="">Chưa phân loại</option>
                <option value="STUDIO">Studio</option>
                <option value="GYM">Phòng Gym</option>
                <option value="POOL">Hồ bơi</option>
                <option value="COURT">Sân thể thao</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            {selectedCategory === "OTHER" && (
              <div className="form-group">
                <label htmlFor="custom-room-type">Nhập loại phòng *</label>
                <input
                  id="custom-room-type"
                  placeholder="Nhập loại phòng cụ thể (ví dụ: Boxing, Yoga, Phòng nhảy...)"
                  maxLength={50}
                  value={customRoomType}
                  aria-invalid={Boolean(fieldErrors.roomType)}
                  aria-describedby={
                    fieldErrors.roomType ? "custom-room-type-error" : undefined
                  }
                  onChange={(event) => {
                    const val = event.target.value;
                    setCustomRoomType(val);
                    setForm({ ...form, roomType: val.trim() || null });
                    if (fieldErrors.roomType) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.roomType;
                        return next;
                      });
                    }
                  }}
                />
                {fieldErrors.roomType && (
                  <small id="custom-room-type-error" className="form-error">
                    {fieldErrors.roomType}
                  </small>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="room-capacity">Sức chứa *</label>
              <input
                id="room-capacity"
                aria-invalid={Boolean(fieldErrors.capacity)}
                aria-describedby={fieldErrors.capacity ? "room-capacity-error" : undefined}
                type="number"
                required
                min={1}
                step={1}
                value={form.capacity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    capacity: Number(event.target.value),
                  })
                }
              />
              {fieldErrors.capacity && (
                <small id="room-capacity-error" className="form-error">
                  {fieldErrors.capacity}
                </small>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="button primary"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu phòng"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Dialog xem chi tiết phòng và các lớp đang sử dụng */}
      {viewingRoom && (
        <Dialog
          title={`Chi tiết phòng: ${viewingRoom.name}`}
          description="Thông tin phòng tập và danh sách các lớp đang sử dụng phòng này."
          onClose={() => setViewingRoom(null)}
        >
          <div className="room-detail-container">
            <div className="room-info-grid">
              <div className="room-info-card">
                <span className="room-info-label">Vị trí</span>
                <span className="room-info-value">
                  {viewingRoom.location || "Chưa cập nhật"}
                </span>
              </div>
              <div className="room-info-card">
                <span className="room-info-label">Loại phòng</span>
                <span className="room-info-value">
                  {viewingRoom.roomType
                    ? (ROOM_TYPE_LABELS[viewingRoom.roomType] ?? viewingRoom.roomType)
                    : "Chưa phân loại"}
                </span>
              </div>
              <div className="room-info-card">
                <span className="room-info-label">Sức chứa</span>
                <span className="room-info-value">{viewingRoom.capacity} người</span>
              </div>
              <div className="room-info-card">
                <span className="room-info-label">Trạng thái</span>
                <span
                  className={`room-status ${
                    viewingRoom.isActive ? "active" : "inactive"
                  }`}
                >
                  <span className="room-status-dot" />
                  {viewingRoom.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                </span>
              </div>
            </div>

            <div className="room-tabs">
              <button
                type="button"
                className={`room-tab-btn ${
                  detailTab === "classes" ? "active" : ""
                }`}
                onClick={() => setDetailTab("classes")}
              >
                <GraduationCap size={16} aria-hidden="true" />
                <span>Lớp học đang dùng phòng</span>
                {!loadingDetails && (
                  <span className="room-tab-count">{roomClasses.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`room-tab-btn ${
                  detailTab === "sessions" ? "active" : ""
                }`}
                onClick={() => setDetailTab("sessions")}
              >
                <Calendar size={16} aria-hidden="true" />
                <span>Lịch các buổi học</span>
                {!loadingDetails && (
                  <span className="room-tab-count">{roomSessions.length}</span>
                )}
              </button>
            </div>

            {loadingDetails ? (
              <div className="room-loading-state">
                <RefreshCw size={24} className="spin" aria-hidden="true" />
                <p>Đang tải dữ liệu lớp học và buổi học...</p>
              </div>
            ) : detailsError ? (
              <div className="feedback error" role="alert">
                <p>{detailsError}</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void openRoomDetails(viewingRoom)}
                >
                  Thử lại
                </button>
              </div>
            ) : detailTab === "classes" ? (
              roomClasses.length === 0 ? (
                <div className="room-empty-state">
                  <GraduationCap size={40} aria-hidden="true" />
                  <p>Chưa có lớp học nào sử dụng phòng tập này</p>
                  <small>
                    Phòng hiện đang trống và sẵn sàng để xếp lịch cho lớp học mới.
                  </small>
                </div>
              ) : (
                <div className="room-classes-list">
                  {roomClasses.map((cls) => {
                    const roomBlocks = (cls.scheduleBlocks || []).filter(
                      (b) => String(b.roomId) === String(viewingRoom.id)
                    );
                    const clsSessions = roomSessions.filter(
                      (s) => String(s.classId) === String(cls.id)
                    );
                    const upcomingSessions = clsSessions.filter(
                      (s) => s.status === "SCHEDULED"
                    );

                    return (
                      <div key={cls.id} className="room-class-card">
                        <div className="room-class-header">
                          <div className="room-class-title">
                            <GraduationCap size={20} aria-hidden="true" />
                            <div>
                              <h4>{cls.name}</h4>
                              <span className="class-sport-tag">
                                {cls.sportName}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`status-chip ${
                              STATUS_CHIP[cls.status] || "pending"
                            }`}
                          >
                            {classStatusLabels[cls.status] ?? cls.status}
                          </span>
                        </div>

                        <div className="room-class-meta">
                          <div className="room-class-meta-item">
                            <Users size={14} aria-hidden="true" />
                            <span>
                              Sức chứa lớp: <strong>{cls.capacity} người</strong>
                            </span>
                          </div>

                          <div className="room-class-meta-item">
                            <Calendar size={14} aria-hidden="true" />
                            <span>
                              Buổi học tại phòng:{" "}
                              <strong>{clsSessions.length}</strong> buổi
                              {upcomingSessions.length > 0 && (
                                <span
                                  style={{ color: "#167451", marginLeft: 4 }}
                                >
                                  ({upcomingSessions.length} sắp tới)
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="room-class-meta-item">
                            <span>
                              Đăng ký hiện tại:{" "}
                              <strong>
                                {cls.activeRegistrationCount} học viên
                              </strong>
                            </span>
                          </div>
                        </div>

                        {roomBlocks.length > 0 ? (
                          <div className="room-class-schedules">
                            <span className="schedules-title">
                              Lịch học tại phòng:
                            </span>
                            <ul>
                              {roomBlocks.map((block, idx) => (
                                <li key={idx}>
                                  <Clock size={13} aria-hidden="true" />
                                  <span>
                                    <strong>
                                      {describeRecurrence(
                                        block.daysOfWeek,
                                        block.startTime,
                                        block.endTime
                                      )}
                                    </strong>
                                    {block.coachName && (
                                      <span className="coach-highlight">
                                        {" "}
                                        · HLV: {block.coachName}
                                      </span>
                                    )}
                                    {block.startDate && block.endDate && (
                                      <span
                                        style={{
                                          color: "#718078",
                                          marginLeft: 6,
                                        }}
                                      >
                                        ({formatDate(block.startDate)} -{" "}
                                        {formatDate(block.endDate)})
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : clsSessions.length > 0 ? (
                          <div className="room-class-schedules">
                            <span className="schedules-title">
                              Buổi học được xếp tại phòng:
                            </span>
                            <p
                              style={{
                                margin: 0,
                                color: "#51645b",
                                fontSize: 13,
                              }}
                            >
                              Lớp có {clsSessions.length} buổi học diễn ra tại
                              phòng này.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )
            ) : roomSessions.length === 0 ? (
              <div className="room-empty-state">
                <Calendar size={40} aria-hidden="true" />
                <p>Chưa có buổi học nào được xếp tại phòng này</p>
                <small>
                  Các buổi học của các lớp sẽ hiển thị ở đây khi được xếp lịch.
                </small>
              </div>
            ) : (
              <div className="room-sessions-wrap">
                <table className="room-sessions-table">
                  <thead>
                    <tr>
                      <th>Ngày học</th>
                      <th>Khung giờ</th>
                      <th>Lớp học</th>
                      <th>Huấn luyện viên</th>
                      <th>Chỗ đặt</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomSessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <strong>{formatDate(session.date)}</strong>
                        </td>
                        <td>
                          {session.startTime?.slice(0, 5)} -{" "}
                          {session.endTime?.slice(0, 5)}
                        </td>
                        <td>
                          <strong>{session.className}</strong>
                          <span
                            className="class-sport-tag"
                            style={{ marginLeft: 6 }}
                          >
                            {session.sportName}
                          </span>
                        </td>
                        <td>{session.coachName || "Chưa phân công"}</td>
                        <td>
                          {session.bookedCount} / {session.capacity}
                        </td>
                        <td>
                          <span
                            className={`status-chip ${
                              session.status === "SCHEDULED"
                                ? "active"
                                : session.status === "COMPLETED"
                                  ? "pending"
                                  : "hidden"
                            }`}
                          >
                            {SESSION_STATUS_LABELS[session.status] ??
                              session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  const target = viewingRoom;
                  setViewingRoom(null);
                  openForm(target);
                }}
              >
                <Edit2 size={15} aria-hidden="true" />
                Chỉnh sửa phòng
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => setViewingRoom(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {confirming && (
        <ConfirmDialog
          title={
            confirming.isActive ? "Ngừng hoạt động phòng?" : "Kích hoạt phòng?"
          }
          description={`Bạn có chắc muốn thay đổi trạng thái phòng "${confirming.name}"?`}
          confirmLabel={confirming.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
          destructive={confirming.isActive}
          onCancel={() => setConfirming(null)}
          onConfirm={() => handleToggle(confirming)}
        />
      )}
    </section>
  );
}
