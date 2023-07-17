import { MessageData } from "../type/types";
import { UserConnections, WsMessage } from "../interfaces/interfaces";
import { login } from "./login";
import { createRoom } from "./create-room";
import { addUserToRoom } from "./add-user-to-room";
import { addShips } from "./add-ships";
import { attack } from "./attack";
import { randomAttack } from "./random-attack";
import { singlePlay } from "./single-play";
import { winner } from "./winner";

export const doAction = {
  reg: (type: string, index: number, data: MessageData) =>
    login(type, index, data),
  create_room: (type: string, index: number) => createRoom(type, index),
  add_user_to_room: (
    type: string,
    index: number,
    data: MessageData
  ): (WsMessage | UserConnections[])[][] => addUserToRoom(type, index, data),
  add_ships: (type: string, index: number, data: MessageData) =>
    addShips(type, index, data),
  attack: (type: string, index: number, data: MessageData) =>
    attack(type, index, data),
  randomAttack: (type: string, index: number, data: MessageData) =>
    randomAttack(type, index, data),
  single_play: (type: string, index: number) => singlePlay(type, index),
  is_winner: (type: string, index: number, data: MessageData) =>
    winner(type, index, data),
};
