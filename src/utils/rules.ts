import type { Card, CardColor } from '../types/game';

export const isValidPlay = (
    card: Card,
    topCard: Card,
    activeColor: CardColor
): boolean => {
    if (card.type === 'wild' || card.type === 'wild4') {
        return true;
    }

    if (card.color === activeColor) {
        return true;
    }

    if (card.color !== 'wild' && topCard.color !== 'wild') {
        if (card.type === 'number' && topCard.type === 'number') {
            return card.value === topCard.value;
        }
        if (card.type === topCard.type) {
            return true;
        }
    }

    return false;
};

export const getNextPlayerIndex = (
    currentIndex: number,
    direction: 1 | -1,
    playerCount: number
): number => {
    let nextIndex = (currentIndex + direction) % playerCount;
    if (nextIndex < 0) nextIndex += playerCount;
    return nextIndex;
};
