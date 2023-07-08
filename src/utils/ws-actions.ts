import { MessageData } from "../types/types";
import { dataProcessor } from "./ws-data-processor";
import {
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
    if (isReady.length > 1)
      return [
        [
          roomConnections,
          wrapResponse("start_game", dataProcessor.startGame(shipsData)),
        ],
      ];
    else return [];
  },
};
