export const CardColor = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    NONE: 'none', // For Wild cards before they are played
} as const;

export type CardColor = typeof CardColor[keyof typeof CardColor];

export const CardType = {
    NUMBER: 'number',
    SKIP: 'skip',
    REVERSE: 'reverse',
    DRAW_TWO: 'draw_two',
    WILD: 'wild',
    WILD_DRAW_FOUR: 'wild_draw_four',
} as const;

export type CardType = typeof CardType[keyof typeof CardType];

export interface Card {
    id: string; // Unique ID for React keys and tracking
    type: CardType;
    color: CardColor;
    value?: number; // Only for NUMBER cards (0-9)
}

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    isHuman: boolean;
    hasCalledUno: boolean;
    isSafe: boolean; // immunity from previous effects if any
}

export const GamePhase = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
} as const;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export const PlayDirection = {
    CLOCKWISE: 'clockwise',
    COUNTER_CLOCKWISE: 'counter_clockwise',
} as const;

export type PlayDirection = typeof PlayDirection[keyof typeof PlayDirection];

export interface GameState {
    players: Player[]; // List of all players
    currentPlayerIndex: number; // Index of player whose turn it is
    playDirection: PlayDirection;

    drawPile: Card[];
    discardPile: Card[];

    currentColor: CardColor; // Active color (handles Wild effect)
    previousColor?: CardColor; // Color BEFORE the last Wild Draw 4 (for challenges)
    currentCard: Card | null; // Top card of discard pile

    pendingDrawCount: number; // Stacking draw penalties

    gamePhase: GamePhase;
    winnerId: string | null;

    // New Fields for Refined Logic
    turnPhase: 'normal' | 'after_draw'; // Track if player just drew a card
    drawnCard: Card | null; // The specific card that was just drawn
    settings: {
        allowStacking: boolean;
    };

    // History or Log for debugging/replay could go here
    lastAction?: string;
}

export interface Move {
    type: 'play' | 'draw' | 'challenge' | 'challenge-uno' | 'pass';
    card?: Card; // Required if type is 'play'
    chosenColor?: CardColor; // Required if playing a Wild card
    calledUno?: boolean; // Signal to call UNO with this move
    targetPlayerId?: string; // For challenge-uno
}
