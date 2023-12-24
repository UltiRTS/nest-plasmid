export interface AutohostResponse {
  action: string;
  parameters: {
    info?: string;
    title?: string;
    status?: boolean;
    id?: number;
  };
}
