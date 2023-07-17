import { THROTTLE_TIME } from "../constants/constants";
import { UserStates } from "../enums/enums";
import { Ships } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "../utils/connections-controller";
import { getRoomConnectionsByUserIndex } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const addShips = (type: string, index: number, data: MessageData) => {
  const roomConnections = getRoomConnectionsByUserIndex(index)?.filter(
    (el) => el
  );
  if (!roomConnections) {
    connections.updateActionTime(
      connections.getConnectionById(index)!.ws,
      THROTTLE_TIME
    );
    return [];
  }
  connections.updateTurnTime(connections.getConnectionById(index)!.ws, 0);
  const turnPlayerId = roomConnections.find((el) =>
    roomConnections.length === 2 ? el.id !== index : el.id === index
  )!.id;
  const shipsData = data as Ships;
  dataProcessor.addShips(shipsData);
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
          currentPlayer: turnPlayerId,
        }),
      ],
    ];
  } else {
    return [];
  }
};
