import React, { createContext, useContext, useReducer } from 'react';
import type { GameState, GameAction, Player, Card, CardColor } from '../types/game';
import { generateDeck, shuffleDeck } from '../utils/deckLogic';
import { getNextPlayerIndex } from '../utils/rules';

const initialState: GameState = {
    deck: [],
    discardPile: [],
    players: [],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: 'red',
    status: 'setup',
    winner: null,
    drawnCard: null,
};

const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
} | null>(null);

const gameReducer = (state: GameState, action: GameAction): GameState => {
    const ensureDeck = (currentDeck: Card[], currentDiscard: Card[]): { deck: Card[], discard: Card[] } => {
        if (currentDeck.length > 0) return { deck: currentDeck, discard: currentDiscard };
        if (currentDiscard.length <= 1) return { deck: currentDeck, discard: currentDiscard };
        const newDeck = shuffleDeck(currentDiscard.slice(0, currentDiscard.length - 1));
        const topCard = currentDiscard[currentDiscard.length - 1];
        return { deck: newDeck, discard: [topCard] };
    };

    switch (action.type) {
        case 'START_GAME': {
            const { playerCount } = action.payload;
            const fullDeck = generateDeck();

            const players: Player[] = Array.from({ length: playerCount }).map((_, i) => ({
                id: `player-${i}`,
                name: i === 0 ? 'You' : `CPU ${i}`,
                hand: [],
                isAI: i !== 0,
                isUno: false,
            }));

            players.forEach(p => {
                p.hand = fullDeck.splice(0, 7);
            });

            let startCard = fullDeck.pop()!;
            while (startCard.type === 'wild4') {
                fullDeck.unshift(startCard);
                startCard = fullDeck.pop()!;
            }

            const initialColor = (startCard.color === 'wild')
                ? (['red', 'blue', 'green', 'yellow'] as CardColor[])[Math.floor(Math.random() * 4)]
                : startCard.color;

            return {
                ...initialState,
                deck: fullDeck,
                discardPile: [startCard],
                players,
                currentPlayerIndex: 0,
                currentColor: initialColor,
                status: 'playing',
            };
        }

        case 'PLAY_CARD': {
            const { playerId, cardId, selectedColor } = action.payload;
            const playerIndex = state.players.findIndex(p => p.id === playerId);
            if (state.currentPlayerIndex !== playerIndex) return state;

            const player = state.players[playerIndex];
            const cardIndex = player.hand.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return state;

            const card = player.hand[cardIndex];
            const newHand = player.hand.filter(c => c.id !== cardId);

            if (newHand.length === 0) {
                const wonPlayers = [...state.players];
                wonPlayers[playerIndex] = { ...player, hand: [] };
                return { ...state, players: wonPlayers, status: 'game-over', winner: player };
            }

            let nextIndex = state.currentPlayerIndex;
            let nextDirection = state.direction;
            let nextColor = (card.color === 'wild') ? state.currentColor : card.color;

            if (card.color === 'wild' && selectedColor) {
                nextColor = selectedColor;
            } else if (card.color === 'wild' && player.isAI) {
                const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
                const counts = colors.map(c => player.hand.filter(h => h.color === c).length);
                const maxIdx = counts.indexOf(Math.max(...counts));
                nextColor = colors[maxIdx];
            }

            let deck = [...state.deck];
            let discard = [...state.discardPile, card];
            let players = [...state.players];
            players[playerIndex] = { ...player, hand: newHand, isUno: false };

            if (card.type === 'reverse') {
                if (players.length === 2) {
                    nextIndex = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
                    nextIndex = getNextPlayerIndex(nextIndex, nextDirection, players.length);
                } else {
                    nextDirection = (nextDirection * -1) as 1 | -1;
                    nextIndex = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
                }
            } else if (card.type === 'skip') {
                let victim = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
                nextIndex = getNextPlayerIndex(victim, nextDirection, players.length);
            } else if (card.type === 'draw2') {
                let victimIndex = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
                const { deck: d1, discard: disc1 } = ensureDeck(deck, discard);
                deck = d1; discard = disc1;

                const drawn = [];
                for (let i = 0; i < 2; i++) {
                    if (deck.length > 0) drawn.push(deck.pop()!);
                }

                players[victimIndex] = { ...players[victimIndex], hand: [...players[victimIndex].hand, ...drawn] };
                nextIndex = getNextPlayerIndex(victimIndex, nextDirection, players.length);
            } else if (card.type === 'wild4') {
                let victimIndex = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
                const { deck: d1, discard: disc1 } = ensureDeck(deck, discard);
                deck = d1; discard = disc1;

                const drawn = [];
                for (let i = 0; i < 4; i++) {
                    if (deck.length > 0) drawn.push(deck.pop()!);
                }

                players[victimIndex] = { ...players[victimIndex], hand: [...players[victimIndex].hand, ...drawn] };
                nextIndex = getNextPlayerIndex(victimIndex, nextDirection, players.length);
            } else {
                nextIndex = getNextPlayerIndex(state.currentPlayerIndex, nextDirection, players.length);
            }

            return {
                ...state,
                deck,
                discardPile: discard,
                players,
                currentPlayerIndex: nextIndex,
                direction: nextDirection,
                currentColor: nextColor,
                drawnCard: null,
            };
        }

        case 'DRAW_CARD': {
            const { playerId } = action.payload;
            if (state.players[state.currentPlayerIndex].id !== playerId) return state;

            let { deck, discard } = ensureDeck(state.deck, state.discardPile);
            if (deck.length === 0) return state;

            const card = deck.pop()!;
            const players = [...state.players];
            const pIndex = state.currentPlayerIndex;
            players[pIndex] = { ...players[pIndex], hand: [...players[pIndex].hand, card] };

            return {
                ...state,
                deck,
                discardPile: discard,
                players,
                drawnCard: card,
            };
        }

        case 'PASS_TURN': {
            const nextIndex = getNextPlayerIndex(state.currentPlayerIndex, state.direction, state.players.length);
            return { ...state, currentPlayerIndex: nextIndex, drawnCard: null };
        }

        case 'SET_COLOR': {
            return { ...state, currentColor: action.payload.color };
        }

        case 'CALL_UNO': {
            const { playerId } = action.payload;
            const pIndex = state.players.findIndex(p => p.id === playerId);
            if (pIndex === -1) return state;
            const players = [...state.players];
            players[pIndex] = { ...players[pIndex], isUno: true };
            return { ...state, players };
        }

        case 'RESET_GAME':
            return initialState;

        default:
            return state;
    }
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};
