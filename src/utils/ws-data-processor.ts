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
import { connections } from "./connections-controller";
import { pasReg } from "../constants/constants";
import { UserStates } from "../enums/enums";
import { wrapResponse } from "./response-wrapper";

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
    let errorMessage = "";
    // if (data.name.length < 5 && !errorMessage.length)
    //   errorMessage = "You need minimum 5 characters for name";
    // if (data.name[0] !== data.name[0].toUpperCase() && !errorMessage.length)
    //   errorMessage = "Start your name with capital letter";
    // if (
    //   this.usersData.find((el) => el.name === data.name) &&
    //   !errorMessage.length
    // )
    //   errorMessage = `User with name ${data.name} already exists`;
    // if (!data.password.match(pasReg) && !errorMessage.length)
    //   errorMessage = "Password error: min 8 characters, min 1 digit";
    const newUser = {
      name: data.name,
      index: index,
      error: Boolean(errorMessage.length),
      errorText: errorMessage,
    };
    if (newUser.error) return newUser;
    this.usersData.push(newUser);
    return this.getUser(newUser.name);
  }

  createRoom(index: number) {
    const newRoom = {
      roomId: Date.now(),
      roomUsers: [
        {
          name: this.getUserNameByIndex(index),
          index: index,
        },
      ],
    };
    this.roomsData.push(newRoom);
    console.log("USER CONNECTION: ", connections.getConnectionById(index));
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
    return this.roomsData.filter((el) => el.roomUsers.length === 1);
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
      Math.random() *
        (userAvailableHits.length > 0
          ? Math.abs(userAvailableHits.length - 1)
          : 0)
    );
    // console.log("Hits: %s", userAvailableHits);
    // console.log("AWAILABLE HITS LENGTH: ", userAvailableHits.length);
    // console.log("RANDOM CORDS: ", randomCords);
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

  removeRoom(index: number) {
    this.roomsData.splice(
      this.roomsData.findIndex((el) => el.roomId === index),
      1
    );
  }

  clearGame(pOneId: number, pTwoId: number, gameIndex: number) {
    this.roomsData.splice(
      this.roomsData.findIndex((el) => el.roomId === gameIndex),
      1
    );
    this.gamesData.splice(
      this.gamesData.findIndex((el) => el.idPlayer === pOneId),
      1
    );
    this.gamesData.splice(
      this.gamesData.findIndex((el) => el.idPlayer === pTwoId),
      1
    );
    this.usersTurns.splice(
      this.usersTurns.findIndex((el) => el.gameID === gameIndex),
      1
    );
    this.shipsCoords
      .filter((el) => el.gameId === gameIndex)
      .forEach((el) =>
        this.shipsCoords.splice(this.shipsCoords.indexOf(el), 1)
      );
    this.shipsData
      .filter((el) => el.gameId === gameIndex)
      .forEach((el) => this.shipsData.splice(this.shipsData.indexOf(el), 1));
    this.usersHits.splice(
      this.usersHits.findIndex((el) => el.indexPlayer === pOneId),
      1
    );
    this.usersHits.splice(
      this.usersHits.findIndex((el) => el.indexPlayer === pTwoId),
      1
    );
    this.availableHits.splice(
      this.availableHits.findIndex((el) => el.indexPlayer === pOneId),
      1
    );
    this.availableHits.splice(
      this.availableHits.findIndex((el) => el.indexPlayer === pTwoId),
      1
    );
    // console.log("usersData DATA: ", this.usersData);
    // console.log("roomsData DATA: -", this.roomsData);
    // console.log("gamesData DATA: ", this.gamesData);
    // console.log("shipsCoords DATA: ", this.shipsCoords);
    // console.log("shipsData DATA: ", this.shipsData);
    // console.log("usersHits DATA: ", this.usersHits);
    // console.log("availableHits DATA: ", this.availableHits);
    // console.log("usersTurns DATA: ", this.usersTurns);
    // console.log("winnersData DATA: ", this.winnersData);
  }

  onTerminate(id: number, state: UserStates) {
    const response = [];
    console.log("STATUS: ", state);
    if (state > UserStates.unlogged) {
      this.usersData.splice(
        this.usersData.findIndex((el) => el.index === id),
        1
      );
    }
    if (state > UserStates.logged) {
      let userRoom: number | undefined = undefined;
      this.roomsData.forEach((room, index) => {
        if (room.roomUsers.find((el) => el.index === id)) userRoom = index;
      });
      if (userRoom !== undefined) this.roomsData.splice(userRoom, 1);
      response.push([
        [
          ...connections.getConnectionsByState(UserStates.logged),
          ...connections.getConnectionsByState(UserStates.inRoom),
        ],
        wrapResponse("update_room", this.getPendingRooms()),
      ]);
    }
    if (state === UserStates.inPrepare) {
      const userRoom = this.gamesData.find((el) => el.idPlayer === id)!.idGame;
      const enemyId = this.gamesData.find((el) => el.idPlayer !== id)!.idPlayer;
      const enemyConnection = connections.getUserById(enemyId);
      connections.updateUserState(enemyId, UserStates.logged);
      response.push(
        [
          enemyConnection,
          wrapResponse(
            "reg",
            this.usersData.find((el) => el.index === enemyId)!
          ),
        ],
        [enemyConnection, wrapResponse("update_room", this.getPendingRooms())]
      );
      this.gamesData = [
        ...this.gamesData.filter((el) => el.idGame !== userRoom),
      ];
    }
    if (state > UserStates.inPrepare) {
      const gameID = this.shipsCoords.find(
        (el) => el.indexPlayer === id
      )!.gameId;
      const enemyID = this.shipsCoords.find(
        (el) => el.gameId === gameID && el.indexPlayer !== id
      )!.indexPlayer;
      console.log("ENEMY ID: ", enemyID);
      ///////////////////////////////////////////////////////////////////////
      this.shipsCoords = [
        ...this.shipsCoords.filter((el) => el.gameId !== gameID),
      ];
      this.shipsData = [...this.shipsData.filter((el) => el.gameId !== gameID)];
      this.usersTurns = [
        ...this.usersTurns.filter((el) => el.gameID !== gameID),
      ];
      this.usersHits = [
        ...this.usersHits.filter(
          (el) => el.indexPlayer !== id && el.indexPlayer !== enemyID
        ),
      ];
      this.availableHits = [
        ...this.availableHits.filter(
          (el) => el.indexPlayer !== id && el.indexPlayer !== enemyID
        ),
      ];
      const winnerName = this.getUserNameByIndex(enemyID!);
      dataProcessor.addWinner(winnerName);
      response.unshift(
        [
          [connections.getConnectionById(enemyID!)!],
          wrapResponse("finish", {
            winPlayer: enemyID!,
          }),
        ],
        [
          [
            ...connections.getConnectionsByState(UserStates.logged),
            ...connections.getConnectionsByState(UserStates.inRoom),
          ],
          wrapResponse("update_winners", dataProcessor.getWinners()),
        ]
      );
    }
    // console.log("usersData DATA: ", this.usersData);
    // console.log("roomsData DATA: ", this.roomsData);
    // console.log("gamesData DATA: ", this.gamesData);
    // console.log("shipsCoords DATA: ", this.shipsCoords);
    // console.log("shipsData DATA: ", this.shipsData);
    // console.log("usersHits DATA: ", this.usersHits);
    // console.log("availableHits DATA: ", this.availableHits);
    // console.log("usersTurns DATA: ", this.usersTurns);
    // console.log("winnersData DATA: ", this.winnersData);
    return response;
    // const roomId = this.roomsData.findIndex((el) =>
    //   el.roomUsers.find((user) => user.index === id)
    // );
    // console.log(roomId);
    // console.log("ROOMS DATA: ", this.roomsData[roomId]);
    // if (this.roomsData[roomId].roomUsers.length === 2) {
    //   const enemyCon = connections.getConnectionById(
    //     this.roomsData[roomId].roomUsers.find((el) => el.index !== id)!.index // <----------------ERROR
    //   )!;
    //   if (enemyCon!.state > UserStates.inRoom) {
    //     console.log("IN GAME");
    //   } else console.log("IN ROOM");
    // }
    // this.roomsData.splice(
    //   this.roomsData.findIndex((el) => el.roomId === id),
    //   1
    // );

    // this.gamesData.splice(
    //   this.gamesData.findIndex((el) => el.idPlayer === id),
    //   1
    // );
    // this.shipsCoords.splice(
    //   this.shipsCoords.findIndex((el) => el.indexPlayer === id),
    //   1
    // );
    // this.shipsData.splice(
    //   this.shipsData.findIndex((el) => el.indexPlayer === id),
    //   1
    // );
    // this.usersHits.splice(
    //   this.usersHits.findIndex((el) => el.indexPlayer === id),
    //   1
    // );
    // this.availableHits.splice(
    //   this.availableHits.findIndex((el) => el.indexPlayer === id),
    //   1
    // );
  }
}

export const dataProcessor = new WebSocketDataProcessor();
