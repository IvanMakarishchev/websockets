import { UserStates } from "../enums/enums";
import {
  RoomIndex,
  UserConnections,
  WsMessage,
} from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "../utils/connections-controller";
import { getRoomUsersByGameId } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const addUserToRoom = (
  type: string,
  index: number,
  data: MessageData
): (WsMessage | UserConnections[])[][] => {
  const roomUsers = getRoomUsersByGameId(data);
  if (roomUsers.findIndex((el) => el.index === index) >= 0) return [];
  dataProcessor.enterRoom(index, data as RoomIndex);
  const roomConnections = roomUsers.map(
    (user) =>
      connections.getAllConnections().find((el) => el.id === user.index)!
  );
  roomUsers.forEach((el) => {
    const defectRoom = dataProcessor
      .getRooms()
      .find(
        (room) =>
          room.roomUsers.length === 1 && room.roomUsers[0].index === el.index
      );
    if (defectRoom) dataProcessor.removeRoom(defectRoom.roomId);
  });
  return [
    [
      connections.getConnectionsByState(UserStates.logged),
      wrapResponse("update_room", dataProcessor.getPendingRooms()),
    ],
    ...roomConnections
      .map((el) => {
        connections.updateUserState(el.id, UserStates.inPrepare);
        return { ...el, state: UserStates.inPrepare };
      })
      .map((el) => [
        [el],
        wrapResponse(
          "create_game",
          dataProcessor.createGame(el.id, data as RoomIndex)
        ),
      ]),
  ];
};
