export type Role = 'WEREWOLF' | 'VILLAGER' | 'SEER' | 'WITCH' | 'HUNTER' | 'CUPID';

export type Phase = 'LOBBY' | 'NIGHT' | 'DAY' | 'VOTE' | 'END';

export interface Player {
  id: string;
  name: string;
  role?: Role;
  isAlive: boolean;
  isReady: boolean;
  isHost: boolean;
  votedFor?: string;
}

export interface GameState {
  players: Player[];
  phase: Phase;
  dayCount: number;
  winner?: 'WEREWOLVES' | 'VILLAGERS';
  lastDeath?: string;
  witchHasLifePotion: boolean;
  witchHasDeathPotion: boolean;
}

export interface ServerToClientEvents {
  gameStateUpdate: (state: GameState) => void;
  roleAssigned: (role: Role) => void;
  gameStarted: () => void;
  actionResult: (message: string) => void;
}

export interface ClientToServerEvents {
  joinRoom: (name: string) => void;
  readyUp: () => void;
  startGame: () => void;
  vote: (targetId: string) => void;
  roleAction: (action: string, targetId?: string) => void;
}
