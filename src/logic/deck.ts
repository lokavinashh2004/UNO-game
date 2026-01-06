import type { Card } from './types.js';
import { CardColor, CardType } from './types.js';

/**
 * Generates a unique ID for a card.
 */
const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
};

export const createDeck = (): Card[] => {
    const deck: Card[] = [];
    const colors = [CardColor.RED, CardColor.BLUE, CardColor.GREEN, CardColor.YELLOW];

    colors.forEach((color) => {
        // 1 Zero card per color
        deck.push({
            id: generateId(),
            type: CardType.NUMBER,
            color: color,
            value: 0,
        });

        // 2 of each number 1-9
        for (let i = 1; i <= 9; i++) {
            deck.push({ id: generateId(), type: CardType.NUMBER, color, value: i });
            deck.push({ id: generateId(), type: CardType.NUMBER, color, value: i });
        }

        // 2 Skips
        deck.push({ id: generateId(), type: CardType.SKIP, color });
        deck.push({ id: generateId(), type: CardType.SKIP, color });

        // 2 Reverses
        deck.push({ id: generateId(), type: CardType.REVERSE, color });
        deck.push({ id: generateId(), type: CardType.REVERSE, color });

        // 2 Draw Twos
        deck.push({ id: generateId(), type: CardType.DRAW_TWO, color });
        deck.push({ id: generateId(), type: CardType.DRAW_TWO, color });
    });

    // 4 Wild Cards
    for (let i = 0; i < 4; i++) {
        deck.push({ id: generateId(), type: CardType.WILD, color: CardColor.NONE });
    }

    // 4 Wild Draw Four Cards
    for (let i = 0; i < 4; i++) {
        deck.push({ id: generateId(), type: CardType.WILD_DRAW_FOUR, color: CardColor.NONE });
    }

    return deck;
};

/**
 * Fisher-Yates shuffle algorithm.
 * Mutates the array in place.
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};
