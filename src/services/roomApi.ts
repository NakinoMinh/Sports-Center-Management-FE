import type { Room, RoomInput } from "../types/room";

let rooms: Room[] = [
  {
    id: "1",
    name: "Studio A",
    location: "Tầng 1",
    capacity: 25,
    isActive: true,
  },
  {
    id: "2",
    name: "Studio B",
    location: "Tầng 2",
    capacity: 20,
    isActive: true,
  },
  {
    id: "3",
    name: "Hồ bơi trong nhà",
    location: "Khu B",
    capacity: 30,
    isActive: true,
  },
  {
    id: "4",
    name: "Sân ngoài trời",
    location: "Khu C",
    capacity: 40,
    isActive: false,
  },
];

let nextId = 5;

const validateRoom = (input: RoomInput, excludeId?: string): void => {
  if (!input.name.trim()) {
    throw new Error("Tên phòng không được để trống.");
  }

  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    throw new Error("Sức chứa phải là số nguyên lớn hơn 0.");
  }

  const duplicate = rooms.some(
    (room) =>
      room.id !== excludeId &&
      room.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
  );

  if (duplicate) {
    throw new Error("Tên phòng đã tồn tại.");
  }
};

export const roomApi = {
  async getAll(): Promise<Room[]> {
    return rooms.map((room) => ({ ...room }));
  },

  async create(input: RoomInput): Promise<Room> {
    validateRoom(input);

    const room: Room = {
      ...input,
      id: String(nextId++),
      name: input.name.trim(),
      location: input.location.trim(),
    };

    rooms = [...rooms, room];
    return { ...room };
  },

  async update(id: string, input: RoomInput): Promise<Room> {
    const existing = rooms.find((room) => room.id === id);

    if (!existing) {
      throw new Error("Không tìm thấy phòng.");
    }

    validateRoom(input, id);

    const updated: Room = {
      ...existing,
      ...input,
      name: input.name.trim(),
      location: input.location.trim(),
    };

    rooms = rooms.map((room) => (room.id === id ? updated : room));
    return { ...updated };
  },

  async setActive(id: string, isActive: boolean): Promise<Room> {
    const existing = rooms.find((room) => room.id === id);

    if (!existing) {
      throw new Error("Không tìm thấy phòng.");
    }

    const updated = { ...existing, isActive };
    rooms = rooms.map((room) => (room.id === id ? updated : room));

    return { ...updated };
  },
};
