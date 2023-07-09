import {
  Attack,
  AttackResult,
  CurrentTurn,
  GamesData,
  NewUser,
  RandomAttack,
  RoomData,
  RoomIndex,
  Ships,
  UserData,
  Winner,
  Winners,
} from "../interfaces/interfaces";

export type MessageData =
  | NewUser
  | UserData
  | RoomData[]
  | GamesData
  | RoomIndex
  | Ships
  | Attack
  | AttackResult
  | RandomAttack
  | CurrentTurn
  | Winner
  | Winners
  | Winners[]
  | { data: "" };
export type ShipTypes = "small" | "medium" | "large" | "huge";
export type AttackStatus = "miss" | "killed" | "shot";
