export interface Room {
  id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
}

export interface RoomInput {
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
}
