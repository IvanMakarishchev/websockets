import { MessageData } from "../types/types";
import { dataProcessor } from "./ws-data-processor";
import {
  Attack,
  AttackResult,
  RandomAttack,
  RoomIndex,
  Ships,
  UserConnections,
  UserData,
  WsMessage,
} from "../interfaces/interfaces";
import { wrapResponse } from "./response-wrapper";
import { connections } from "./connections-controller";
import { UserStates } from "../enums/enums";

export const doAction = {
  reg: (type: string, index: number, data: MessageData) => {
    const currentConnection = connections.getUserById(index);
    const regResult = dataProcessor.createNewUser(data as UserData, index);
    if (regResult.error) {
      return [
        [
          currentConnection,
          wrapResponse(type, {
            ...regResult,
            errorText: "",
          }),
        ],
        [currentConnection, wrapResponse(type, regResult)],
      ];
    } else {
      connections.updateUserState(index, UserStates.logged);
      return [
        [currentConnection, wrapResponse(type, regResult)],
        [
          currentConnection,
          wrapResponse("update_room", dataProcessor.getPendingRooms()),
        ],
        [
          currentConnection,
          wrapResponse("update_winners", dataProcessor.getWinners()),
        ],
      ];
    }
  },
  create_room: (
    type: string,
    index: number
  ): (WsMessage | UserConnections[])[][] => {
    let isInRoom = false;
    dataProcessor.getRooms().forEach((el) => {
      if (el.roomUsers.find((room) => room.index === index)) isInRoom = true;
    });
    if (isInRoom) return [];
    dataProcessor.createRoom(index);
    connections.updateUserState(index, UserStates.inRoom);
    return [
      [
        [
          ...connections.getConnectionsByState(UserStates.logged),
          ...connections.getConnectionsByState(UserStates.inRoom),
        ],
        wrapResponse("update_room", dataProcessor.getPendingRooms()),
      ],
    ];
  },
  add_user_to_room: (
    type: string,
    index: number,
    data: MessageData
  ): (WsMessage | UserConnections[])[][] => {
    if (
      dataProcessor
        .getRooms()
        .find((el) => el.roomId === (data as RoomIndex).indexRoom)!
        .roomUsers.findIndex((el) => el.index === index) >= 0
    )
      return [];
    dataProcessor.enterRoom(index, data as RoomIndex);
    const roomConnections = dataProcessor
      .getRooms()
      .find((room) => room.roomId === (data as RoomIndex).indexRoom)!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    dataProcessor
      .getRooms()
      .find((el) => el.roomId === (data as RoomIndex).indexRoom)!
      .roomUsers.forEach((el) => {
        const defectRoom = dataProcessor
          .getRooms()
          .find(
            (room) =>
              room.roomUsers.length === 1 &&
              room.roomUsers[0].index === el.index
          );
        if (defectRoom) dataProcessor.removeRoom(defectRoom.roomId);
      });
    return [
      [
        connections.getConnectionsByState(UserStates.logged),
        wrapResponse("update_room", dataProcessor.getPendingRooms()),
      ],
      ...roomConnections
        .map((el) => {
          connections.updateUserState(el.id, UserStates.inPrepare);
          return { ...el, state: UserStates.inPrepare };
        })
        .map((el) => [
          [el],
          wrapResponse(
            "create_game",
            dataProcessor.createGame(el.id, data as RoomIndex)
          ),
        ]),
    ];
  },
  add_ships: (type: string, index: number, data: MessageData) => {
    const shipsData = data as Ships;
    dataProcessor.addShips(shipsData);
    const roomConnections = dataProcessor
      .getRooms()
      .find(
        (el) =>
          el.roomUsers.length === 2 &&
          (el.roomUsers[0].index === index || el.roomUsers[1].index === index)
      )!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    console.log(roomConnections);
    const isReady = dataProcessor
      .getShipsData()
      .filter((el) => el.gameId === shipsData.gameId);
    if (isReady.length > 1) {
      roomConnections
        .filter((el) => el !== undefined)
        .forEach((el) => connections.updateUserState(el.id, UserStates.inGame));
      return [
        [
          roomConnections,
          wrapResponse("start_game", dataProcessor.startGame(shipsData)),
        ],
        [
          roomConnections,
          wrapResponse("turn", {
            currentPlayer: dataProcessor.getTurn((data as Ships).gameId!),
          }),
        ],
      ];
    } else {
      const room = dataProcessor
        .getRooms()
        .find((el) => el.roomId === (data as Ships).gameId);
      dataProcessor.playerTurn(
        index,
        room!.roomUsers.find((el) => el.index !== index)!.index,
        (data as Ships).gameId!
      );
      return [];
    }
  },
  attack: (type: string, index: number, data: MessageData) => {
    let roomConnections = dataProcessor
      .getRooms()
      .find(
        (el) =>
          el.roomUsers.length === 2 &&
          (el.roomUsers[0].index === index || el.roomUsers[1].index === index)
      )!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    roomConnections = roomConnections.filter((el) => el);
    const isBotGame = roomConnections.length === 2 ? false : true;
    const attackResult = dataProcessor.attackResult(
      data as Attack
    ) as AttackResult[];
    const gameId = dataProcessor
      .getGames()
      .find((el) => el.idPlayer === (data as Attack).indexPlayer)!.idGame;
    let botResolve: (UserConnections[] | WsMessage)[][] = [];
    if (isBotGame) {
      let botAttack: AttackResult[] = [];
      let botTurn: (UserConnections[] | WsMessage)[] = [];
      console.log(index, " : ", data);
      const botData: MessageData = {
        x: 0,
        y: 0,
        gameID: -index,
        indexPlayer: -index,
      };
      botAttack = dataProcessor.attackResult(
        dataProcessor.getRandomData(-index, botData)
      ) as AttackResult[];
      console.log("BOT ATTACK: ", botAttack);
      botTurn = [
        roomConnections,
        wrapResponse("turn", {
          currentPlayer: dataProcessor.getTurn(gameId),
        }),
      ];
      botResolve = [
        [roomConnections, wrapResponse("attack", botAttack[0])],
        botTurn,
      ];
    }
    return [
      ...attackResult.map((res) =>
        !("userId" in res)
          ? [
              roomConnections.filter((el) => el !== undefined),
              wrapResponse("attack", res),
            ]
          : [
              roomConnections.filter((el) => el.id === res.userId)!,
              wrapResponse("attack", res),
            ]
      ),
      [
        roomConnections.filter((el) => el !== undefined),
        wrapResponse("turn", { currentPlayer: dataProcessor.getTurn(gameId) }),
      ],
      ...botResolve,
    ];
  },
  randomAttack: (type: string, index: number, data: MessageData) => {
    const roomConnections = dataProcessor
      .getRooms()
      .find(
        (el) =>
          el.roomUsers.length === 2 &&
          (el.roomUsers[0].index === index || el.roomUsers[1].index === index)
      )!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    const attackResult = dataProcessor.attackResult(
      dataProcessor.getRandomData(index, data)
    ) as AttackResult[];
    const gameId = dataProcessor
      .getGames()
      .find((el) => el.idPlayer === (data as Attack).indexPlayer)!.idGame;
    return [
      ...attackResult.map((res) =>
        !("userId" in res)
          ? [roomConnections, wrapResponse("attack", res)]
          : [
              roomConnections.filter((el) => el.id === res.userId)!,
              wrapResponse("attack", res),
            ]
      ),
      [
        roomConnections,
        wrapResponse("turn", { currentPlayer: dataProcessor.getTurn(gameId) }),
      ],
    ];
  },
  single_play: (type: string, index: number) => {
    const currentConnection = connections.getConnectionById(index)!;
    dataProcessor.createRoom(-index);
    dataProcessor.createGame(-index, { indexRoom: -index });
    connections.updateUserState(index, UserStates.inPrepare);
    dataProcessor.addShips({ gameId: -index, indexPlayer: -index, ships: [] });
    dataProcessor.playerTurn(index, -index, -index);
    return [
      [
        [currentConnection],
        wrapResponse(
          "create_game",
          dataProcessor.createGame(index, { indexRoom: -index })
        ),
      ],
    ];
  },
  is_winner: (type: string, index: number, data: MessageData) => {
    if (type === "attack" || type === "randomAttack") {
      const roomConnections = dataProcessor
        .getRooms()
        .find(
          (el) =>
            el.roomUsers.length === 2 &&
            (el.roomUsers[0].index === index || el.roomUsers[1].index === index)
        )!
        .roomUsers.map(
          (user) =>
            connections.getAllConnections().find((el) => el.id === user.index)!
        );
      const enemyId = dataProcessor
        .getRooms()
        .find((room) => room.roomId === (data as RandomAttack).gameId)!
        .roomUsers.find(
          (el) => el.index !== (data as RandomAttack).indexPlayer
        )!.index;
      const enemyCords = dataProcessor
        .getShipCords()
        .find((el) => el.indexPlayer === enemyId)!
        .ships.flat()
        .flat();
      if (!enemyCords.length) {
        const winnerName = dataProcessor.getUserNameByIndex(
          (data as RandomAttack).indexPlayer
        );
        dataProcessor.addWinner(winnerName);
        console.log(roomConnections);
        roomConnections.filter(el => el).length === 2
          ? dataProcessor.clearGame(
              roomConnections[0].id,
              roomConnections[1].id,
              (data as RandomAttack).gameId!
            )
          : dataProcessor.clearGame(
              roomConnections.filter(el => el)[0].id,
              -roomConnections.filter(el => el)[0].id,
              (data as RandomAttack).gameId!
            );
        roomConnections
          .filter((el) => el)
          .forEach((el) =>
            connections.updateUserState(el.id, UserStates.logged)
          );
        return [
          [
            roomConnections.filter(el => el),
            wrapResponse("finish", {
              winPlayer: (data as RandomAttack).indexPlayer,
            }),
          ],
          [
            [
              ...connections.getConnectionsByState(UserStates.logged),
              ...connections.getConnectionsByState(UserStates.inRoom),
            ],
            wrapResponse("update_winners", dataProcessor.getWinners()),
          ],
          [
            roomConnections.filter(el => el),
            wrapResponse("update_room", dataProcessor.getPendingRooms()),
          ],
        ];
      } else return [];
    } else return [];
  },
};
