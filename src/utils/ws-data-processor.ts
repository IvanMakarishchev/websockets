import { MessageData } from "../types/types";
import {
  Attack,
  GamesData,
  NewUser,
  RawPosition,
  RawShips,
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
  private shipsCoords: Ships[] = [];
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
      currentPlayerIndex: data.indexPlayer,
    };
    return playerShips;
  }

  addShips(data: Ships) {
    const updatedShips = {
      ...data,
      ships: (data.ships as RawShips[]).map(
        (el) =>
          (el.position = [
            JSON.parse(
              `[${JSON.stringify(el.position)
                .repeat(el.length)
                .replaceAll("}{", "},{")}]`
            ).map((pos: RawPosition, i: number) =>
              el.direction
                ? { x: pos.x, y: pos.y + i }
                : { x: pos.x + i, y: pos.y }
            ),
            [],
          ])
      ),
    };
    this.shipsCoords.push(updatedShips);
    this.shipsData.push(data);
  }

  attackResult(data: Attack) {
    const shipsDataByPlayer = this.shipsCoords.find(
      (el) => el.indexPlayer === data.indexPlayer
    );
    let shipsId = -1;
    const enemyPositions = this.shipsCoords.find((sData, i) => {
      shipsId = i;
      return (
        sData.gameId === shipsDataByPlayer!.gameId &&
        sData.indexPlayer !== shipsDataByPlayer!.indexPlayer
      );
    })!.ships as RawPosition[][][];
    let res = "miss";
    const killedArray: RawPosition[] = [];
    enemyPositions.forEach((el) => {
      const index = el[0].findIndex(
        (pos: RawPosition) => pos.x === data.x && pos.y === data.y
      );
      if (index >= 0) {
        el[1].push(...el[0].splice(index, 1));
        if (el[0].length > 0) res = "shot";
        else {
          killedArray.push(...el[1]);
          el[1].length = 0;
          res = "killed";
        }
      }
    });
    return res !== "killed"
      ? [
          {
            position: {
              x: data.x,
              y: data.y,
            },
            currentPlayer: data.indexPlayer,
            status: res,
          },
        ]
      : killedArray.map((el) => ({
          position: {
            x: el.x,
            y: el.y,
          },
          currentPlayer: data.indexPlayer,
          status: res,
        }));
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
