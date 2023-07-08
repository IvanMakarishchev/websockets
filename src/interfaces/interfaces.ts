import { UserStates } from "enums/enums";
import { ShipTypes } from "types/types";
import { WebSocket } from "ws";

export interface WsMessage {
  type: string;
  data: string;
  id: number;
}
export interface UserData {
  name: string;
  password: string;
}
export interface UserByConnection {
  name: string;
  ws: WebSocket;
}
export interface NewUser {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
}
export interface RoomData {
  roomId: number;
  roomUsers: { name: string; index: number }[];
}
export interface GamesData {
  idGame: number;
  idPlayer: number;
}
export interface RoomIndex {
  indexRoom: number;
}
export interface UserConnections {
  ws: WebSocket;
  id: number;
  state: UserStates;
}
export interface Ships {
  ships: [
    {
      position: {
        x: number;
        y: number;
      };
      direction: boolean;
      length: number;
      type: ShipTypes;
    }
  ];
  gameId?: number;
  indexPlayer?: number;
  currentPlayerIndex?: number;
}
