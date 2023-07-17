import { MessageData } from "../type/types";
import { UserConnections, WsMessage } from "../interfaces/interfaces";
import { dataProcessor } from "../utils/ws-data-processor";
import { connections } from "../utils/connections-controller";
import { WebSocketServer } from "ws";
import { UserStates } from "../enums/enums";
import {
  BOT_TURN_TIME,
  PING_PONG_RATE,
  THROTTLE_TIME,
} from "../constants/constants";

export class GameWebsocket {
  private websocket: WebSocketServer;
  constructor(host: string, port: number) {
    this.websocket = new WebSocketServer({ host: host, port: port }, () => {
      console.log("WEBSOCKET STARTED!");
    });
  }
  start(): void {
    this.websocket.on("connection", (ws) => {
      connections.addUserConnection(ws, UserStates.unlogged);
      const index = connections.getUserByConnection(ws)!.id;
      ws.on("pong", () => connections.updateConnectionState(index, true));
      ws.on("error", console.error);
      ws.on("message", (data) => {
        const userConnection = connections.getUserByConnection(ws);
        const nextActionTime = userConnection.nextActionTime;
        const turnTime = userConnection.turnTime;
        if (Date.now() > nextActionTime && Date.now() > turnTime) {
          const parsedMessage = JSON.parse(data.toString()) as WsMessage;
          const parsedData = parsedMessage.data
            ? (JSON.parse(parsedMessage.data) as MessageData)
            : undefined;
          const result = dataProcessor.processData(
            parsedMessage.type,
            index,
            parsedData
          );
          let isBotTurn = false;
          let isBotTimes = 0;
          for (let i = 0; i < result.length; i++) {
            if (!result[i].length) continue;
            if (JSON.parse((result[i][1] as WsMessage).data).type === "break")
              break;
            if ("isBot" in JSON.parse((result[i][1] as WsMessage).data))
              isBotTurn = true;
            if (isBotTurn) {
              connections.updateTurnTime(
                (result[i][0] as UserConnections[])[0].ws,
                Date.now()
              );
              if ("isBot" in JSON.parse((result[i][1] as WsMessage).data))
                isBotTimes++;
              setTimeout(
                () =>
                  (result[i][0] as UserConnections[]).forEach((el) => {
                    connections.updateActionTime(el.ws, THROTTLE_TIME);
                    el.ws.send(JSON.stringify(result[i][1]));
                  }),
                BOT_TURN_TIME * isBotTimes
              );
            } else {
              (result[i][0] as UserConnections[]).forEach((el) => {
                connections.updateActionTime(el.ws, THROTTLE_TIME);
                el.ws.send(JSON.stringify(result[i][1]));
              });
            }
          }
          if (result.length && (result[0][0] as UserConnections[]).length === 1)
            setTimeout(
              () =>
                connections.updateTurnTime(
                  (result[0][0] as UserConnections[])[0].ws,
                  0
                ),
              BOT_TURN_TIME * isBotTimes
            );
          isBotTurn = false;
          isBotTimes = 0;
        }
      });
    });
    const interval = setInterval(() => {
      connections.getAllConnections().forEach((con) => {
        if (!con.isAlive) {
          console.log(`${con.id} : CONNECTION TERMINATED`);
          dataProcessor.onTerminate(con.id, con.state).forEach((mes) => {
            (mes[0] as UserConnections[]).forEach((el) => {
              el.ws.send(JSON.stringify(mes[1]));
            });
          });
          connections.removeConnection(con.id);
          return con.ws.terminate();
        }
        connections.updateConnectionState(con.id, false);
        con.ws.ping();
      });
    }, PING_PONG_RATE);
  }
}
