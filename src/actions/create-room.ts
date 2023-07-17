import { UserStates } from "../enums/enums";
import { UserConnections, WsMessage } from "../interfaces/interfaces";
import { dataProcessor } from "../utils/ws-data-processor";
import { wrapResponse } from "../utils/response-wrapper";
import { connections } from "../utils/connections-controller";

export const createRoom = (
  type: string,
  index: number
): (WsMessage | UserConnections[])[][] => {
  let isInRoom = false;
  dataProcessor.getRooms().forEach((el) => {
    if (el.roomUsers.find((room) => room.index === index)) isInRoom = true;
  });
  if (isInRoom) return [];
  dataProcessor.createRoom(index);
  connections.updateUserState(index, UserStates.inRoom);
  return [
    [
      [
        ...connections.getConnectionsByState(UserStates.logged),
        ...connections.getConnectionsByState(UserStates.inRoom),
      ],
      wrapResponse("update_room", dataProcessor.getPendingRooms()),
    ],
  ];
}