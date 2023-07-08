import { MessageData } from "../types/types";
import {
  GamesData,
  NewUser,
  RoomData,
  RoomIndex,
  Ships,
  UserConnections,
  UserData,
  WsMessage,
} from "../interfaces/interfaces";
import { doAction } from "./ws-actions";

class WebSocketDataProcessor {
  private usersData: NewUser[] = [];
  private roomsData: RoomData[] = [];
  private gamesData: GamesData[] = [];
  private shipsData: Ships[] = [];

  processData(
    type: string,
    index: number,
    data?: MessageData
  ): (UserConnections[] | WsMessage)[][] {
    const result = data
      ? Object.entries(doAction).find((el) => el[0] === type)![1](
          type,
          index,
          data
        )
      : Object.entries(doAction).find((el) => el[0] === type)![1](type, index, {
          data: "",
        });
    return result;
  }

  createNewUser(data: UserData, index: number): NewUser {
    const newUser = {
      name: data.name,
      index: index,
      error: false,
      errorText: "",
    };
    this.usersData.push(newUser);
    return this.getUser(newUser.name);
  }

  createRoom(index: number) {
    const newRoom = {
      roomId: this.roomsData.length,
      roomUsers: [
        {
          name: this.getUserNameByIndex(index),
          index: index,
        },
      ],
    };
    this.roomsData.push(newRoom);
  }

  enterRoom(userId: number, roomId: RoomIndex) {
    const room = this.roomsData.find((el) => el.roomId === roomId.indexRoom);
    if (room) {
      const newUser = {
        name: this.getUserNameByIndex(userId),
        index: userId,
      };
      room.roomUsers.push(newUser);
    }
  }

  getRooms() {
    return this.roomsData;
  }

  getPendingRooms() {
    return this.roomsData.filter((el) => el.roomUsers.length < 2);
  }

  createGame(index: number, roomIndex: RoomIndex) {
    const newGame = {
      idGame: roomIndex.indexRoom,
      idPlayer: index,
    };
    this.gamesData.push(newGame);
    return newGame;
  }

  startGame(data: Ships) {
    const playerShips = {
      ships: data.ships,
      currentPlayerIndex: data.indexPlayer
    }
    return playerShips;
  }

  addShips(data: Ships) {
    this.shipsData.push(data);
  }

  getUsers() {
    return this.usersData;
  }

  getUser(name: string) {
    return this.usersData.find((el) => el.name === name)!;
  }

  getUserNameByIndex(index: number) {
    return this.usersData.find((user) => user.index === index)!.name;
  }
  getShipsData() {
    return this.shipsData;
  }
}

export const dataProcessor = new WebSocketDataProcessor();
