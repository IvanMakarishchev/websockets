import { UserStates } from "enums/enums"
import { WebSocket } from "ws"

export interface WsMessage {
  type: string
  data: string
  id: number
}
export interface UserData {
  name: string
  password: string
}
export interface UserByConnection {
  name: string
  ws: WebSocket
}
export interface NewUser {
  name: string
  index: number
  error: boolean
  errorText: string
}
export interface RoomData {
  roomId: number;
  roomUsers: { name: string, index: number }[];
}
export interface GamesData {
  idGame: number;
  idPlayer: number;
}
export interface RoomIndex {
  indexRoom: number
}
export interface UserConnections  {
  ws: WebSocket,
  id: number,
  state: UserStates
}