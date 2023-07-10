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
    connections.updateUserState(index, UserStates.logged);
    const currentConnection = connections.getUserById(index);
    return [
      [
        currentConnection,
        wrapResponse(
          type,
          dataProcessor.createNewUser(data as UserData, index)
        ),
      ],
      [
        currentConnection,
        wrapResponse("update_room", dataProcessor.getPendingRooms()),
      ],
    ];
  },
  // update_room: (type: string, index: number) => {
  //   const currentConnection = connections.getUserById(index);
  //   console.log("CURRENT CONNECTION: ", currentConnection);
  //   return [
  //     [currentConnection, wrapResponse(type, dataProcessor.getPendingRooms())],
  //   ];
  // },
  create_room: (
    type: string,
    index: number
  ): (WsMessage | UserConnections[])[][] => {
    dataProcessor.createRoom(index);
    connections.getUserById(index)[0].state = UserStates.inRoom;
    return [
      [
        connections
          .getAllConnections()
          .filter(
            (el) =>
              el.state === UserStates.logged || el.state === UserStates.inRoom
          ),
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
    roomConnections.forEach((el) =>
      connections.updateUserState(el.id, UserStates.inGame)
    );
    return [
      [
        connections
          .getAllConnections()
          .filter((el) => el.state === UserStates.logged),
        wrapResponse("update_room", dataProcessor.getPendingRooms()),
      ],
      ...roomConnections.map((el) => [
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
          el.roomUsers[0].index === index || el.roomUsers[1].index === index
      )!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    const isReady = dataProcessor
      .getShipsData()
      .filter((el) => el.gameId === shipsData.gameId);
    if (isReady.length > 1) {
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
    const roomConnections = dataProcessor
      .getRooms()
      .find(
        (el) =>
          el.roomUsers[0].index === index || el.roomUsers[1].index === index
      )!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    const attackResult = dataProcessor.attackResult(
      data as Attack
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
  randomAttack: (type: string, index: number, data: MessageData) => {
    const roomConnections = dataProcessor
      .getRooms()
      .find(
        (el) =>
          el.roomUsers[0].index === index || el.roomUsers[1].index === index
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
  is_winner: (type: string, index: number, data: MessageData) => {
    if (type === "attack" || type === "randomAttack") {
      const roomConnections = dataProcessor
        .getRooms()
        .find(
          (el) =>
            el.roomUsers[0].index === index || el.roomUsers[1].index === index
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
        return [
          [
            roomConnections,
            wrapResponse("finish", {
              winPlayer: (data as RandomAttack).indexPlayer,
            }),
          ],
          [
            roomConnections,
            wrapResponse("update_winners", dataProcessor.getWinners()),
          ],
        ];
      } else return [];
    } else return [];
  },
};
