export type RoomType = "STUDIO" | "GYM" | "POOL" | "COURT" | "OTHER";

export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  roomType?: RoomType | null;
  isActive: boolean;
}

export interface RoomInput {
  name: string;
  location: string;
  capacity: number;
  roomType?: RoomType | null;
  isActive: boolean;
}
