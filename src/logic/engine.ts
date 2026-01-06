import type { Card, GameState, Player, Move } from './types.js';
import { CardColor, CardType, GamePhase, PlayDirection } from './types.js';
import { createDeck, shuffleDeck } from './deck.js';

const INITIAL_HAND_SIZE = 7;

// --- Helper Functions ---

export const getNextPlayerIndex = (currentIndex: number, playerCount: number, direction: PlayDirection): number => {
    if (direction === PlayDirection.CLOCKWISE) {
        return (currentIndex + 1) % playerCount;
    } else {
        return (currentIndex - 1 + playerCount) % playerCount;
    }
};

const getPreviousPlayerIndex = (currentIndex: number, playerCount: number, direction: PlayDirection): number => {
    if (direction === PlayDirection.CLOCKWISE) {
        return (currentIndex - 1 + playerCount) % playerCount;
    } else {
        return (currentIndex + 1) % playerCount;
    }
};

/**
 * Handles drawing cards from the deck.
 * Reshuffles discard pile if deck is empty.
 */
const drawCards = (gameState: GameState, count: number): { cards: Card[], newDeck: Card[], newDiscard: Card[] } => {
    let deck = [...gameState.drawPile];
    let discard = [...gameState.discardPile];
    const drawnCards: Card[] = [];

    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            if (discard.length <= 1) {
                // Rare: No cards left to shuffle
                break;
            }
            // Recycle discard (keep top card)
            const topCard = discard.pop()!;
            deck = shuffleDeck(discard);
            discard = [topCard];
        }
        if (deck.length > 0) {
            drawnCards.push(deck.pop()!);
        }
    }
    return { cards: drawnCards, newDeck: deck, newDiscard: discard };
};


// --- Core Engine ---

/**
 * Initializes a new game state.
 */
export const initializeGame = (playerIds: string[]): GameState => {
    if (playerIds.length < 2) {
        throw new Error('UNO requires at least 2 players');
    }

    let deck = shuffleDeck(createDeck());
    const players: Player[] = playerIds.map((id) => ({
        id,
        name: `Player ${id}`,
        hand: [],
        isHuman: true,
        hasCalledUno: false,
        isSafe: false,
    }));

    // Deal 7 cards
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
        players.forEach((player) => {
            if (deck.length === 0) throw new Error('Not enough cards');
            player.hand.push(deck.pop()!);
        });
    }

    // Determine valid start card
    let startCard = deck.pop()!;
    while (startCard.type === CardType.WILD || startCard.type === CardType.WILD_DRAW_FOUR) {
        deck.push(startCard);
        deck = shuffleDeck(deck);
        startCard = deck.pop()!;
    }

    const discardPile = [startCard];
    let currentColor = startCard.color;
    let playDirection: PlayDirection = PlayDirection.CLOCKWISE;
    let currentPlayerIndex = 0;
    let pendingDrawCount = 0;

    // Handle first card effects
    if (startCard.type === CardType.DRAW_TWO) {
        pendingDrawCount = 2; // Rule: Player 0 splits draw logic or immediate? 
        // Simplified: Player 0 starts with pending draw 2.
        // Official: "Player to left of dealer draws 2 cards and misses turn."
        // Since we start at 0, we can apply this:
        players[0].hand.push(deck.pop()!);
        players[0].hand.push(deck.pop()!);
        currentPlayerIndex = 1;
        pendingDrawCount = 0;
    } else if (startCard.type === CardType.REVERSE) {
        if (players.length === 2) {
            currentPlayerIndex = 1; // Skip dealer
        } else {
            playDirection = PlayDirection.COUNTER_CLOCKWISE as PlayDirection;
            // Turn stays at 0 (Dealer would have played, but 0 is usually "start").
            // Let's stick to: 0 is the first player to ACT.
            // If Reverse: Direction flips. Player 0 still acts?
            // Official: "Dealer goes first, play moves to the right". 
            // This implies the player who WOULD have gone first (0) is replaced by Dealer?
            // Let's stick to a simple interpretation:
            // Reverse at start: Player 0 plays, but direction is CCW.
            playDirection = PlayDirection.COUNTER_CLOCKWISE as PlayDirection;
        }
    } else if (startCard.type === CardType.SKIP) {
        currentPlayerIndex = 1;
    }

    return {
        players,
        currentPlayerIndex: currentPlayerIndex % players.length,
        playDirection,
        drawPile: deck,
        discardPile,
        currentColor,
        currentCard: startCard,
        pendingDrawCount,
        gamePhase: GamePhase.PLAYING,
        winnerId: null,
        turnPhase: 'normal',
        drawnCard: null,
        settings: { allowStacking: true }, // Default to true or make configurable argument
    };
};

