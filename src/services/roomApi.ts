import { apiRequest } from "./apiClient";
import type { Room, RoomInput } from "../types/room";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface RoomDto {
  id: number;
  name: string;
  location: string | null;
  capacity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

// Chuyển dữ liệu BE sang kiểu Room mà giao diện đang sử dụng
const toRoom = (dto: RoomDto): Room => ({
  id: String(dto.id),
  name: dto.name,
  location: dto.location ?? "",
  capacity: dto.capacity,
  isActive: dto.isActive,
});

const validateRoom = (input: RoomInput): void => {
  if (!input.name.trim()) {
    throw new Error("Tên phòng không được để trống.");
  }

  if (
    !Number.isInteger(input.capacity) ||
    input.capacity < 1 ||
    input.capacity > 500
  ) {
    throw new Error("Sức chứa phải từ 1 đến 500 người.");
  }

  if (input.name.trim().length > 80) {
    throw new Error("Tên phòng tối đa 80 ký tự.");
  }

  if (input.location.trim().length > 120) {
    throw new Error("Vị trí tối đa 120 ký tự.");
  }
};

const toPayload = (input: RoomInput) => ({
  name: input.name.trim(),
  location: input.location.trim() || null,
  capacity: input.capacity,
});

export const roomApi = {
  // GET /api/Room
  async getAll(): Promise<Room[]> {
    const rooms: Room[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiRequest<ApiResponse<PagedResult<RoomDto>>>(
        `/Room?page=${page}&pageSize=100`,
      );

      rooms.push(...response.data.items.map(toRoom));
      totalPages = response.data.totalPages;
      page++;
    } while (page <= totalPages);

    return rooms;
  },

  // POST /api/Room
  async create(input: RoomInput): Promise<Room> {
    validateRoom(input);

    const response = await apiRequest<ApiResponse<RoomDto>>("/Room", {
      method: "POST",
      body: JSON.stringify(toPayload(input)),
    });

    return toRoom(response.data);
  },

  // PUT /api/Room/{id}
  async update(id: string, input: RoomInput): Promise<Room> {
    validateRoom(input);

    const response = await apiRequest<ApiResponse<RoomDto>>(`/Room/${id}`, {
      method: "PUT",
      body: JSON.stringify(toPayload(input)),
    });

    return toRoom(response.data);
  },

  // PATCH /api/Room/{id}/status
  async setActive(id: string, isActive: boolean): Promise<Room> {
    const response = await apiRequest<ApiResponse<RoomDto>>(
      `/Room/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      },
    );

    return toRoom(response.data);
  },
};
