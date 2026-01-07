import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
    createRoom,
    getRoom,
    addPlayerToRoom,
    updateGameState,
    removePlayerFromRoom,
    deleteRoom,
    Room,
} from './db';

// ============================================================
// TYPES (Mirroring frontend types for server-side validation)
// ============================================================

const CardColor = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    NONE: 'none',
} as const;
type CardColor = (typeof CardColor)[keyof typeof CardColor];

const CardType = {
    NUMBER: 'number',
    SKIP: 'skip',
    REVERSE: 'reverse',
    DRAW_TWO: 'draw_two',
    WILD: 'wild',
    WILD_DRAW_FOUR: 'wild_draw_four',
} as const;
type CardType = (typeof CardType)[keyof typeof CardType];

interface Card {
    id: string;
    type: CardType;
    color: CardColor;
    value?: number;
}

interface Player {
    id: string;
    name: string;
    hand: Card[];
    isHuman: boolean;
    hasCalledUno: boolean;
    isSafe: boolean;
}

const GamePhase = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
} as const;
type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

const PlayDirection = {
    CLOCKWISE: 'clockwise',
    COUNTER_CLOCKWISE: 'counter_clockwise',
} as const;
type PlayDirection = (typeof PlayDirection)[keyof typeof PlayDirection];

interface GameState {
    players: Player[];
    currentPlayerIndex: number;
    playDirection: PlayDirection;
    drawPile: Card[];
    discardPile: Card[];
    currentColor: CardColor;
    previousColor?: CardColor;
    currentCard: Card | null;
    pendingDrawCount: number;
    gamePhase: GamePhase;
    winnerId: string | null;
    turnPhase: 'normal' | 'after_draw';
    drawnCard: Card | null;
    settings: {
        allowStacking: boolean;
    };
    lastAction?: string;
}

interface Move {
    type: 'play' | 'draw' | 'challenge' | 'challenge-uno' | 'pass';
    card?: Card;
    chosenColor?: CardColor;
    calledUno?: boolean;
    targetPlayerId?: string;
}

// ============================================================
// GAME ENGINE FUNCTIONS (Server-side implementation)
// ============================================================

const INITIAL_HAND_SIZE = 7;

