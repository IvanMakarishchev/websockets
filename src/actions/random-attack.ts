import { MessageData } from "../type/types";
import { dataProcessor } from "../utils/ws-data-processor";
import { attack } from "./attack";

export const randomAttack = (type: string, index: number, data: MessageData) => {
  const attackData = dataProcessor.getRandomData(index, data)
  return attack(type, index, attackData);
}