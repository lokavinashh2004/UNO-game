import { describe, it, expect } from 'vitest';
import { CardColor, CardType, GamePhase } from './types.js';
import { initializeGame, executeMove, isValidMove } from './engine.js';

describe('UNO Game Engine', () => {
    it('initializes game correctly', () => {
        const state = initializeGame(['p1', 'p2']);
        expect(state.players.length).toBe(2);
        expect(state.players[0].hand.length).toBe(7);
        expect(state.players[1].hand.length).toBe(7);
        expect(state.drawPile.length).toBeGreaterThan(0);
        expect(state.discardPile.length).toBe(1);
        expect(state.gamePhase).toBe(GamePhase.PLAYING);
    });

    it('validates moves correctly', () => {
        const state = initializeGame(['p1', 'p2']);
        // Mock current state to be Green 5
        state.currentColor = CardColor.GREEN;
        state.currentCard = { id: 'test', type: CardType.NUMBER, color: CardColor.GREEN, value: 5 };

        // Valid moves
        expect(isValidMove(state, { id: '1', type: CardType.NUMBER, color: CardColor.GREEN, value: 1 })).toBe(true);
        expect(isValidMove(state, { id: '2', type: CardType.NUMBER, color: CardColor.RED, value: 5 })).toBe(true);
        expect(isValidMove(state, { id: '3', type: CardType.WILD, color: CardColor.NONE })).toBe(true);

        // Invalid moves
        expect(isValidMove(state, { id: '4', type: CardType.NUMBER, color: CardColor.RED, value: 1 })).toBe(false);
    });

    it('executes simple play move', () => {
        let state = initializeGame(['p1', 'p2']);
        // Force p1 hand
        const p1 = state.players[0];
        const cardToPlay = { id: 'playme', type: CardType.NUMBER, color: CardColor.BLUE, value: 1 };
        p1.hand = [cardToPlay, { id: 'other', type: CardType.NUMBER, color: CardColor.RED, value: 9 }];

        // Force state to match
        state.currentColor = CardColor.BLUE;
        state.currentPlayerIndex = 0;

        state = executeMove(state, { type: 'play', card: cardToPlay });

        expect(state.discardPile[state.discardPile.length - 1].id).toBe('playme');
        expect(state.players[0].hand.length).toBe(1);
        expect(state.currentPlayerIndex).toBe(1);
    });

    it('handles Draw Two stacking (simple add)', () => {
        let state = initializeGame(['p1', 'p2']);
        // Enable stacking
        state.settings.allowStacking = true;

        // Mock play
        const d2Card = { id: 'd2', type: CardType.DRAW_TWO, color: CardColor.BLUE };
        state.players[0].hand = [d2Card, { id: 'filler', type: CardType.NUMBER, color: CardColor.RED, value: 0 }];
        state.currentCard = { id: 'prev', type: CardType.DRAW_TWO, color: CardColor.BLUE };
        state.pendingDrawCount = 2; // Incoming attack

        state.currentColor = CardColor.BLUE;
        state.currentPlayerIndex = 0;

        state = executeMove(state, { type: 'play', card: d2Card });

        expect(state.pendingDrawCount).toBe(4);
        // Should advance to p2
        expect(state.currentPlayerIndex).toBe(1);
    });

    it('handles Draw -> Play flow', () => {
        let state = initializeGame(['p1', 'p2']);
        state.currentPlayerIndex = 0;
        state.currentColor = CardColor.RED;

        // Mock Deck to ensure Red 5 is drawn
        state.drawPile = [{ id: 'drawme', type: CardType.NUMBER, color: CardColor.RED, value: 5 }];

        // 1. Draw
        state = executeMove(state, { type: 'draw' });

        expect(state.turnPhase).toBe('after_draw');
        expect(state.drawnCard?.id).toBe('drawme');
        expect(state.currentPlayerIndex).toBe(0); // Player 0 still active

        // 2. Play drawn card
        const drawnCard = state.players[0].hand.find(c => c.id === 'drawme');
        expect(drawnCard).toBeDefined();

        state = executeMove(state, { type: 'play', card: drawnCard });

        expect(state.turnPhase).toBe('normal');
        expect(state.currentPlayerIndex).toBe(1); // Now advanced
        expect(state.discardPile[state.discardPile.length - 1].id).toBe('drawme');
    });

    it('handles Draw -> Pass flow', () => {
        let state = initializeGame(['p1', 'p2']);
        state.currentPlayerIndex = 0;
        state.currentColor = CardColor.RED;
        state.drawPile = [{ id: 'drawme', type: CardType.NUMBER, color: CardColor.RED, value: 5 }];

        // 1. Draw
        state = executeMove(state, { type: 'draw' });
        expect(state.turnPhase).toBe('after_draw');

        // 2. Pass
        state = executeMove(state, { type: 'pass' });

        expect(state.turnPhase).toBe('normal');
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.drawnCard).toBeNull();
    });

    it('handles Challenge (Guilty)', () => {
        let state = initializeGame(['p1', 'p2']);
        state.currentPlayerIndex = 1; // P2's turn to challenge
        state.pendingDrawCount = 4;
        state.currentCard = { id: 'wd4', type: CardType.WILD_DRAW_FOUR, color: CardColor.NONE };
        state.previousColor = CardColor.RED; // Previous color was RED

        // P1 (guilty) has RED card
        state.players[0].hand = [{ id: 'oops', type: CardType.NUMBER, color: CardColor.RED, value: 1 }];
        state.players[1].hand = []; // Challenger

        state = executeMove(state, { type: 'challenge' });

        // P1 draws 4
        expect(state.players[0].hand.length).toBe(5);
        // P2 keeps turn
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.pendingDrawCount).toBe(0);
    });

    it('handles Challenge (Innocent)', () => {
        let state = initializeGame(['p1', 'p2']);
        state.currentPlayerIndex = 1; // P2 challenges
        state.pendingDrawCount = 4;
        state.currentCard = { id: 'wd4', type: CardType.WILD_DRAW_FOUR, color: CardColor.NONE };
        state.previousColor = CardColor.RED;

        // P1 (innocent) has no RED
        state.players[0].hand = [{ id: 'ok', type: CardType.NUMBER, color: CardColor.BLUE, value: 1 }];
        state.players[1].hand = []; // Clear challenger hand

        state = executeMove(state, { type: 'challenge' });

        // P2 (Challenger) draws 6
        expect(state.players[1].hand.length).toBe(6);
        // Turn advances to P1 (since P2 lost turn)
        // Wait: P1 -> P2 (challenged) -> P1 (next)
        expect(state.currentPlayerIndex).toBe(0); // Back to P1?
        // Logic: P2 challenged P1.
        // Index 1 (P2) is current.
        // executeMove -> challenge
        // Innocent path: 
        // Next Player = getNext(1) = 0.
        // Since we have 2 players, it goes 1 -> 0. Correct.
    });

    it('handles Skip card', () => {
        let state = initializeGame(['p1', 'p2', 'p3']);
        const skipCard = { id: 'skip', type: CardType.SKIP, color: CardColor.BLUE };
        state.players[0].hand = [skipCard, { id: 'filler', type: CardType.NUMBER, color: CardColor.RED, value: 0 }];
        state.currentColor = CardColor.BLUE;
        state.currentPlayerIndex = 0;
        state.gamePhase = GamePhase.PLAYING; // Ensure playing

        state = executeMove(state, { type: 'play', card: skipCard });

        // Should skip p2 (index 1) and go to p3 (index 2)
        expect(state.currentPlayerIndex).toBe(2);
    });

    it('handles Wild card color choice', () => {
        let state = initializeGame(['p1', 'p2']);
        const wildCard = { id: 'wild', type: CardType.WILD, color: CardColor.NONE };
        state.players[0].hand = [wildCard, { id: 'filler', type: CardType.NUMBER, color: CardColor.RED, value: 0 }];
        state.players[1].hand = [{ id: 'other', type: CardType.NUMBER, color: CardColor.RED, value: 0 }];
        state.currentPlayerIndex = 0;

        state = executeMove(state, { type: 'play', card: wildCard, chosenColor: CardColor.GREEN });

        expect(state.currentColor).toBe(CardColor.GREEN);
        expect(state.currentPlayerIndex).toBe(1);
    });

    it('detects win condition', () => {
        let state = initializeGame(['p1', 'p2']);
        const winningCard = { id: 'win', type: CardType.NUMBER, color: CardColor.BLUE, value: 1 };
        state.players[0].hand = [winningCard];
        state.currentColor = CardColor.BLUE;

        state = executeMove(state, { type: 'play', card: winningCard });

        expect(state.gamePhase).toBe(GamePhase.GAME_OVER);
        expect(state.winnerId).toBe('p1');
    });
});
