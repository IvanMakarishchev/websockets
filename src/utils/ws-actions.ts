import { MessageData } from "../types/types";
import { dataProcessor } from "./ws-data-processor";
import { UserData } from "../interfaces/interfaces";

export const doAction = {
  reg: (data: MessageData) =>
    JSON.stringify(dataProcessor.createNewUser(data as UserData)),
  create_room: () => dataProcessor.createRoom,
};
