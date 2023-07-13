import { UserStates } from "../enums/enums";
import { UserData } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { dataProcessor } from "../utils/ws-data-processor";
import { wrapResponse } from "../utils/response-wrapper";
import { connections } from "../utils/connections-controller";

export const login = (type: string, index: number, data: MessageData) => {
  const currentConnection = connections.getUserById(index);
  const regResult = dataProcessor.createNewUser(data as UserData, index);
  if (regResult.error) {
    return [
      [
        currentConnection,
        wrapResponse(type, {
          ...regResult,
          errorText: "",
        }),
      ],
      [currentConnection, wrapResponse(type, regResult)],
    ];
  }
  connections.updateUserState(index, UserStates.logged);
  return [
    [currentConnection, wrapResponse(type, regResult)],
    [
      currentConnection,
      wrapResponse("update_room", dataProcessor.getPendingRooms()),
    ],
    [
      currentConnection,
      wrapResponse("update_winners", dataProcessor.getWinners()),
    ],
  ];
};
