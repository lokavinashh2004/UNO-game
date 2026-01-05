export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // 0-9 for number cards
  isPlayable?: boolean; // UI helper
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isAI: boolean;
  isUno: boolean; // Has called UNO or has 1 card
  avatar?: string;
}

export type GameStatus = 'setup' | 'playing' | 'round-over' | 'game-over';

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  currentColor: CardColor; // Active color (handles Wild logic)
  status: GameStatus;
  winner: Player | null;
  drawnCard: Card | null; // The card just drawn by player
}

export type GameAction =
  | { type: 'START_GAME'; payload: { playerCount: number } }
  | { type: 'PLAY_CARD'; payload: { playerId: string; cardId: string; selectedColor?: CardColor } }
  | { type: 'DRAW_CARD'; payload: { playerId: string } }
  | { type: 'PASS_TURN'; payload: { playerId: string } }
  | { type: 'SET_COLOR'; payload: { color: CardColor } }
  | { type: 'CALL_UNO'; payload: { playerId: string } }
  | { type: 'RESET_GAME' };
