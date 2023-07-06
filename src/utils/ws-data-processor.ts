import { MessageData } from "../types/types";
import { NewUser, UserData } from "../interfaces/interfaces";
import { doAction } from "./ws-actions";
import { randomUUID } from "crypto";

class WebSocketDataProcessor {
  private usersData: NewUser[] = [];

  processData(type: string, data?: MessageData) {
    console.log(`Processing...`)
    const result = data
      ? Object.entries(doAction).find((el) => el[0] === type)![1](data)
      : Object.entries(doAction).find((el) => el[0] === type)![1];
    console.log(`Sending: ${result!})}`)
    return { type: type, data: JSON.stringify(result!), id: 0 };
  }

  createNewUser(data: UserData): NewUser {
    const newUser = {
      name: data.name,
      index: randomUUID().toString(),
      error: false,
      errorText: "",
    };
    this.usersData.push(newUser);
    return this.getUser(newUser.name);
  }

  createRoom() {
    this.processData("create_game");
  }

  createGame() {
    const newGame = {
      idGame: 0,
      idPlayer: 0,
    };
    return newGame;
  }

  getUser(name: string) {
    return this.usersData.find((el) => el.name === name)!;
  }
}

export const dataProcessor = new WebSocketDataProcessor();
