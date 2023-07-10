import { MessageData } from "../types/types.ts";
import { UserConnections, WsMessage } from "../interfaces/interfaces.ts";
import { dataProcessor } from "../utils/ws-data-processor.ts";
import { WebSocket, WebSocketServer } from "ws";
import { connections } from "../utils/connections-controller.ts";
import { UserStates } from "../enums/enums.ts";
import { PING_PONG_RATE } from "../constants/constants.ts";

export class GameWebsocket {
  private websocket: WebSocketServer;
  constructor(host: string, port: number) {
    this.websocket = new WebSocketServer({ host: host, port: port }, () => {
      console.log("Websocket started!");
    });
  }
  start(): void {
    this.websocket.on("connection", (ws) => {
      connections.addUserConnection(ws, UserStates.unlogged);
      const index = connections.getUserByConnection(ws)!.id;
      ws.on(
        "pong",
        () => connections.updateConnectionState(index, true)
      );
      ws.on("error", console.error);
      ws.on("message", (data) => {
        const parsedMessage = JSON.parse(data.toString()) as WsMessage;
        const parsedData = parsedMessage.data
          ? (JSON.parse(parsedMessage.data) as MessageData)
          : undefined;
        console.log("————————————————————————————————————————————————————————");
        console.log("REQUEST TYPE: ", parsedMessage.type);
        console.log("REQUEST INDEX: ", index);
        console.log("REQUEST DATA: ", parsedData);
        const result = dataProcessor.processData(
          parsedMessage.type,
          index,
          parsedData
        );
        result.forEach((mes) =>
          (mes[0] as UserConnections[]).forEach((el) => {
            el.ws.send(JSON.stringify(mes[1]));
          })
        );
      });
    });
    const interval = setInterval(() => {
      connections.getAllConnections().forEach((con) => {
        if (!con.isAlive) {
          console.log(con.id, " : CONNECTION TERMINATED");
          connections.removeConnection(con.id);
          return con.ws.terminate();
        }
        console.log(con.id, ' : ', con.isAlive);
        connections.updateConnectionState(con.id, false);
        con.ws.ping();
      });
    }, PING_PONG_RATE);
  }
}
