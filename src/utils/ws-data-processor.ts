import { MessageData } from "../type/types";
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
  Winners,
  WsMessage,
} from "../interfaces/interfaces";
import { doAction } from "../actions/ws-actions";
import { fillSectors } from "./fill-around";
import { connections } from "./connections-controller";
import { UserStates } from "../enums/enums";
import { wrapResponse } from "./response-wrapper";
import { generatePositions } from "./position-generator";
import { WAIT_AFTER_GAME, pasReg } from "../constants/constants";

class WebSocketDataProcessor {
  private usersData: NewUser[] = [];
  private roomsData: RoomData[] = [];
  private gamesData: GamesData[] = [];
  private shipsCoords: Ships[] = [];
  private shipsData: Ships[] = [];
  private usersHits: UsersHits[] = [];
  private availableHits: UsersHits[] = [];
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
    const names = this.usersData.map(el => el.name);
    if (names.includes(data.name))
      errorMessage = `User name ${data.name} already exists`;
    if (data.name.length < 5)
      errorMessage = "You need minimum 5 characters for name";
    if (data.name[0] !== data.name[0].toUpperCase())
      errorMessage = "Start your name with capital letter";
    if (!data.password.match(pasReg))
      errorMessage = "Password error: min 8 characters, min 1 digit";
    const newUser = {
      name: data.name,
      index: index,
      error: Boolean(errorMessage),
      errorText: errorMessage,
    };
    if (errorMessage.length) return newUser;
    this.usersData.push(newUser);
    return this.getUser(newUser.name);
  }

  createRoom(index: number) {
    const newRoom = {
      roomId: index >= 0 ? Date.now() : index,
      roomUsers: [
        {
          name: index >= 0 ? this.getUserNameByIndex(index) : "BOT",
          index: index,
        },
      ],
    };
    if (index < 0)
      newRoom.roomUsers = [
        ...newRoom.roomUsers,
        {
          name: this.getUserNameByIndex(-index),
          index: -index,
        },
      ];
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
    let updatedShips;
    if (data.indexPlayer! >= 0) {
      updatedShips = {
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
    }
    if (data.indexPlayer! < 0) {
      updatedShips = {
        ...data,
        ships: generatePositions(),
      };
    }
    this.shipsCoords.push(updatedShips as Ships);
    this.shipsData.push(data);
    this.usersHits.push({ indexPlayer: data.indexPlayer!, hits: [] });
    this.availableHits = [
      ...this.availableHits,
      {
        indexPlayer: data.indexPlayer!,
        hits: new Array(10)
          .fill([])
          .map((_, iY) =>
            new Array(10)
              .fill({ x: 0, y: 0 })
              .map((_, iX) => ({ x: iX, y: iY }))
          )
          .flat(),
      },
    ];
  }

  attackResult(data: Attack) {
    let isBot = false;
    if (data.indexPlayer < 0) {
      isBot = true;
    }
    let isAvailableSector = false;
    const userAvailableHits = this.availableHits.find(
      (el) => el.indexPlayer === data.indexPlayer
    );
    if (userAvailableHits)
      (userAvailableHits.hits as RawPosition[]).forEach((el, i) => {
        if (el.x === data.x && el.y === data.y) {
          userAvailableHits!.hits.splice(i, 1);
          isAvailableSector = true;
        }
      });
    if (!isAvailableSector) return [];
    const shipsDataByPlayer = this.shipsCoords.find(
      (el) => el.indexPlayer === data.indexPlayer
    );
    const enemyPositions = this.shipsCoords.find(
      (sData, i) =>
        sData.gameId === shipsDataByPlayer!.gameId &&
        sData.indexPlayer !== shipsDataByPlayer!.indexPlayer
    )!.ships as RawPosition[][][];
    let res = "miss";
    let shipsAlive = enemyPositions.length;
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
      if (!el[0].length) shipsAlive--;
    });
    if (res === "miss") {
      const gameID = data.gameID ? data.gameID : data.gameId;
      let enemyId = -data.indexPlayer;
      if (gameID! >= 0) {
        connections.updateTurnTime(
          connections.getConnectionById(data.indexPlayer)!.ws,
          Date.now()
        );
        enemyId = this.gamesData.find(
          (el) => el.idGame === gameID && el.idPlayer !== data.indexPlayer
        )!.idPlayer;
        connections.updateTurnTime(
          connections.getConnectionById(enemyId)!.ws,
          -1000
        );
      }
      if (gameID! < 0) {
        const playerIndex = connections.getConnectionById(data.indexPlayer)
          ? data.indexPlayer
          : -data.indexPlayer;
        connections.updateTurnTime(
          connections.getConnectionById(playerIndex)!.ws,
          Date.now()
        );
      }
    }
    const missArray = userAvailableHits
      ? fillSectors(killedArray).map((pos) => {
          (userAvailableHits.hits as RawPosition[]).forEach((el, i) => {
            if (el.x === pos.x && el.y === pos.y) {
              userAvailableHits.hits.splice(i, 1);
              isAvailableSector = true;
            }
          });
          return {
            position: {
              x: pos.x,
              y: pos.y,
            },
            currentPlayer: data.indexPlayer,
            status: "miss",
          };
        })
      : [];
    if (shipsAlive === 0) {
      if (data.indexPlayer >= 0)
        connections.updateActionTime(
          connections.getConnectionById(data.indexPlayer)!.ws,
          WAIT_AFTER_GAME
        );
    }
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
    const userAvailableHits = this.availableHits.find(
      (el) => el.indexPlayer === index
    )?.hits;
    let randomCords: number;
    let correctCords = false;
    randomCords = Math.round(
      Math.random() *
        (userAvailableHits && userAvailableHits.length > 0
          ? Math.abs(userAvailableHits.length - 1)
          : 0)
    );
    return userAvailableHits
      ? {
          gameID: (data as RandomAttack).gameId!,
          x: userAvailableHits[randomCords!].x,
          y: userAvailableHits[randomCords!].y,
          indexPlayer: index,
        }
      : {
          gameID: (data as RandomAttack).gameId!,
          x: 0,
          y: 0,
          indexPlayer: index,
        };
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
    if (pTwoId >= 0) {
      connections.updateTurnTime(connections.getConnectionById(pTwoId)!.ws, 0);
    }
    connections.updateTurnTime(connections.getConnectionById(pOneId)!.ws, 0);
    this.usersHits.splice(
      this.usersHits.findIndex((el) => el.indexPlayer === pTwoId),
      1
    );
    this.availableHits.splice(
      this.availableHits.findIndex((el) => el.indexPlayer === pTwoId),
      1
    );
    this.gamesData.splice(
      this.gamesData.findIndex((el) => el.idPlayer === pTwoId),
      1
    );
    this.roomsData.splice(
      this.roomsData.findIndex((el) => el.roomId === gameIndex),
      1
    );
    this.gamesData.splice(
      this.gamesData.findIndex((el) => el.idPlayer === pOneId),
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
    this.availableHits.splice(
      this.availableHits.findIndex((el) => el.indexPlayer === pOneId),
      1
    );
  }

  onTerminate(id: number, state: UserStates) {
    if (id < 0) return [];
    const response = [];
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
      if (userRoom >= 0) {
        const enemyId = this.gamesData.find(
          (el) => el.idPlayer !== id
        )!.idPlayer;
        const enemyConnection = connections.getUserById(enemyId);
        connections.updateUserState(enemyId, UserStates.logged);
        connections.updateTurnTime(
          connections.getConnectionById(enemyId)!.ws,
          0
        );
        this.shipsCoords = this.shipsCoords.filter(
          (el) => el.indexPlayer !== enemyId
        );
        this.shipsData = this.shipsData.filter(
          (el) => el.indexPlayer !== enemyId
        );
        this.availableHits = this.availableHits.filter(
          (el) => el.indexPlayer !== enemyId
        );
        this.usersHits = this.usersHits.filter(
          (el) => el.indexPlayer !== enemyId
        );
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
    }
    if (state > UserStates.inPrepare) {
      const gameID = this.gamesData.find((el) => el.idPlayer === id)!.idGame;
      this.gamesData = [...this.gamesData.filter((el) => el.idGame !== gameID)];
      const enemyID = this.shipsCoords.find(
        (el) => el.gameId === gameID && el.indexPlayer !== id
      )!.indexPlayer;
      this.shipsCoords = [
        ...this.shipsCoords.filter((el) => el.gameId !== gameID),
      ];
      this.shipsData = [...this.shipsData.filter((el) => el.gameId !== gameID)];
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
      if (gameID! >= 0) {
        const winnerName = this.getUserNameByIndex(enemyID!);
        this.addWinner(winnerName);
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
            wrapResponse("update_winners", this.getWinners()),
          ]
        );
      }
    }
    return response;
  }
}

export const dataProcessor = new WebSocketDataProcessor();
