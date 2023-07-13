import { MessageData } from "../type/types";
import { UserConnections, WsMessage } from "../interfaces/interfaces";
import { dataProcessor } from "../utils/ws-data-processor";
import { connections } from "../utils/connections-controller";
import { WebSocketServer } from "ws";
import { UserStates } from "../enums/enums";
import { PING_PONG_RATE, THROTTLE_TIME } from "../constants/constants";

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
        const lastActionTime =
          connections.getUserByConnection(ws).lastActionTime;
        // console.log(Date.now() > lastActionTime + THROTTLE_TIME);
        if (Date.now() > lastActionTime + THROTTLE_TIME) {
          const parsedMessage = JSON.parse(data.toString()) as WsMessage;
          const parsedData = parsedMessage.data
            ? (JSON.parse(parsedMessage.data) as MessageData)
            : undefined;
          const result = dataProcessor.processData(
            parsedMessage.type,
            index,
            parsedData
          );
          result.forEach((mes) => {
            console.log(mes[1]);
            (mes[0] as UserConnections[]).forEach((el) => {
              if (el) el.ws.send(JSON.stringify(mes[1]));
            });
          });
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