/**
 * Validates if a card can be played.
 */
export const isValidMove = (gameState: GameState, card: Card): boolean => {
    if (gameState.gamePhase !== GamePhase.PLAYING) return false;

    // 1. Pending Draw Constraint
    if (gameState.pendingDrawCount > 0) {
        if (!gameState.settings.allowStacking) return false;

        // Use strict check: Must be Draw 2 on Draw 2, or WD4 on WD4?
        // Common House Rule: "Stacking" usually means Play a +2 on a +2.
        // Or Play a +4 on a +4.
        // Can you play a +4 on a +2? Usually yes.
        // Can you play a +2 on a +4? Usually no.
        // Let's implement SAFE Stacking: SAME TYPE only.
        if (card.type === CardType.DRAW_TWO && gameState.currentCard?.type === CardType.DRAW_TWO) return true;
        if (card.type === CardType.WILD_DRAW_FOUR && gameState.currentCard?.type === CardType.WILD_DRAW_FOUR) return true;

        return false;
    }

    // 2. After Draw Constraint
    if (gameState.turnPhase === 'after_draw') {
        // Can ONLY play the card that was just drawn.
        return gameState.drawnCard ? card.id === gameState.drawnCard.id : false;
    }

    // 3. Normal Play Validation (Matching)
    if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) return true;

    if (card.color === gameState.currentColor) return true;

    if (gameState.currentCard && card.type === CardType.NUMBER && gameState.currentCard.type === CardType.NUMBER) {
        if (card.value === gameState.currentCard.value) return true;
    }

    // Match Symbol/Type (e.g. Skip on Skip, draw 2 on draw 2)
    if (gameState.currentCard && card.type === gameState.currentCard.type && card.type !== CardType.NUMBER) {
        return true;
    }

    return false;
};

/**
 * Executes a move (Play, Draw, or Challenge).
 * Returns a NEW GameState object.
 */
