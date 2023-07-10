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
      isAlive: true,
    });
    this.clientsId++;
  }

  updateUserState(id: number, state: UserStates) {
    this.clientsConnections.find((el) => el.id === id)!.state = state;
  }

  updateConnectionState(id: number, state: boolean) {
    this.clientsConnections.find((el) => el.id === id)!.isAlive = state;
  }

  getUserByConnection(ws: WebSocket): UserConnections {
    return this.clientsConnections.find((el) => el.ws === ws)!;
  }

  getUserById(id: number): UserConnections[] {
    return this.clientsConnections.filter((el) => el.id === id)!;
  }

  getAllConnections() {
    return this.clientsConnections;
  }

  getConnectionsByState(state: UserStates) {
    return this.clientsConnections.filter((el) => (el.state = state));
  }

  removeConnection(id: number) {
    this.clientsConnections.splice(
      this.clientsConnections.findIndex((el) => el.id === id),
      1
    );
  }
}

export const connections = new ConnectionsController();
