import { MessageData } from "../types/types.ts";
import { UserConnections, WsMessage } from "../interfaces/interfaces.ts";
import { dataProcessor } from "../utils/ws-data-processor.ts";
import { WebSocket, WebSocketServer } from "ws";
import { connections } from "../utils/connections-controller.ts";
import { UserStates } from "../enums/enums.ts";

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
        (result as []).forEach((el) => ws.send(JSON.stringify(el)));
        console.log(parsedMessage.type);
        const update = dataProcessor.updateData(parsedMessage.type, parsedData);
        if (update) {
          update.forEach(upd => {
            (upd[0] as Array<UserConnections>).forEach((el) => {
              if (el.ws !== ws) el.ws.send(JSON.stringify(upd[1]));
            });
          })
        }
      });
    });
  }
}