export const executeMove = (currentState: GameState, move: Move): GameState => {
    const newState: GameState = {
        ...currentState,
        players: currentState.players.map(p => ({
            ...p,
            hand: [...p.hand]
        })),
        drawPile: [...currentState.drawPile],
        discardPile: [...currentState.discardPile]
    };

    const currentPlayer = newState.players[newState.currentPlayerIndex];

    // --- PASS ACTION ---
    if (move.type === 'pass') {
        if (newState.turnPhase !== 'after_draw') {
            console.warn("Cannot pass unless in 'after_draw' phase.");
            return currentState;
        }

        newState.turnPhase = 'normal';
        newState.drawnCard = null;
        newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);
        return newState;
    }

    // --- DRAW ACTION ---
    if (move.type === 'draw') {
        // Validation: Cannot draw if already in after_draw (must pass or play)
        if (newState.turnPhase === 'after_draw') return currentState;

        const isPenalty = newState.pendingDrawCount > 0;
        const drawAmount = isPenalty ? newState.pendingDrawCount : 1;
        const { cards, newDeck, newDiscard } = drawCards(newState, drawAmount);

        newState.drawPile = newDeck;
        newState.discardPile = newDiscard;
        currentPlayer.hand.push(...cards);

        if (isPenalty) {
            // Absorbed penalty -> Turn Ends
            newState.pendingDrawCount = 0;
            newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);
        } else {
            // Normal Draw
            const drawnOne = cards[0];
            // Check if playable
            if (isValidMove({ ...newState, turnPhase: 'normal' }, drawnOne)) {
                // Playable? Enter 'after_draw' phase
                newState.turnPhase = 'after_draw';
                newState.drawnCard = drawnOne;
                // Turn DOES NOT advance yet.
            } else {
                // Not playable? Turn Ends.
                newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);
            }
        }

        return newState;
    }

    // --- CHALLENGE ACTION ---
    if (move.type === 'challenge') {
        // Can only challenge if WD4 was just played (pendingDrawCount >= 4 and current card is WD4)
        if (newState.pendingDrawCount < 4 || newState.currentCard?.type !== CardType.WILD_DRAW_FOUR) {
            console.error("Invalid challenge.");
            return currentState;
        }

        const prevPlayerIndex = getPreviousPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);
        const prevPlayer = newState.players[prevPlayerIndex];

        // Challenge Logic: Check if prevPlayer has card matching the PREVIOUS color
        // We stored `previousColor` in state
        const challengedColor = newState.previousColor || CardColor.RED; // Fallback

        const hasMatch = prevPlayer.hand.some(c => c.color === challengedColor);

        if (hasMatch) {
            // GUILTY
            // Prev player draws 4 (the pending count). 
            // We use the pending count because it might be STACKED (e.g. 8).
            const { cards, newDeck, newDiscard } = drawCards(newState, newState.pendingDrawCount);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            prevPlayer.hand.push(...cards);

            newState.pendingDrawCount = 0; // Cleared

            // Challenger (current player) keeps turn!
            // Do NOT advance index.

        } else {
            // INNOCENT
            // Challenger draws 6 (pending + 2 penalty)
            const { cards, newDeck, newDiscard } = drawCards(newState, newState.pendingDrawCount + 2);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            currentPlayer.hand.push(...cards);

            newState.pendingDrawCount = 0;

            // Challenger loses turn
            newState.currentPlayerIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);
        }

        return newState;
    }

    // --- CHALLENGE UNO ACTION ---
    if (move.type === 'challenge-uno') {
        const targetId = move.targetPlayerId;
        const targetPlayer = newState.players.find(p => p.id === targetId);

        if (!targetPlayer) return currentState;

        // Condition: Player has 1 card AND has NOT called Uno
        if (targetPlayer.hand.length === 1 && !targetPlayer.hasCalledUno) {
            // Apply Penalty: Draw 2
            const { cards, newDeck, newDiscard } = drawCards(newState, 2);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            targetPlayer.hand.push(...cards);

            // "Uno" flag logic reset? They have > 1 card now.
            targetPlayer.hasCalledUno = false;
        }
        return newState;
    }

    // --- PLAY ACTION ---
    if (move.type === 'play' && move.card) {
        if (!isValidMove(newState, move.card)) {
            return currentState;
        }

        const cardIndex = currentPlayer.hand.findIndex(c => c.id === move.card!.id);
        if (cardIndex === -1) {
            return currentState;
        }

        // Cleanup 'after_draw' state if satisfying it
        if (newState.turnPhase === 'after_draw') {
            newState.turnPhase = 'normal';
            newState.drawnCard = null;
        }

        const playedCard = currentPlayer.hand.splice(cardIndex, 1)[0];
        newState.discardPile.push(playedCard);

        // Capture specific state BEFORE updating color (for Challenge)
        if (playedCard.type === CardType.WILD_DRAW_FOUR) {
            newState.previousColor = newState.currentColor;
        } else {
            delete newState.previousColor; // Reset if not a WD4
        }

        newState.currentCard = playedCard;

        // Update Color
        if (playedCard.type === CardType.WILD || playedCard.type === CardType.WILD_DRAW_FOUR) {
            newState.currentColor = move.chosenColor || CardColor.RED;
        } else {
            newState.currentColor = playedCard.color;
        }

        // Apply Effects
        let skipNext = false;
        switch (playedCard.type) {
            case CardType.SKIP:
                skipNext = true;
                break;
            case CardType.REVERSE:
                if (newState.players.length === 2) {
                    skipNext = true;
                } else {
                    newState.playDirection = newState.playDirection === PlayDirection.CLOCKWISE
                        ? PlayDirection.COUNTER_CLOCKWISE
                        : PlayDirection.CLOCKWISE;
                }
                break;
            case CardType.DRAW_TWO:
                newState.pendingDrawCount += 2;
                break;
            case CardType.WILD_DRAW_FOUR:
                newState.pendingDrawCount += 4;
                break;
        }

        // UNO Call Check
        if (move.calledUno) {
            currentPlayer.hasCalledUno = true;
        }
        // If dropping to 1 card and NOT calling Uno, flag is reset/ignored
        if (currentPlayer.hand.length !== 1) {
            currentPlayer.hasCalledUno = false;
        }

        // Win Check
        if (currentPlayer.hand.length === 0) {
            newState.gamePhase = GamePhase.GAME_OVER;
            newState.winnerId = currentPlayer.id;
            return newState;
        }

        // Advance Turn
        let nextIndex = getNextPlayerIndex(newState.currentPlayerIndex, newState.players.length, newState.playDirection);

        if (skipNext) {
            nextIndex = getNextPlayerIndex(nextIndex, newState.players.length, newState.playDirection);
        }

        newState.currentPlayerIndex = nextIndex;
    }

    return newState;
};
