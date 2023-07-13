import { RoomIndex } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "./connections-controller";
import { dataProcessor } from "./ws-data-processor";

export const getRoomUsersByGameId = (data: MessageData) =>
  dataProcessor
    .getRooms()
    .find((el) => el.roomId === (data as RoomIndex).indexRoom)!.roomUsers;

export const getRoomConnectionsByUserIndex = (index: number) =>
  dataProcessor
    .getRooms()
    .find(
      (el) =>
        el.roomUsers.length === 2 &&
        (el.roomUsers[0].index === index || el.roomUsers[1].index === index)
    )!
    .roomUsers.map(
      (user) =>
        connections.getAllConnections().find((el) => el.id === user.index)!
    );

    export const getGameIdByUserId = (index: number) => dataProcessor
    .getGames()
    .find((el) => el.idPlayer === index)!.idGame