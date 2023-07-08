import { MessageData } from "../types/types";
import {
  GamesData,
  NewUser,
  RoomData,
  RoomIndex,
  UserData,
  WsMessage,
} from "../interfaces/interfaces";
import { doAction, doUpdate } from "./ws-actions";
import { wrapResponse } from "./response-wrapper";

class WebSocketDataProcessor {
  private usersData: NewUser[] = [];
  private roomsData: RoomData[] = [];
  private gamesData: GamesData[] = [];

  processData(
    type: string,
    index: number,
    data?: MessageData
  ): Array<WsMessage> {
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

  updateData(type: string, data?: MessageData) {
    const updateType = Object.entries(doUpdate).find((el) => el[0] === type);
    return updateType
      ? data
        ? updateType[1](data)
        : updateType[1]({
            data: "",
          })
      : undefined;
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
    if (this.gamesData) console.log("GAMES GATA: ", this.gamesData);
    console.log("ROOMS DATA: ", JSON.stringify(this.roomsData));
    return newGame;
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
}

export const dataProcessor = new WebSocketDataProcessor();
