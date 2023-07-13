import { UserStates } from "../enums/enums";
import { Ships } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "../utils/connections-controller";
import { getRoomConnectionsByUserIndex } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const addShips = (type: string, index: number, data: MessageData) => {
  const shipsData = data as Ships;
  dataProcessor.addShips(shipsData);
  const roomConnections = getRoomConnectionsByUserIndex(index);
  const isReady = dataProcessor
    .getShipsData()
    .filter((el) => el.gameId === shipsData.gameId);
  if (isReady.length > 1) {
    roomConnections
      .filter((el) => el !== undefined)
      .forEach((el) => connections.updateUserState(el.id, UserStates.inGame));
    return [
      [
        roomConnections,
        wrapResponse("start_game", dataProcessor.startGame(shipsData)),
      ],
      [
        roomConnections,
        wrapResponse("turn", {
          currentPlayer: dataProcessor.getTurn((data as Ships).gameId!),
        }),
      ],
    ];
  } else {
    const room = dataProcessor
      .getRooms()
      .find((el) => el.roomId === (data as Ships).gameId);
    dataProcessor.playerTurn(
      index,
      room!.roomUsers.find((el) => el.index !== index)!.index,
      (data as Ships).gameId!
    );
    return [];
  }
}