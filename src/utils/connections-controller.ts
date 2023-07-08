import { UserStates } from "../enums/enums";
import { UserConnections } from "interfaces/interfaces";
import { WebSocket } from "ws";

class ConnectionsController {
  private clientsConnections: Array<UserConnections> = [];
  private clientsId = 0;

  addUserConnection(ws: WebSocket, userState: UserStates) {
    this.clientsConnections.push({
      ws: ws,
      id: this.clientsId,
      state: userState,
    });
    this.clientsId++;
  }

  updateUserState(id: number, state: UserStates) {
    this.clientsConnections.find(el => el.id === id)!.state = state;
    // console.log(this.clientsConnections);
  }

  getUserByConnection(ws: WebSocket): UserConnections {
    return this.clientsConnections.find((el) => el.ws === ws)!;
  }

  getUserById(id: number): UserConnections {
    return this.clientsConnections.find((el) => el.id === id)!;
  }

  getAllConnections() {
    return this.clientsConnections;
  }
}

export const connections = new ConnectionsController();