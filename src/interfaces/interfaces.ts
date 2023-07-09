import { UserStates } from "enums/enums";
import { AttackStatus, ShipTypes } from "types/types";
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
  ships: RawShips[] | RawPosition[][][];
  gameId?: number;
  indexPlayer?: number;
  currentPlayerIndex?: number;
}
export interface RawPosition {
  x: number;
  y: number;
}
export interface RawShips {
  position: RawPosition | Array<RawPosition>;
  direction: boolean;
  length: number;
  type: ShipTypes;
}
export interface Attack {
  gameID: number;
  x: number;
  y: number;
  indexPlayer: number;
}
export interface AttackResult {
  position: {
    x: number;
    y: number;
  };
  currentPlayer: number;
  status: AttackStatus;
}
export interface UsersHits {
  indexPlayer: number;
  hits: RawPosition[] | Set<number[]>;
}
export interface RandomAttack {
  gameID: number;
  indexPlayer: number;
}
export interface UsersTurn {
  gameID: number;
  turn: number[];
}
export interface CurrentTurn {
  currentPlayer: number;
}