const createDeck = (): Card[] => {
    const deck: Card[] = [];
    const colors: CardColor[] = [CardColor.RED, CardColor.YELLOW, CardColor.GREEN, CardColor.BLUE];

    for (const color of colors) {
        // One 0 per color
        deck.push({ id: uuidv4(), type: CardType.NUMBER, color, value: 0 });
        // Two of each 1-9
        for (let i = 1; i <= 9; i++) {
            deck.push({ id: uuidv4(), type: CardType.NUMBER, color, value: i });
            deck.push({ id: uuidv4(), type: CardType.NUMBER, color, value: i });
        }
        // Two of each action card
        for (let i = 0; i < 2; i++) {
            deck.push({ id: uuidv4(), type: CardType.SKIP, color });
            deck.push({ id: uuidv4(), type: CardType.REVERSE, color });
            deck.push({ id: uuidv4(), type: CardType.DRAW_TWO, color });
        }
    }

    // Wild cards
    for (let i = 0; i < 4; i++) {
        deck.push({ id: uuidv4(), type: CardType.WILD, color: CardColor.NONE });
        deck.push({ id: uuidv4(), type: CardType.WILD_DRAW_FOUR, color: CardColor.NONE });
    }

    return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getNextPlayerIndex = (
    currentIndex: number,
    playerCount: number,
    direction: PlayDirection
): number => {
    if (direction === PlayDirection.CLOCKWISE) {
        return (currentIndex + 1) % playerCount;
    } else {
        return (currentIndex - 1 + playerCount) % playerCount;
    }
};

const getPreviousPlayerIndex = (
    currentIndex: number,
    playerCount: number,
    direction: PlayDirection
): number => {
    if (direction === PlayDirection.CLOCKWISE) {
        return (currentIndex - 1 + playerCount) % playerCount;
    } else {
        return (currentIndex + 1) % playerCount;
    }
};

const drawCards = (
    gameState: GameState,
    count: number
): { cards: Card[]; newDeck: Card[]; newDiscard: Card[] } => {
    let deck = [...gameState.drawPile];
    let discard = [...gameState.discardPile];
    const drawnCards: Card[] = [];

    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            if (discard.length <= 1) break;
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

const initializeGame = (playerIds: string[], playerNames: string[]): GameState => {
    if (playerIds.length < 2) {
        throw new Error('UNO requires at least 2 players');
    }

    let deck = shuffleDeck(createDeck());
    const players: Player[] = playerIds.map((id, index) => ({
        id,
        name: playerNames[index] || `Player ${index + 1}`,
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
        players[0].hand.push(deck.pop()!);
        players[0].hand.push(deck.pop()!);
        currentPlayerIndex = 1;
    } else if (startCard.type === CardType.REVERSE) {
        if (players.length === 2) {
            currentPlayerIndex = 1;
        } else {
            playDirection = PlayDirection.COUNTER_CLOCKWISE;
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
        settings: { allowStacking: true },
    };
};

const isValidMove = (gameState: GameState, card: Card): boolean => {
    if (gameState.gamePhase !== GamePhase.PLAYING) return false;

    if (gameState.pendingDrawCount > 0) {
        if (!gameState.settings.allowStacking) return false;
        if (card.type === CardType.DRAW_TWO && gameState.currentCard?.type === CardType.DRAW_TWO)
            return true;
        if (
            card.type === CardType.WILD_DRAW_FOUR &&
            gameState.currentCard?.type === CardType.WILD_DRAW_FOUR
        )
            return true;
        return false;
    }

    if (gameState.turnPhase === 'after_draw') {
        return gameState.drawnCard ? card.id === gameState.drawnCard.id : false;
    }

    if (card.type === CardType.WILD || card.type === CardType.WILD_DRAW_FOUR) return true;
    if (card.color === gameState.currentColor) return true;
    if (
        gameState.currentCard &&
        card.type === CardType.NUMBER &&
        gameState.currentCard.type === CardType.NUMBER
    ) {
        if (card.value === gameState.currentCard.value) return true;
    }
    if (
        gameState.currentCard &&
        card.type === gameState.currentCard.type &&
        card.type !== CardType.NUMBER
    ) {
        return true;
    }

    return false;
};

const executeMove = (currentState: GameState, move: Move): GameState => {
    const newState: GameState = {
        ...currentState,
        players: currentState.players.map((p) => ({
            ...p,
            hand: [...p.hand],
        })),
        drawPile: [...currentState.drawPile],
        discardPile: [...currentState.discardPile],
    };

    const currentPlayer = newState.players[newState.currentPlayerIndex];

    // PASS ACTION
    if (move.type === 'pass') {
        if (newState.turnPhase !== 'after_draw') {
            return currentState;
        }
        newState.turnPhase = 'normal';
        newState.drawnCard = null;
        newState.currentPlayerIndex = getNextPlayerIndex(
            newState.currentPlayerIndex,
            newState.players.length,
            newState.playDirection
        );
        return newState;
    }

    // DRAW ACTION
    if (move.type === 'draw') {
        if (newState.turnPhase === 'after_draw') return currentState;

        const isPenalty = newState.pendingDrawCount > 0;
        const drawAmount = isPenalty ? newState.pendingDrawCount : 1;
        const { cards, newDeck, newDiscard } = drawCards(newState, drawAmount);

        newState.drawPile = newDeck;
        newState.discardPile = newDiscard;
        currentPlayer.hand.push(...cards);

        if (isPenalty) {
            newState.pendingDrawCount = 0;
            newState.currentPlayerIndex = getNextPlayerIndex(
                newState.currentPlayerIndex,
                newState.players.length,
                newState.playDirection
            );
        } else {
            const drawnOne = cards[0];
            if (isValidMove({ ...newState, turnPhase: 'normal' }, drawnOne)) {
                newState.turnPhase = 'after_draw';
                newState.drawnCard = drawnOne;
            } else {
                newState.currentPlayerIndex = getNextPlayerIndex(
                    newState.currentPlayerIndex,
                    newState.players.length,
                    newState.playDirection
                );
            }
        }

        return newState;
    }

    // CHALLENGE ACTION
    if (move.type === 'challenge') {
        if (
            newState.pendingDrawCount < 4 ||
            newState.currentCard?.type !== CardType.WILD_DRAW_FOUR
        ) {
            return currentState;
        }

        const prevPlayerIndex = getPreviousPlayerIndex(
            newState.currentPlayerIndex,
            newState.players.length,
            newState.playDirection
        );
        const prevPlayer = newState.players[prevPlayerIndex];
        const challengedColor = newState.previousColor || CardColor.RED;
        const hasMatch = prevPlayer.hand.some((c) => c.color === challengedColor);

        if (hasMatch) {
            const { cards, newDeck, newDiscard } = drawCards(newState, newState.pendingDrawCount);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            prevPlayer.hand.push(...cards);
            newState.pendingDrawCount = 0;
        } else {
            const { cards, newDeck, newDiscard } = drawCards(newState, newState.pendingDrawCount + 2);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            currentPlayer.hand.push(...cards);
            newState.pendingDrawCount = 0;
            newState.currentPlayerIndex = getNextPlayerIndex(
                newState.currentPlayerIndex,
                newState.players.length,
                newState.playDirection
            );
        }

        return newState;
    }

    // CHALLENGE UNO ACTION
    if (move.type === 'challenge-uno') {
        const targetId = move.targetPlayerId;
        const targetPlayer = newState.players.find((p) => p.id === targetId);

        if (!targetPlayer) return currentState;

        if (targetPlayer.hand.length === 1 && !targetPlayer.hasCalledUno) {
            const { cards, newDeck, newDiscard } = drawCards(newState, 2);
            newState.drawPile = newDeck;
            newState.discardPile = newDiscard;
            targetPlayer.hand.push(...cards);
            targetPlayer.hasCalledUno = false;
        }
        return newState;
    }

    // PLAY ACTION
    if (move.type === 'play' && move.card) {
        if (!isValidMove(newState, move.card)) {
            return currentState;
        }

        const cardIndex = currentPlayer.hand.findIndex((c) => c.id === move.card!.id);
        if (cardIndex === -1) {
            return currentState;
        }

        if (newState.turnPhase === 'after_draw') {
            newState.turnPhase = 'normal';
            newState.drawnCard = null;
        }

        const playedCard = currentPlayer.hand.splice(cardIndex, 1)[0];
        newState.discardPile.push(playedCard);

        if (playedCard.type === CardType.WILD_DRAW_FOUR) {
            newState.previousColor = newState.currentColor;
        } else {
            delete newState.previousColor;
        }

        newState.currentCard = playedCard;

        if (playedCard.type === CardType.WILD || playedCard.type === CardType.WILD_DRAW_FOUR) {
            newState.currentColor = move.chosenColor || CardColor.RED;
        } else {
            newState.currentColor = playedCard.color;
        }

        let skipNext = false;
        switch (playedCard.type) {
            case CardType.SKIP:
                skipNext = true;
                break;
            case CardType.REVERSE:
                if (newState.players.length === 2) {
                    skipNext = true;
                } else {
                    newState.playDirection =
                        newState.playDirection === PlayDirection.CLOCKWISE
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

        if (move.calledUno) {
            currentPlayer.hasCalledUno = true;
        }
        if (currentPlayer.hand.length !== 1) {
            currentPlayer.hasCalledUno = false;
        }

        if (currentPlayer.hand.length === 0) {
            newState.gamePhase = GamePhase.GAME_OVER;
            newState.winnerId = currentPlayer.id;
            return newState;
        }

        let nextIndex = getNextPlayerIndex(
            newState.currentPlayerIndex,
            newState.players.length,
            newState.playDirection
        );

        if (skipNext) {
            nextIndex = getNextPlayerIndex(nextIndex, newState.players.length, newState.playDirection);
        }

        newState.currentPlayerIndex = nextIndex;
    }

    return newState;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Track socket to room/player mapping
const socketToRoom = new Map<string, { roomCode: string; playerId: string }>();

// ============================================================
// SOCKET HANDLERS
// ============================================================

export const setupSocketHandlers = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // CREATE ROOM
        socket.on('create_room', async (data: { playerName: string }, callback) => {
            try {
                const roomCode = generateRoomCode();
                const playerId = uuidv4();

                const hostPlayer = {
                    id: playerId,
                    name: data.playerName || 'Host',
                    isHost: true,
                    socketId: socket.id,
                };

                await createRoom(roomCode, hostPlayer);

                socket.join(roomCode);
                socketToRoom.set(socket.id, { roomCode, playerId });

                callback({
                    success: true,
                    roomCode,
                    playerId,
                    shareableLink: `/room/${roomCode}`,
                });

                console.log(`🏠 Room created: ${roomCode} by ${data.playerName}`);
            } catch (error) {
                console.error('Error creating room:', error);
                callback({ success: false, error: 'Failed to create room' });
            }
        });

        // JOIN ROOM
        socket.on('join_room', async (data: { roomCode: string; playerName: string }, callback) => {
            try {
                const room = await getRoom(data.roomCode.toUpperCase());

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                if (room.status !== 'waiting') {
                    callback({ success: false, error: 'Game already in progress' });
                    return;
                }

                const playerId = uuidv4();
                const newPlayer = {
                    id: playerId,
                    name: data.playerName || `Player ${room.players.length + 1}`,
                    isHost: false,
                    socketId: socket.id,
                };

                const updatedRoom = await addPlayerToRoom(data.roomCode.toUpperCase(), newPlayer);

                socket.join(data.roomCode.toUpperCase());
                socketToRoom.set(socket.id, { roomCode: data.roomCode.toUpperCase(), playerId });

                callback({
                    success: true,
                    roomCode: data.roomCode.toUpperCase(),
                    playerId,
                    players: updatedRoom?.players || [],
                });

                // Notify all players in the room
                io.to(data.roomCode.toUpperCase()).emit('player_joined', {
                    players: updatedRoom?.players || [],
                    newPlayer,
                });

                console.log(`👤 ${data.playerName} joined room ${data.roomCode}`);
            } catch (error) {
                console.error('Error joining room:', error);
                callback({ success: false, error: 'Failed to join room' });
            }
        });

        // GET ROOM INFO
        socket.on('get_room_info', async (data: { roomCode: string }, callback) => {
            try {
                const room = await getRoom(data.roomCode.toUpperCase());

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                callback({
                    success: true,
                    room: {
                        code: room.code,
                        status: room.status,
                        players: room.players,
                        gameState: room.game_state,
                    },
                });
            } catch (error) {
                console.error('Error getting room info:', error);
                callback({ success: false, error: 'Failed to get room info' });
            }
        });

        // START GAME
        socket.on('start_game', async (data: { roomCode: string }, callback) => {
            try {
                const room = await getRoom(data.roomCode.toUpperCase());

                if (!room) {
                    callback({ success: false, error: 'Room not found' });
                    return;
                }

                if (room.players.length < 2) {
                    callback({ success: false, error: 'Need at least 2 players to start' });
                    return;
                }

                const mapping = socketToRoom.get(socket.id);
                if (!mapping) {
                    callback({ success: false, error: 'You are not in this room' });
                    return;
                }

                const hostPlayer = room.players.find((p: any) => p.isHost);
                if (!hostPlayer || hostPlayer.id !== mapping.playerId) {
                    callback({ success: false, error: 'Only the host can start the game' });
                    return;
                }

                // Initialize game state
                const playerIds = room.players.map((p: any) => p.id);
                const playerNames = room.players.map((p: any) => p.name);
                const gameState = initializeGame(playerIds, playerNames);

                await updateGameState(data.roomCode.toUpperCase(), gameState);

                callback({ success: true });

                // Broadcast game state to all players
                io.to(data.roomCode.toUpperCase()).emit('game_started', {
                    gameState,
                });

                console.log(`🎮 Game started in room ${data.roomCode}`);
            } catch (error) {
                console.error('Error starting game:', error);
                callback({ success: false, error: 'Failed to start game' });
            }
        });

        // GAME ACTION
        socket.on('game_action', async (data: { roomCode: string; move: Move }, callback) => {
            try {
                const room = await getRoom(data.roomCode.toUpperCase());

                if (!room || !room.game_state) {
                    callback({ success: false, error: 'Game not found' });
                    return;
                }

                const mapping = socketToRoom.get(socket.id);
                if (!mapping) {
                    callback({ success: false, error: 'You are not in this room' });
                    return;
                }

                const currentState = room.game_state as GameState;
                const currentPlayerId = currentState.players[currentState.currentPlayerIndex].id;

                if (mapping.playerId !== currentPlayerId) {
                    callback({ success: false, error: 'Not your turn' });
                    return;
                }

                const newState = executeMove(currentState, data.move);

                // Check if state actually changed (move was valid)
                if (newState === currentState) {
                    callback({ success: false, error: 'Invalid move' });
                    return;
                }

                await updateGameState(data.roomCode.toUpperCase(), newState);

                callback({ success: true });

                // Broadcast new state to all players
                io.to(data.roomCode.toUpperCase()).emit('game_state_updated', {
                    gameState: newState,
                });

                if (newState.gamePhase === GamePhase.GAME_OVER) {
                    io.to(data.roomCode.toUpperCase()).emit('game_over', {
                        winnerId: newState.winnerId,
                        winnerName: newState.players.find((p) => p.id === newState.winnerId)?.name,
                    });
                }
            } catch (error) {
                console.error('Error processing game action:', error);
                callback({ success: false, error: 'Failed to process action' });
            }
        });

        // LEAVE ROOM
        socket.on('leave_room', async () => {
            await handlePlayerLeave(socket, io);
        });

        // DISCONNECT
        socket.on('disconnect', async () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            await handlePlayerLeave(socket, io);
        });
    });
};

const handlePlayerLeave = async (socket: Socket, io: Server) => {
    const mapping = socketToRoom.get(socket.id);
    if (!mapping) return;

    const { roomCode, playerId } = mapping;

    try {
        const updatedRoom = await removePlayerFromRoom(roomCode, playerId);

        socketToRoom.delete(socket.id);
        socket.leave(roomCode);

        if (updatedRoom) {
            // Room still has players
            io.to(roomCode).emit('player_left', {
                playerId,
                players: updatedRoom.players,
            });

            // If game was in progress, you might want to pause or handle differently
            if (updatedRoom.status === 'playing' && updatedRoom.game_state) {
                // Optionally reassign turns or mark player as disconnected
                io.to(roomCode).emit('game_paused', {
                    reason: 'Player left',
                    players: updatedRoom.players,
                });
            }

            console.log(`👋 Player ${playerId} left room ${roomCode}`);
        } else {
            // Room was deleted (no players left)
            console.log(`🗑️ Room ${roomCode} deleted (empty)`);
        }
    } catch (error) {
        console.error('Error handling player leave:', error);
    }
};
