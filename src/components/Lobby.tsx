import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import './Lobby.css';

const Lobby: React.FC = () => {
    const {
        isConnected,
        roomCode,
        players,
        isHost,
        error,
        createRoom,
        joinRoom,
        startGame,
        leaveRoom,
        clearError,
    } = useSocket();

    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [view, setView] = useState<'home' | 'create' | 'join'>('home');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRoom = async () => {
        if (!playerName.trim()) return;
        setIsLoading(true);
        const result = await createRoom(playerName.trim());
        setIsLoading(false);
        if (!result.success) {
            console.error('Failed to create room:', result.error);
        }
    };

    const handleJoinRoom = async () => {
        if (!playerName.trim() || !joinCode.trim()) return;
        setIsLoading(true);
        const result = await joinRoom(joinCode.trim(), playerName.trim());
        setIsLoading(false);
        if (!result.success) {
            console.error('Failed to join room:', result.error);
        }
    };

    const handleStartGame = async () => {
        setIsLoading(true);
        const result = await startGame();
        setIsLoading(false);
        if (!result.success) {
            console.error('Failed to start game:', result.error);
        }
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/room/${roomCode}`;
        navigator.clipboard.writeText(link);
    };

    // If in a room, show the lobby screen
    if (roomCode) {
        return (
            <div className="lobby-container">
                <div className="lobby-card room-lobby">
                    <h1 className="lobby-title">Room: {roomCode}</h1>

                    <div className="share-section">
                        <p className="share-label">Share this link with friends:</p>
                        <div className="share-link-container">
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/room/${roomCode}`}
                                className="share-link-input"
                            />
                            <button onClick={copyRoomLink} className="copy-btn">
                                📋 Copy
                            </button>
                        </div>
                    </div>

                    <div className="players-section">
                        <h2 className="players-title">Players ({players.length}/4)</h2>
                        <ul className="players-list">
                            {players.map((player) => (
                                <li key={player.id} className="player-item">
                                    <span className="player-name">{player.name}</span>
                                    {player.isHost && <span className="host-badge">HOST</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {error && (
                        <div className="error-message" onClick={clearError}>
                            {error} (click to dismiss)
                        </div>
                    )}

                    <div className="lobby-actions">
                        {isHost && (
                            <button
                                onClick={handleStartGame}
                                disabled={players.length < 2 || isLoading}
                                className="btn btn-primary btn-start"
                            >
                                {isLoading ? 'Starting...' : 'Start Game'}
                            </button>
                        )}
                        {!isHost && (
                            <p className="waiting-text">Waiting for host to start the game...</p>
                        )}
                        <button onClick={leaveRoom} className="btn btn-secondary btn-leave">
                            Leave Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Home screen
    if (view === 'home') {
        return (
            <div className="lobby-container">
                <div className="lobby-card">
                    <h1 className="lobby-title">🎴 UNO</h1>
                    <p className="lobby-subtitle">Multiplayer Card Game</p>

                    {!isConnected && (
                        <p className="connection-status">⚠️ Connecting to server...</p>
                    )}

                    <div className="lobby-buttons">
                        <button
                            onClick={() => setView('create')}
                            disabled={!isConnected}
                            className="btn btn-primary"
                        >
                            Create Room
                        </button>
                        <button
                            onClick={() => setView('join')}
                            disabled={!isConnected}
                            className="btn btn-secondary"
                        >
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Create room screen
    if (view === 'create') {
        return (
            <div className="lobby-container">
                <div className="lobby-card">
                    <h1 className="lobby-title">Create Room</h1>

                    <div className="input-group">
                        <label htmlFor="playerName">Your Name</label>
                        <input
                            id="playerName"
                            type="text"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            className="text-input"
                        />
                    </div>

                    {error && (
                        <div className="error-message" onClick={clearError}>
                            {error}
                        </div>
                    )}

                    <div className="lobby-buttons">
                        <button
                            onClick={handleCreateRoom}
                            disabled={!playerName.trim() || isLoading}
                            className="btn btn-primary"
                        >
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                        <button onClick={() => setView('home')} className="btn btn-secondary">
                            Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Join room screen
    if (view === 'join') {
        return (
            <div className="lobby-container">
                <div className="lobby-card">
                    <h1 className="lobby-title">Join Room</h1>

                    <div className="input-group">
                        <label htmlFor="playerName">Your Name</label>
                        <input
                            id="playerName"
                            type="text"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            className="text-input"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="roomCode">Room Code</label>
                        <input
                            id="roomCode"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="text-input room-code-input"
                        />
                    </div>

                    {error && (
                        <div className="error-message" onClick={clearError}>
                            {error}
                        </div>
                    )}

                    <div className="lobby-buttons">
                        <button
                            onClick={handleJoinRoom}
                            disabled={!playerName.trim() || !joinCode.trim() || isLoading}
                            className="btn btn-primary"
                        >
                            {isLoading ? 'Joining...' : 'Join'}
                        </button>
                        <button onClick={() => setView('home')} className="btn btn-secondary">
                            Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Lobby;
