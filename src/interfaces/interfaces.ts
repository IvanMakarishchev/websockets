export interface IncomingData {
  type: string
  data: string
  id: number
}

export interface UserData {
  name: string
  password: string
}

export interface NewUser {
  name: string,
  index: string,
  error: boolean,
  errorText: string
}