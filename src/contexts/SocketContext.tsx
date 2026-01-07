import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Move } from '../logic/types';

// Types
interface RoomPlayer {
    id: string;
    name: string;
    isHost: boolean;
    socketId: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: RoomPlayer[];
    gameState: GameState | null;
    isHost: boolean;
    error: string | null;

    // Actions
    createRoom: (playerName: string) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
    joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
    startGame: () => Promise<{ success: boolean; error?: string }>;
    sendGameAction: (move: Move) => Promise<{ success: boolean; error?: string }>;
    leaveRoom: () => void;
    clearError: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [players, setPlayers] = useState<RoomPlayer[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('🔌 Connected to server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setError('Failed to connect to server');
        });

        // Game events
        newSocket.on('player_joined', (data: { players: RoomPlayer[]; newPlayer: RoomPlayer }) => {
            setPlayers(data.players);
        });

        newSocket.on('player_left', (data: { playerId: string; players: RoomPlayer[] }) => {
            setPlayers(data.players);
        });

        newSocket.on('game_started', (data: { gameState: GameState }) => {
            setGameState(data.gameState);
        });

        newSocket.on('game_state_updated', (data: { gameState: GameState }) => {
            setGameState(data.gameState);
        });

        newSocket.on('game_over', (data: { winnerId: string; winnerName: string }) => {
            console.log(`🎉 Game over! Winner: ${data.winnerName}`);
        });

        newSocket.on('game_paused', (data: { reason: string; players: RoomPlayer[] }) => {
            setPlayers(data.players);
            setError(`Game paused: ${data.reason}`);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const createRoom = useCallback(async (playerName: string): Promise<{ success: boolean; roomCode?: string; error?: string }> => {
        if (!socket) return { success: false, error: 'Not connected' };

        return new Promise((resolve) => {
            socket.emit('create_room', { playerName }, (response: any) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setIsHost(true);
                    setPlayers([{ id: response.playerId, name: playerName, isHost: true, socketId: socket.id || '' }]);
                    resolve({ success: true, roomCode: response.roomCode });
                } else {
                    setError(response.error);
                    resolve({ success: false, error: response.error });
                }
            });
        });
    }, [socket]);

    const joinRoom = useCallback(async (code: string, playerName: string): Promise<{ success: boolean; error?: string }> => {
        if (!socket) return { success: false, error: 'Not connected' };

        return new Promise((resolve) => {
            socket.emit('join_room', { roomCode: code, playerName }, (response: any) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setIsHost(false);
                    setPlayers(response.players);
                    resolve({ success: true });
                } else {
                    setError(response.error);
                    resolve({ success: false, error: response.error });
                }
            });
        });
    }, [socket]);

    const startGame = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (!socket || !roomCode) return { success: false, error: 'Not in a room' };

        return new Promise((resolve) => {
            socket.emit('start_game', { roomCode }, (response: any) => {
                if (response.success) {
                    resolve({ success: true });
                } else {
                    setError(response.error);
                    resolve({ success: false, error: response.error });
                }
            });
        });
    }, [socket, roomCode]);

    const sendGameAction = useCallback(async (move: Move): Promise<{ success: boolean; error?: string }> => {
        if (!socket || !roomCode) return { success: false, error: 'Not in a room' };

        return new Promise((resolve) => {
            socket.emit('game_action', { roomCode, move }, (response: any) => {
                if (response.success) {
                    resolve({ success: true });
                } else {
                    setError(response.error);
                    resolve({ success: false, error: response.error });
                }
            });
        });
    }, [socket, roomCode]);

    const leaveRoom = useCallback(() => {
        if (socket) {
            socket.emit('leave_room');
        }
        setRoomCode(null);
        setPlayerId(null);
        setPlayers([]);
        setGameState(null);
        setIsHost(false);
    }, [socket]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: SocketContextType = {
        socket,
        isConnected,
        roomCode,
        playerId,
        players,
        gameState,
        isHost,
        error,
        createRoom,
        joinRoom,
        startGame,
        sendGameAction,
        leaveRoom,
        clearError,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
