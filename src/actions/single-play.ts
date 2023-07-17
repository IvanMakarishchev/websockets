import { UserStates } from "../enums/enums";
import { connections } from "../utils/connections-controller";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const singlePlay = (type: string, index: number) => {
  const currentConnection = connections.getConnectionById(index)!;
  dataProcessor.createRoom(-index);
  dataProcessor.createGame(-index, { indexRoom: -index });
  connections.updateUserState(index, UserStates.inPrepare);
  dataProcessor.addShips({ gameId: -index, indexPlayer: -index, ships: [] });
  return [
    [
      [currentConnection],
      wrapResponse(
        "create_game",
        dataProcessor.createGame(index, { indexRoom: -index })
      ),
    ],
  ];
};
