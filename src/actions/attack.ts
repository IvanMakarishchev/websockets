import {
  Attack,
  AttackResult,
  UserConnections,
  WsMessage,
} from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { getGameIdByUserId, getRoomConnectionsByUserIndex } from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";

export const attack = (type: string, index: number, data: MessageData) => {
  let roomConnections = getRoomConnectionsByUserIndex(index);
  roomConnections = roomConnections.filter((el) => el);
  const isBotGame = roomConnections.length === 2 ? false : true;
  const attackResult = dataProcessor.attackResult(
    data as Attack
  ) as AttackResult[];
  const gameId = getGameIdByUserId((data as Attack).indexPlayer);
  let botResolve: (UserConnections[] | WsMessage)[][] = [];
  if (isBotGame) {
    let botAttack: AttackResult[] = [];
    let botTurn: (UserConnections[] | WsMessage)[] = [];
    const botData: MessageData = {
      x: 0,
      y: 0,
      gameID: -index,
      indexPlayer: -index,
    };
    botAttack = dataProcessor.attackResult(
      dataProcessor.getRandomData(-index, botData)
    ) as AttackResult[];
    botTurn = [
      roomConnections,
      wrapResponse("turn", {
        currentPlayer: dataProcessor.getTurn(gameId),
      }),
    ];
    botResolve = [
      [roomConnections, wrapResponse("attack", botAttack[0])],
      botTurn,
    ];
  }
  return [
    ...attackResult.map((res) =>
      !("userId" in res)
        ? [
            roomConnections.filter((el) => el !== undefined),
            wrapResponse("attack", res),
          ]
        : [
            roomConnections.filter((el) => el.id === res.userId)!,
            wrapResponse("attack", res),
          ]
    ),
    [
      roomConnections.filter((el) => el !== undefined),
      wrapResponse("turn", { currentPlayer: dataProcessor.getTurn(gameId) }),
    ],
    ...botResolve,
  ];
};
