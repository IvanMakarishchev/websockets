import { GamesData, NewUser, RoomData, RoomIndex, Ships, UserData } from "../interfaces/interfaces";

export type MessageData = NewUser| UserData | RoomData[] | GamesData | RoomIndex | Ships | { data: "" };
export type ShipTypes = "small" | "medium" | "large" | "huge";