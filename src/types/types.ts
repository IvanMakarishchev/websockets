import { GamesData, NewUser, RoomData, RoomIndex, UserData } from "../interfaces/interfaces";

export type MessageData = NewUser| UserData | RoomData[] | GamesData | RoomIndex | { data: "" };