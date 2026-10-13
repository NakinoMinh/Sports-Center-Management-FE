import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { DoorOpen, Edit2, Plus, Power, RefreshCw, Search } from "lucide-react";
import { Dialog } from "../../components/common/Dialog";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { describeError } from "../../services/apiErrors";
import { roomApi } from "../../services/roomApi";
import type { Room, RoomInput } from "../../types/room";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
const ROOM_TYPE_LABELS: Record<string, string> = {
  STUDIO: "Studio",
  GYM: "Phòng Gym",
  POOL: "Hồ bơi",
  COURT: "Sân thể thao",
  OTHER: "Khác",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [form, setForm] = useState<RoomInput>({ ...emptyForm });
  const [confirming, setConfirming] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

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
    }
  }, []);

  useEffect(() => {
    void refresh();
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
    setEditing(room);
    setError("");

    if (room === "new") {
      setForm({ ...emptyForm });
    } else {
      setForm({
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        roomType: room.roomType ?? null,
        isActive: room.isActive,
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên phòng.");
      return;
    }

    if (!Number.isInteger(form.capacity) || form.capacity <= 0) {
      toast.error("Sức chứa phải là số nguyên lớn hơn 0.");
      return;
    }

    setSaving(true);

    try {
      if (editing === "new") {
        await roomApi.create(form);
        toast.success("Thêm phòng thành công.");
      } else if (editing) {
        await roomApi.update(editing.id, form);
        toast.success("Cập nhật phòng thành công.");
      }

      setEditing(null);
      await refresh();
    } catch (err) {
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

      {loading ? (
        <p>Đang tải danh sách phòng...</p>
      ) : (
        <div className="table-scroll">
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
                    <div className="room-name-cell">
                      <DoorOpen size={18} aria-hidden="true" />
                      <span>{room.name}</span>
                    </div>
                  </td>

                  <td>{room.location || "Chưa cập nhật"}</td>
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
                  <td colSpan={6}>Không tìm thấy phòng phù hợp.</td>{" "}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm phòng mới" : "Chỉnh sửa phòng"}
          description="Nhập thông tin phòng tập."
          onClose={() => {
            if (!saving) setEditing(null);
          }}
        >
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-group">
              <label htmlFor="room-name">Tên phòng *</label>
              <input
                id="room-name"
                required
                maxLength={80}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="room-location">Vị trí</label>
              <input
                id="room-location"
                maxLength={120}
                value={form.location}
                onChange={(event) =>
                  setForm({ ...form, location: event.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="room-type">Loại phòng</label>

              <select
                id="room-type"
                value={form.roomType ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    roomType: event.target.value
                      ? (event.target.value as NonNullable<
                          RoomInput["roomType"]
                        >)
                      : null,
                  })
                }
              >
                <option value="">Chưa phân loại</option>
                <option value="STUDIO">Studio</option>
                <option value="GYM">Phòng Gym</option>
                <option value="POOL">Hồ bơi</option>
                <option value="COURT">Sân thể thao</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="room-capacity">Sức chứa *</label>
              <input
                id="room-capacity"
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
