import { Attack, AttackResult, GamesData, NewUser, RoomData, RoomIndex, Ships, UserData } from "../interfaces/interfaces";

export type MessageData = NewUser| UserData | RoomData[] | GamesData | RoomIndex | Ships | Attack | AttackResult | { data: "" };
export type ShipTypes = "small" | "medium" | "large" | "huge";
export type AttackStatus = "miss" | "killed" | "shot";