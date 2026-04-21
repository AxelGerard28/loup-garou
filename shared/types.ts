export type Role = 'WEREWOLF' | 'VILLAGER' | 'SEER' | 'WITCH' | 'HUNTER' | 'CUPID';

export type Phase = 'LOBBY' | 'NIGHT' | 'DAY' | 'VOTE' | 'END';

export type NightSubPhase = 'SEER' | 'WEREWOLF' | 'WITCH' | 'END' | undefined;

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

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
  nightSubPhase?: NightSubPhase;
  dayCount: number;
  winner?: 'WEREWOLVES' | 'VILLAGERS';
  lastDeath?: string;
  witchHasLifePotion: boolean;
  witchHasDeathPotion: boolean;
  messages: ChatMessage[];
}

export interface ServerToClientEvents {
  gameStateUpdate: (state: GameState) => void;
  roleAssigned: (role: Role) => void;
  gameStarted: () => void;
  actionResult: (message: string) => void;
}

export interface ClientToServerEvents {
  joinRoom: (data: { roomCode: string, name: string }) => void;
  readyUp: () => void;
  startGame: () => void;
  vote: (targetId: string) => void;
  roleAction: (action: string, targetId?: string) => void;
  sendMessage: (text: string) => void;
  resetGame: () => void;
}
