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
import * as v from "../../utils/validation";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { roomApi } from "../../services/roomApi";
import type { Room, RoomInput } from "../../types/room";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const emptyForm: RoomInput = {
  name: "",
  location: "",
  capacity: 1,
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
      setLoading(false); setHasLoaded(true);
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
    } else {
      setForm({
        name: room.name,
        location: room.location,
        roomType: room.roomType,
        capacity: room.capacity,
        isActive: room.isActive,
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = v.validateForm(form, {name: v.all(v.required("Tên phòng"), v.maxLength("Tên phòng",80)), location: v.text("Vị trí",120), capacity: v.positiveInteger("Sức chứa", {max:500})});
    setFieldErrors(errors);
    if (v.hasErrors(errors)) return;

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

                  <td className="cell-freetext">
                    {room.location || "Chưa cập nhật"}
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
                  <td colSpan={5}>Không tìm thấy phòng phù hợp.</td>
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
              {fieldErrors.name && <small id="room-name-error" className="form-error">{fieldErrors.name}</small>}
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
              {fieldErrors.location && <small id="room-location-error" className="form-error">{fieldErrors.location}</small>}
            </div>

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
              {fieldErrors.capacity && <small id="room-capacity-error" className="form-error">{fieldErrors.capacity}</small>}
            </div>

            <label className="field">Loại phòng<select value={form.roomType ?? ""} onChange={e => setForm({...form, roomType: e.target.value || null})}><option value="">Chưa phân loại</option><option value="STUDIO">Studio</option><option value="GYM">Phòng gym</option><option value="POOL">Hồ bơi</option><option value="COURT">Sân tập</option><option value="OTHER">Khác</option></select></label>
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
