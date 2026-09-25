export interface HelloMessage {
  type: "hawknext-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "hawknext-hello-ack";
  version: string;
  clientId: string;
}
