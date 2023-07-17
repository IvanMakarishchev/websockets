import { THROTTLE_TIME } from "../constants/constants";
import {
  Attack,
  AttackResult,
  UserConnections,
  WsMessage,
} from "../interfaces/interfaces";
import { MessageData } from "../type/types";
import { connections } from "../utils/connections-controller";
import {
  getRoomConnectionsByUserIndex,
} from "../utils/data-functions";
import { wrapResponse } from "../utils/response-wrapper";
import { dataProcessor } from "../utils/ws-data-processor";
import { doAction } from "./ws-actions";

export const attack = (type: string, index: number, data: MessageData) => {
  let roomConnections = getRoomConnectionsByUserIndex(index);
  if (!roomConnections) {
    connections.updateActionTime(
      connections.getConnectionById(index)!.ws,
      THROTTLE_TIME
    );
    return [];
  }
  roomConnections = roomConnections.filter((el) => el);
  const isBotGame = roomConnections.length === 2 ? false : true;
  const attackResult = dataProcessor.attackResult(
    data as Attack
  ) as AttackResult[];
  let turnPlayerId = roomConnections[0].id;
  if (!isBotGame)
    turnPlayerId = roomConnections.find((el) => el.turnTime < Date.now())!.id;
  let nextTurn: (UserConnections[] | WsMessage)[] = [
    roomConnections.filter((el) => el !== undefined),
    wrapResponse("turn", { currentPlayer: turnPlayerId }),
  ];
  let checkIsBotWinner: (UserConnections[] | WsMessage)[][] = [];
  let botResolve: (UserConnections[] | WsMessage)[][] = [];
  if (isBotGame) {
    if (attackResult[0] && attackResult[0].status === "miss") {
      const botData: MessageData = {
        x: 0,
        y: 0,
        gameID: -index,
        indexPlayer: -index,
      };
      let status = "";
      while (status !== "miss") {
        const attack = dataProcessor.attackResult(
          dataProcessor.getRandomData(-index, botData)
        );
        status =
          attack.length
            ? attack[0].status !== "miss"
              ? ""
              : "miss"
            : "miss";
        const turn: (UserConnections[] | WsMessage)[] = [
          roomConnections,
          wrapResponse("turn", {
            currentPlayer: -roomConnections[0].id,
          }),
        ];
        let isWinner = doAction.is_winner(type, -index, {
          indexPlayer: -index,
          gameID: -index,
          gameId: -index,
        } as MessageData);
        botResolve = [
          ...botResolve,
          turn,
          ...attack.map((el, i) =>
            el
              ? [
                  roomConnections!,
                  wrapResponse("attack", i === 0 ? { ...el, isBot: true } : el),
                ]
              : []
          ),
          ...isWinner,
          isWinner.length
            ? [roomConnections, { type: "break", data: "[]", id: 0 }]
            : [],
        ];
      }
      connections.updateTurnTime(
        connections.getConnectionById(Math.abs(index))!.ws,
        Date.now()
      );
    }
  }
  return [
    ...(attackResult.length
      ? attackResult.map((res) =>
          !("userId" in res)
            ? [
                roomConnections!.filter((el) => el !== undefined),
                wrapResponse("attack", res),
              ]
            : [
                roomConnections!.filter((el) => el.id === res.userId)!,
                wrapResponse("attack", res),
              ]
        )
      : []),
    ...botResolve,
    nextTurn,
  ];
};
