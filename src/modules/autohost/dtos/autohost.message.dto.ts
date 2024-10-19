export interface AutoHostMessage {
  action: string;
  parameters: { [key: string]: any };
}

export interface CMDParams {
  id: number
  title: string
  cmd: string
}