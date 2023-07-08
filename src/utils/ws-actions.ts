import { MessageData } from "../types/types";
import { dataProcessor } from "./ws-data-processor";
import { RoomIndex, UserData, WsMessage } from "../interfaces/interfaces";
import { wrapResponse } from "./response-wrapper";
import { connections } from "./connections-controller";
import { UserStates } from "../enums/enums";

export const doAction = {
  reg: (type: string, index: number, data: MessageData): WsMessage[] => {
    connections.updateUserState(index, UserStates.logged);
    return [
      wrapResponse(type, dataProcessor.createNewUser(data as UserData, index)),
      wrapResponse("update_room", dataProcessor.getPendingRooms()),
    ];
  },
  update_room: (type: string) => {
    return [wrapResponse(type, dataProcessor.getPendingRooms())];
  },
  create_room: (type: string, index: number) => {
    dataProcessor.createRoom(index);
    connections.getUserById(index).state = UserStates.inRoom;
    return [wrapResponse("update_room", dataProcessor.getPendingRooms())];
  },
  add_user_to_room: (type: string, index: number, data: MessageData) => {
    dataProcessor.enterRoom(index, data as RoomIndex);
    connections.getUserById(index).state = UserStates.inGame;
    return [
      wrapResponse(
        "create_game",
        dataProcessor.createGame(index, data as RoomIndex)
      ),
    ];
  },
};

export const doUpdate = {
  create_room: () => [
    [
      connections
        .getAllConnections()
        .filter((el) => el.state === UserStates.logged),
      wrapResponse("update_room", dataProcessor.getPendingRooms()),
    ],
  ],
  add_user_to_room: (data: MessageData) => {
    const roomConnections = dataProcessor
      .getRooms()
      .find((room) => room.roomId === (data as RoomIndex).indexRoom)!
      .roomUsers.map(
        (user) =>
          connections.getAllConnections().find((el) => el.id === user.index)!
      );
    // roomConnections.forEach(el => el.state = UserStates.inGame);
    return [
      [
        connections
          .getAllConnections()
          .filter((el) => el.state === UserStates.logged),
        wrapResponse("update_room", dataProcessor.getPendingRooms()),
      ],
      [
        roomConnections,
        wrapResponse(
          "create_game",
          dataProcessor.createGame(
            roomConnections.find((el) => el.state === UserStates.inRoom)!.id,
            data as RoomIndex
          )
        ),
      ],
    ];
  },
};
