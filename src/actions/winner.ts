import { UserStates } from "../enums/enums";
import { RandomAttack } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "../utils/connections-controller";
import { getRoomConnectionsByUserIndex } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const winner = (type: string, index: number, data: MessageData) => {
  if (type === "attack" || type === "randomAttack") {
    const roomConnections = getRoomConnectionsByUserIndex(index);
    if (!roomConnections) {
      return [];
    }
    const enemyId = dataProcessor
      .getRooms()
      .find((room) => room.roomId === (data as RandomAttack).gameId)!
      .roomUsers.find(
        (el) => el.index !== (data as RandomAttack).indexPlayer
      )!.index;
    const enemyCords = dataProcessor
      .getShipCords()
      .find((el) => el.indexPlayer === enemyId)!
      .ships.flat()
      .flat();
    if (!enemyCords.length) {
      if (index >= 0) {
        const winnerName = dataProcessor.getUserNameByIndex(
          (data as RandomAttack).indexPlayer
        );
        dataProcessor.addWinner(winnerName);
      }
      roomConnections.filter((el) => el).length === 2
        ? dataProcessor.clearGame(
            roomConnections[0].id,
            roomConnections[1].id,
            (data as RandomAttack).gameId!
          )
        : dataProcessor.clearGame(
            roomConnections.filter((el) => el)[0].id,
            -roomConnections.filter((el) => el)[0].id,
            (data as RandomAttack).gameId!
          );
      roomConnections
        .filter((el) => el)
        .forEach((el) => connections.updateUserState(el.id, UserStates.logged));
      return [
        [
          roomConnections.filter((el) => el),
          wrapResponse("finish", {
            winPlayer: (data as RandomAttack).indexPlayer,
          }),
        ],
        [
          [
            ...connections.getConnectionsByState(UserStates.logged),
            ...connections.getConnectionsByState(UserStates.inRoom),
          ],
          wrapResponse("update_winners", dataProcessor.getWinners()),
        ],
        [
          roomConnections.filter((el) => el),
          wrapResponse("update_room", dataProcessor.getPendingRooms()),
        ],
      ];
    } else return [];
  } else return [];
};
