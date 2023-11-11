import { GameRoom } from '@/modules/game/dtos/game.game-room.dto';
import { InventoryItem, User } from '@/modules/user/user.entity';
import { Confirmation as Confirmation2Dump } from '@/utils/statedict';
export interface UserStateDump {
  id: number;
  game: GameRoom | null;
  username: string;
  exp: number;
  blocked: boolean;
  confirmations: Confirmation2Dump[];
  accessLevel: number;
  winCount: number;
  loseCount: number;
  friendsMarked: string[];
  inventory: InventoryItem[];
}
/**
 * Represntation of the logged-in user in Redis.
 *
 */
export class UserState extends User {
  public game: GameRoom | null = null;
  adventure: number | null = null;
  marks2dump: Mark2Dump[] = [];
  confirmations2dump: Confirmation2Dump[] = [];
  friends2dump: string[] = [];

  chatRooms: string[] = [];

  static from(user: User) {
    const state = new UserState();

    Object.assign(state, user);
    state.confirmations2dump = user.confirmations.map(
      (c) => c as Confirmation2Dump,
    );
    state.friends2dump = user.friends.map((f) => f.username);
    state.marks2dump = user.marks.map((m) => ({
      id: m.id,
      name: m.target.username,
      mark: m.mark,
    }));

    const openAdventures = user.adventures
      .filter((a) => !a.closed)
      .sort((a, b) => (a.createAt > b.createAt ? -1 : 1));
    if (openAdventures.length > 0) {
      state.adventure = openAdventures[0].id;
    }
    return state;
  }
  static fromRedis(records: any): UserState {
    const state = new UserState();
    Object.assign(state, records);
    return state;
  }

  public asDump(): UserStateDump {
    const {
      id,
      username,
      exp,
      blocked,
      confirmations2dump,
      accessLevel,
      winCount,
      game,
      loseCount,
      marks2dump,
      inventory,
    } = this;
    return {
      id,
      username,
      game,
      exp,
      blocked,
      confirmations: confirmations2dump,
      friendsMarked: marks2dump.map((m) => m.name),
      accessLevel,
      winCount,
      loseCount,
      inventory,
    };
  }
  constructor() {
    super();
  }
}

// TODO: rename this
export interface Mark2Dump {
  id: number;
  name: string;
  mark: string;
}
