export interface AutohostResponse {
  action: string;
  parameters: {
    info?: string;
    title?: string;
    status?: boolean;
    id?: number;
  };
}

export interface AutohostAddrInfo {
  addr: string;
  port: number;
  socket: WebSocket;
}
