import type { GameState, Move } from './types.js';
import { CardColor, CardType } from './types.js';
import { isValidMove } from './engine.js';

/**
 * Basic AI for UNO
 * - Legal Moves First
 * - Avoid WD4 if possible (checking own hand) to avoid challenge?
 *   - AI knows if it plays WD4 it might be challenged.
 *   - AI logic: check if I have matching color. If yes, DO NOT play WD4 unless forced?
 *   - Actually AI can't play WD4 legally if it has color... wait.
 *   - `isValidMove` allows it. The rule is "You MAY play..." but risk challenge.
 *   - Honest AI: Only play WD4 if no matching color.
 */

export const getBestMove = (gameState: GameState, myPlayerId: string): Move => {
    const player = gameState.players.find(p => p.id === myPlayerId);
    if (!player) throw new Error("AI player not found");

    const playableCards = player.hand.filter(c => isValidMove(gameState, c));

    // 1. If no playable cards, Draw
    if (playableCards.length === 0) {
        return { type: 'draw' };
    }

    // 2. Strategy: Setup Win
    // If I have 1 card left after playing, I MUST call Uno.
    const willHaveOneCardLeft = player.hand.length === 2;

    // 3. Selection Logic
    // Priority: 
    // - Action Cards (Skip, Reverse, Draw 2) to hamper opponents
    // - Number cards (High value first? Or match color?)
    // - Wilds (Save for later)
    // - WD4 (Last resort or if safe)

    // Filter out WD4 unless we have no other choice OR we are safe (no matching color)
    const hasMatchingColor = player.hand.some(c => c.color === gameState.currentColor);
    // const safeToPlayWD4 = !hasMatchingColor; // Unused, keeping logic below

    let candidates = playableCards;

    // Honest AI: Remove WD4 if we have matching color
    // (Simulate "Don't bluff unless desperate")
    if (hasMatchingColor) {
        candidates = candidates.filter(c => c.type !== CardType.WILD_DRAW_FOUR);
    }

    // If we filtered everything (e.g. only had WD4 and matching color), 
    // we technically "Can" play WD4 but it's risky. 
    // If candidates empty, revert to playableCards (bluffing AI).
    if (candidates.length === 0) {
        candidates = playableCards;
    }

    // Prioritize Actions
    const actionTypes: CardType[] = [CardType.SKIP, CardType.REVERSE, CardType.DRAW_TWO];
    const actions = candidates.filter(c => actionTypes.includes(c.type));
    if (actions.length > 0) {
        const card = actions[0];
        return {
            type: 'play',
            card,
            calledUno: willHaveOneCardLeft
        };
    }

    // Matches of Color/Value
    const regular = candidates.filter(c => c.type === CardType.NUMBER);
    if (regular.length > 0) {
        // Play highest value? Or random. Highest value is common basic strategy (get rid of points).
        // But UNO score is "sum of cards in opponents hands". 
        // Strategy: Get rid of MY high points? Yes.
        regular.sort((a, b) => (b.value || 0) - (a.value || 0));
        return {
            type: 'play',
            card: regular[0],
            calledUno: willHaveOneCardLeft
        };
    }

    // Wilds
    const wilds = candidates.filter(c => c.type === CardType.WILD || c.type === CardType.WILD_DRAW_FOUR);
    if (wilds.length > 0) {
        const card = wilds[0];
        // Choose color: Majority color in hand
        const colorCounts = {
            [CardColor.RED]: 0,
            [CardColor.YELLOW]: 0,
            [CardColor.GREEN]: 0,
            [CardColor.BLUE]: 0,
            [CardColor.NONE]: 0
        };
        player.hand.forEach(c => {
            if (c.color !== CardColor.NONE) colorCounts[c.color]++;
        });

        let bestColor: CardColor = CardColor.RED;
        let maxCount = -1;
        const colors = [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE];
        (colors as CardColor[]).forEach(c => {
            if (colorCounts[c] > maxCount) {
                maxCount = colorCounts[c];
                bestColor = c;
            }
        });

        return {
            type: 'play',
            card,
            chosenColor: bestColor,
            calledUno: willHaveOneCardLeft
        };
    }

    // Fallback?
    return { type: 'draw' };
};

/**
 * Checks for UNO interruptions/challenges
 */
export const checkAIChallenges = (gameState: GameState, aiPlayerId: string): Move | null => {
    // 1. Check if anyone has 1 card and !hasCalledUno
    for (const p of gameState.players) {
        if (p.id !== aiPlayerId && p.hand.length === 1 && !p.hasCalledUno) {
            return {
                type: 'challenge-uno',
                targetPlayerId: p.id
            };
        }
    }

    // 2. Check WD4 challenge opportunity? 
    // If pendingDrawCount >= 4, and I am the current player...
    // AI Logic: If I have color, I accept. If I don't, I *could* challenge if I suspect foul play.
    // Random challenge? 
    return null;
}
