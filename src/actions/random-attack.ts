import { AttackResult, Attack } from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { getGameIdByUserId, getRoomConnectionsByUserIndex } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const randomAttack = (type: string, index: number, data: MessageData) => {
  const roomConnections = getRoomConnectionsByUserIndex(index);
  const attackResult = dataProcessor.attackResult(
    dataProcessor.getRandomData(index, data)
  ) as AttackResult[];
  const gameId = getGameIdByUserId((data as Attack).indexPlayer);
  return [
    ...attackResult.map((res) =>
      !("userId" in res)
        ? [roomConnections, wrapResponse("attack", res)]
        : [
            roomConnections.filter((el) => el.id === res.userId)!,
            wrapResponse("attack", res),
          ]
    ),
    [
      roomConnections,
      wrapResponse("turn", { currentPlayer: dataProcessor.getTurn(gameId) }),
    ],
  ];
}