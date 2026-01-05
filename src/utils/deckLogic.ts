import type { Card, CardColor, CardType } from '../types/game';

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];
const ACTIONS: CardType[] = ['skip', 'reverse', 'draw2'];

export const generateDeck = (): Card[] => {
    const deck: Card[] = [];
    let idCounter = 0;

    // Generate Color Cards
    COLORS.forEach((color) => {
        // Number Cards
        NUMBERS.forEach((num) => {
            deck.push({
                id: `card-${idCounter++}`,
                color: color,
                type: 'number',
                value: num,
            });
        });

        // Action Cards
        ACTIONS.forEach((action) => {
            for (let i = 0; i < 2; i++) {
                deck.push({
                    id: `card-${idCounter++}`,
                    color: color,
                    type: action,
                });
            }
        });
    });

    // Wild Cards
    for (let i = 0; i < 4; i++) {
        deck.push({
            id: `card-${idCounter++}`,
            color: 'wild',
            type: 'wild',
        });
        deck.push({
            id: `card-${idCounter++}`,
            color: 'wild',
            type: 'wild4',
        });
    }

    return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};
