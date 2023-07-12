import { MessageData } from "../types/types.ts";
import { UserConnections, WsMessage } from "../interfaces/interfaces.ts";
import { dataProcessor } from "../utils/ws-data-processor.ts";
import { WebSocket, WebSocketServer } from "ws";
import { connections } from "../utils/connections-controller.ts";
import { UserStates } from "../enums/enums.ts";
import { PING_PONG_RATE } from "../constants/constants.ts";
import { generatePositions } from "../utils/position-generator.ts";

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
          // console.log(mes);
          (mes[0] as UserConnections[]).forEach((el) => {
            if (el) el.ws.send(JSON.stringify(mes[1]));
          });
        });
      });
    });
    const interval = setInterval(() => {
      // connections
      //   .getAllConnections()
      //   .forEach((el) => console.log(el.id, " is connected"));
      connections.getAllConnections().forEach((con) => {
        if (!con.isAlive) {
          console.log(`${con.id} : CONNECTION TERMINATED`);
          // console.log("CON ID:", con.id);
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
