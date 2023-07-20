export interface Game {
  roomNotes: string;
  title: string;
  hoster: string;
  mapId: number;
  ais: Record<string, { team: string }>;
  chickens: Record<string, { team: string }>;
  players: Record<string, { isSpec: boolean; team: string; hasmap: boolean }>;
  polls: Record<string, Set<string>>;
  id: number;
  engineToken: string;
  password: string;
  isStarted: boolean;
  responsibleAutohost: string;
  aiHosters: string[];
  autohostPort: number;
  mod: string;
}

export interface GameBrief {
  title: string;
  hoster: string;
  mapId: number;
}

export interface ChatRoomState {
  roomName: string;
  createAt: string;
  password: string;
  // IDs of the members
  members: string[];
  lastMessage: { author: string; content: string; time: number };
}

export interface Confirmation {
  id: number;
  text: string;
  type: string;
  payload: any;
  claimed: boolean;
}

export interface UserDump {
  friends: string[];
  friendsMarked: string[];
  friendsOnline: string[];
  username: string;
  exp: number;
  sanity: number;
  blocked: boolean;
  confirmations: Confirmation[];
  chatRooms: { [x: string]: ChatRoomState };
  game: Game | null;
}

export interface State {
  user: UserDump;
  chats: string[];
  games: GameBrief[];
}
