import { User } from '@/modules/user/user.entity';

/**
 * Represntation of the logged-in user in Redis.
 *
 */
export class UserState extends User {
  game: string | null = null;
  adventure: number | null = null;
  marks2dump: Mark2Dump[] = [];
  confirmations2dump: Confirmation2Dump[] = [];
  friends2dump: string[] = [];

  chatRooms: string[] = [];

  static from(user: User) {
    const state = new UserState();

    Object.assign(state, user);
    state.hash = '';
    state.salt = '';
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

// TODO: rename this
export interface Confirmation2Dump {}
