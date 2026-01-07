import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAnimation } from '../contexts/AnimationContext';
import Hand from './Hand';
import Card from './Card';
import ColorPicker from './UI/ColorPicker';
import { useAI } from '../hooks/useAI';
import type { CardColor } from '../types/game';
import './GameBoard.css';

const GameBoard: React.FC = () => {
    const { state, dispatch } = useGame();
    const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
    const [isDealing, setIsDealing] = useState(false);
    const dealAnimationPlayed = React.useRef(false); // Ref to track if animation played

    const { triggerAnimation, isAnimating } = useAnimation(); // Hook for animations

    React.useEffect(() => {
        const playDealAnimation = async () => {
            if (state.status === 'playing' && !dealAnimationPlayed.current) {
                dealAnimationPlayed.current = true;
                setIsDealing(true);

                // Target selectors for all players (assuming standard 4 player layout or dynamic)
                // We fly 7 cards to each player.
                // Batch per player
                const animations = [];

                // Human (Bottom)
                animations.push(triggerAnimation('draw', { count: 7, targetSelector: '.position-bottom .player-avatar' }));

                // Left
                if (state.players.length > 1) {
                    animations.push(triggerAnimation('draw', { count: 7, targetSelector: '.position-left .player-avatar' }));
                }

                // Top
                if (state.players.length > 2) {
                    animations.push(triggerAnimation('draw', { count: 7, targetSelector: '.position-top .player-avatar' }));
                }

                // Right
                if (state.players.length > 3) {
                    animations.push(triggerAnimation('draw', { count: 7, targetSelector: '.position-right .player-avatar' }));
                }

                await Promise.all(animations);
                setIsDealing(false);
            }
        };

        playDealAnimation();
    }, [state.status, state.players.length, triggerAnimation]);

    // Initialize AI hook
    useAI();

    if (state.status === 'setup' || state.status === 'game-over') {
        return (
            <div className="menu-screen">
                <h1>UNO</h1>
                {state.status === 'game-over' && (
                    <h2>Winner: {state.winner?.name}!</h2>
                )}
                <button
                    className="btn-start"
                    onClick={() => dispatch({ type: 'START_GAME', payload: { playerCount: 4 } })}
                >
                    {state.status === 'game-over' ? 'Play Again' : 'Start Game (4 Players)'}
                </button>
            </div>
        );
    }

    const humanPlayer = state.players[0];
    const topPlayer = state.players.length > 2 ? state.players[2] : null;
    const leftPlayer = state.players[1];
    const rightPlayer = state.players.length > 3 ? state.players[3] : (state.players.length === 3 ? state.players[2] : null);

    const topCard = state.discardPile[state.discardPile.length - 1];

    // Calculate playable cards for human
    const playableCards = new Set<string>();
    if (state.currentPlayerIndex === 0) {
        humanPlayer.hand.forEach(c => {
            // Explicit casting or broader check to satisfy TS
            const isWild = (c.color as string) === 'wild';
            const matchesColor = c.color === state.currentColor;
            const matchesType = c.type === topCard.type;
            const matchesValue = c.type === 'number' && c.value === topCard.value && topCard.type === 'number';

            if (isWild || matchesColor || (matchesType && !isWild) || matchesValue) {
                playableCards.add(c.id);
            }
        });
    }

    const handleDraw = async () => {
        if (state.currentPlayerIndex === 0 && !state.drawnCard && !isAnimating) {
            // 1. Trigger Visuals
            await triggerAnimation('draw', {
                count: 1,
                targetSelector: '.position-bottom .player-avatar' // Target Human
            });

            // 2. Dispatch Game Logic
            dispatch({ type: 'DRAW_CARD', payload: { playerId: humanPlayer.id } });
        }
    };

    const handlePlay = (cardId: string) => {
        const card = humanPlayer.hand.find(c => c.id === cardId);
        if (!card) return;

        if (card.color === 'wild') {
            setPendingWildCardId(cardId);
        } else {
            dispatch({ type: 'PLAY_CARD', payload: { playerId: humanPlayer.id, cardId } });
        }
    };

    const handleColorSelect = (color: CardColor) => {
        if (pendingWildCardId) {
            dispatch({
                type: 'PLAY_CARD',
                payload: {
                    playerId: humanPlayer.id,
                    cardId: pendingWildCardId,
                    selectedColor: color
                }
            });
            setPendingWildCardId(null);
        }
    };

    const handlePass = () => {
        dispatch({ type: 'PASS_TURN', payload: { playerId: humanPlayer.id } });
    };

    return (
        <div className="game-board">
            {/* Top Player (P2) */}
            <div className="position-top">
                {state.players.length > 2 && topPlayer && (
                    <>
                        <div className={`player-avatar ${state.currentPlayerIndex === 2 ? 'active' : ''}`}>
                            {topPlayer.name} ({topPlayer.hand.length})
                            {topPlayer.isUno && <span className="uno-badge">UNO!</span>}
                        </div>
                        <Hand cards={isDealing ? [] : topPlayer.hand} isCurrentPlayer={false} />
                    </>
                )}
                {state.players.length === 2 && (
                    <>
                        <div className={`player-avatar ${state.currentPlayerIndex === 1 ? 'active' : ''}`}>
                            {state.players[1].name} ({state.players[1].hand.length})
                        </div>
                        <Hand cards={isDealing ? [] : state.players[1].hand} isCurrentPlayer={false} />
                    </>
                )}
            </div>

            {/* Left Player (P1) */}
            <div className="position-left">
                {state.players.length > 2 && (
                    <>
                        <div className={`player-avatar ${state.currentPlayerIndex === 1 ? 'active' : ''}`}>
                            {leftPlayer.name} ({leftPlayer.hand.length})
                            {leftPlayer.isUno && <span className="uno-badge">UNO!</span>}
                        </div>
                        <Hand cards={isDealing ? [] : leftPlayer.hand} isCurrentPlayer={false} />
                    </>
                )}
            </div>

            {/* Center Area */}
            <div className="center-area">
                <div className="deck-area">
                    <div className="discard-pile">
                        <Card card={topCard} />
                    </div>
                    <div className={`draw-pile ${state.currentPlayerIndex === 0 && !state.drawnCard ? 'active' : ''}`} onClick={handleDraw}>
                        <Card card={{ id: 'draw', color: 'wild', type: 'wild' }} isHidden={true} />
                    </div>
                </div>

                <div className="game-info">
                    <div className={`color-indicator ${state.currentColor}`}></div>
                    <div>Turn: {state.players[state.currentPlayerIndex].name}</div>
                    {state.currentPlayerIndex === 0 && state.drawnCard && (
                        <button className="btn-pass" onClick={handlePass}>Pass Turn</button>
                    )}
                    <div>{state.direction === 1 ? '↻' : '↺'}</div>
                    <button
                        className={`uno-btn ${humanPlayer.hand.length === 2 ? 'visible' : ''}`}
                        onClick={() => dispatch({ type: 'CALL_UNO', payload: { playerId: humanPlayer.id } })}
                    >
                        UNO!
                    </button>
                </div>
            </div>

            {/* Right Player (P3) */}
            <div className="position-right">
                {state.players.length > 3 && rightPlayer && (
                    <>
                        <div className={`player-avatar ${state.currentPlayerIndex === 3 ? 'active' : ''}`}>
                            {rightPlayer.name} ({rightPlayer.hand.length})
                            {rightPlayer.isUno && <span className="uno-badge">UNO!</span>}
                        </div>
                        <Hand cards={isDealing ? [] : rightPlayer.hand} isCurrentPlayer={false} />
                    </>
                )}
            </div>

            {/* Bottom (Human) Player */}
            <div className="position-bottom">
                <div className={`player-avatar ${state.currentPlayerIndex === 0 ? 'active' : ''}`}>
                    You {humanPlayer.isUno && <span className="uno-badge">UNO!</span>}
                </div>
                <Hand
                    cards={isDealing ? [] : humanPlayer.hand}
                    isCurrentPlayer={true}
                    playableCards={state.currentPlayerIndex === 0 ? playableCards : undefined}
                    onPlayCard={handlePlay}
                />
            </div>

            {pendingWildCardId && (
                <ColorPicker onSelect={handleColorSelect} onCancel={() => setPendingWildCardId(null)} />
            )}
        </div>
    );
};

export default GameBoard;
