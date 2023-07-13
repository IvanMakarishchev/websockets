import { WsMessage } from "../interfaces/interfaces";
import { MessageData } from "../type/types";

export const wrapResponse = (type: string, data: MessageData): WsMessage => {
  return { type: type, data: JSON.stringify(data), id: 0 };
};
