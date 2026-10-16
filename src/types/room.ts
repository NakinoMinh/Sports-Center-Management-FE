export interface Room {
  id: string;
  name: string;
  location: string;
  roomType?: string | null;
  capacity: number;
  isActive: boolean;
}

export interface RoomInput {
  name: string;
  location: string;
  roomType?: string | null;
  capacity: number;
  isActive: boolean;
}
