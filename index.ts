import { httpServer } from "./src/http_server/index";
import { GameWebsocket } from "./src/websocket/ws";

const HTTP_PORT = 8181;
const WS_PORT = 3000;
const WS_HOST = "localhost";

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
const websocket = new GameWebsocket(WS_HOST, WS_PORT).start();
