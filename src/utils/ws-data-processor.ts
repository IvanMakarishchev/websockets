import { MessageData } from "../types/types";
import {
  Attack,
  GamesData,
  NewUser,
  RandomAttack,
  RawPosition,
  RawShips,
  RoomData,
  RoomIndex,
  Ships,
  UserConnections,
  UserData,
  UsersHits,
  UsersTurn,
  Winners,
  WsMessage,
} from "../interfaces/interfaces";
import { doAction } from "./ws-actions";
import { fillSectors } from "./fill-around";

class WebSocketDataProcessor {
  private usersData: NewUser[] = [];
  private roomsData: RoomData[] = [];
  private gamesData: GamesData[] = [];
  private shipsCoords: Ships[] = [];
  private shipsData: Ships[] = [];
  private usersHits: UsersHits[] = [];
  private availableHits: UsersHits[] = [];
  private usersTurns: UsersTurn[] = [];
  private winnersData: Winners[] = [];

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
    return [...result, ...doAction.is_winner(type, index, data as MessageData)];
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
    this.usersHits.push({ indexPlayer: data.indexPlayer!, hits: [] });
    this.availableHits = [
      ...this.availableHits,
      {
        indexPlayer: data.indexPlayer!,
        hits: new Set(
          new Array(10)
            .fill([])
            .map((_, iY) => new Array(10).fill([]).map((_, iX) => [iX, iY]))
            .flat()
        ),
      },
    ];
  }

  attackResult(data: Attack) {
    const gameId = this.gamesData.find((el) => el.idPlayer)!.idGame;
    const gameIndex = this.usersTurns.findIndex((el) => el.gameID === gameId)!;
    let isAvailableSector = false;
    // console.log(`GAME ID: ${gameId}`);
    // console.log(`GAME INDEX: ${gameIndex}`);
    // console.log(`USERS TURNS: ${JSON.stringify(this.usersTurns)}`);
    let isPlayerTurn = data.indexPlayer === this.usersTurns[gameIndex].turn[0];
    const userAvailableHits = this.availableHits.find(
      (el) => el.indexPlayer === data.indexPlayer
    );
    (userAvailableHits!.hits as Set<number[]>).forEach((el) => {
      if (el[0] === data.x && el[1] === data.y && isPlayerTurn) {
        (userAvailableHits!.hits as Set<number[]>).delete(el);
        isAvailableSector = true;
      }
    });
    if (!isAvailableSector || !isPlayerTurn) return [];
    const shipsDataByPlayer = this.shipsCoords.find(
      (el) => el.indexPlayer === data.indexPlayer
    );
    const enemyPositions = this.shipsCoords.find(
      (sData, i) =>
        sData.gameId === shipsDataByPlayer!.gameId &&
        sData.indexPlayer !== shipsDataByPlayer!.indexPlayer
    )!.ships as RawPosition[][][];
    let res = "miss";
    const killedArray: RawPosition[] = [];
    enemyPositions.forEach((el) => {
      const index = el[0].findIndex(
        (pos: RawPosition) => pos.x === data.x && pos.y === data.y
      );
      if (index >= 0) {
        el[1].push(...el[0].splice(index, 1));
        if (el[0].length > 0) {
          res = "shot";
          (
            this.usersHits.find((el) => el.indexPlayer === data.indexPlayer)!
              .hits as RawPosition[]
          ).push({ x: data.x, y: data.y });
        } else {
          killedArray.push(...el[1]);
          el[1].length = 0;
          res = "killed";
        }
      }
    });
    if (res === "miss") {
      [...this.usersTurns[gameIndex].turn] = [
        this.usersTurns[gameIndex].turn[1],
        this.usersTurns[gameIndex].turn[0],
      ];
    }
    const missArray = fillSectors(killedArray).map((pos) => {
      (userAvailableHits!.hits as Set<number[]>).forEach((el) => {
        if (el[0] === pos.x && el[1] === pos.y) {
          (userAvailableHits!.hits as Set<number[]>).delete(el);
          isAvailableSector = true;
        }
      });
      return {
        userId: data.indexPlayer,
        position: {
          x: pos.x,
          y: pos.y,
        },
        currentPlayer: data.indexPlayer,
        status: "miss",
      };
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
      : [
          ...killedArray.map((el) => ({
            position: {
              x: el.x,
              y: el.y,
            },
            currentPlayer: data.indexPlayer,
            status: res,
          })),
          ...missArray,
        ];
  }

  getRandomData(index: number, data: MessageData) {
    const userAvailableHits = Array.from(
      this.availableHits.find((el) => el.indexPlayer === index)!.hits as Set<
        number[]
      >
    );
    // console.log(
    //   `User: ${index}, Hits array length: ${userAvailableHits.length}`
    // );
    const randomCords = Math.round(
      Math.random() * userAvailableHits.length > 0
        ? Math.abs(userAvailableHits.length - 1)
        : 0
    );
    // console.log("Hits: %s", userAvailableHits);
    console.log(randomCords);
    return {
      gameID: (data as RandomAttack).gameID,
      x: userAvailableHits[randomCords][0],
      y: userAvailableHits[randomCords][1],
      indexPlayer: index,
    };
  }

  playerTurn(firstIndex: number, secondIndex: number, gameID: number) {
    this.usersTurns.push({
      gameID: gameID,
      turn: [firstIndex, secondIndex],
    });
  }

  getTurn(index: number) {
    return this.usersTurns.find((el) => el.gameID === index)!.turn[0];
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
  getShipCords() {
    return this.shipsCoords;
  }

  getGames() {
    return this.gamesData;
  }

  addWinner(name: string) {
    let wasWinner = false;
    this.winnersData.forEach((el) => {
      if (el.name === name) wasWinner = true;
    });
    wasWinner
      ? this.winnersData.find((el) => el.name === name)!.wins++
      : (this.winnersData = [...this.winnersData, { name: name, wins: 1 }]);
  }

  getWinners() {
    return this.winnersData;
  }
}

export const dataProcessor = new WebSocketDataProcessor();
