import { IncomingData } from "../interfaces/interfaces.ts";
import { dataProcessor } from "../utils/ws-data-processor.ts";
import { WebSocketServer } from "ws";
import { MessageData } from "../types/types.ts";

export class GameWebsocket {
  private websocket: WebSocketServer;
  constructor(host: string, port: number) {
    this.websocket = new WebSocketServer({ host: host, port: port }, () =>
      console.log("Websocket started!")
    );
  }
  start(): void {
    this.websocket.on("connection", (ws) => {
      ws.on("error", console.error);
      ws.on("message", (data) => {
        const parsedMessage = JSON.parse(data.toString()) as IncomingData;
        const parsedData = parsedMessage.data ? JSON.parse(parsedMessage.data) as MessageData : undefined;
        const result = dataProcessor.processData(parsedMessage.type, parsedData);
        ws.send(JSON.stringify(result));
      });
    });
  }
}
