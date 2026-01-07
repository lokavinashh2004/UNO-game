import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAnimation } from '../contexts/AnimationContext';
import { isValidPlay } from '../utils/rules';

export const useAI = () => {
    const { state, dispatch } = useGame();
    const { triggerAnimation } = useAnimation();
    const processingRef = useRef(false);

    const { currentPlayerIndex, players, discardPile, currentColor, status } = state;

    useEffect(() => {
        if (status !== 'playing') return;

        const currentPlayer = players[currentPlayerIndex];

        if (currentPlayer && currentPlayer.isAI && !processingRef.current) {
            processingRef.current = true; // Lock

            const playTurn = async () => {
                // Artificial think time
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

                const topCard = discardPile[discardPile.length - 1];
                let validCards = currentPlayer.hand.filter(card =>
                    isValidPlay(card, topCard, currentColor)
                );

                const getSelector = (index: number) => {
                    // Logic: 0=Bottom, 1=Left, 2=Top, 3=Right (Fixed for 4 players)
                    // If dynamic: Calculate relative to Human(0).
                    // For now assuming: 1=Left, 2=Top, 3=Right
                    if (index === 1) return '.position-left .player-avatar';
                    if (index === 2) return '.position-top .player-avatar';
                    if (index === 3) return '.position-right .player-avatar';
                    return '.player-avatar'; // Fallback
                };

                const aiSelector = getSelector(currentPlayerIndex);

                if (validCards.length > 0) {
                    // --- PLAYING ---
                    // Smartish choice: Keep Wilds for later?
                    // Simple: Random valid card
                    const chosenCard = validCards[Math.floor(Math.random() * validCards.length)];

                    // If Wild, choose random color
                    let chosenColor = undefined;
                    if (chosenCard.color === 'wild') {
                        const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
                        chosenColor = colors[Math.floor(Math.random() * 4)];
                    }

                    // Optional: Animate Play (Hand -> Center)? 
                    // Keeping it simple: Just dispatch.

                    dispatch({
                        type: 'PLAY_CARD',
                        payload: {
                            playerId: currentPlayer.id,
                            cardId: chosenCard.id,
                            selectedColor: chosenColor
                        }
                    });
                } else {
                    // --- DRAWING ---
                    // Animate Draw
                    const drawCount = (state.pendingDrawCount ?? 0) > 0 ? (state.pendingDrawCount ?? 0) : 1;
                    await triggerAnimation('draw', {
                        count: drawCount,
                        targetSelector: aiSelector
                    });

                    // Dispatch Draw
                    dispatch({
                        type: 'DRAW_CARD',
                        payload: { playerId: currentPlayer.id }
                    });

                    // Check if drawn card is playable (optimistic check, assuming engine updates or we check manually)
                    // Since context update is async, 'state' here might be stale IF we didn't await dispatch (but dispatch is sync usually in useReducer, but React batching...)
                    // Actually, easiest to just Pass for now to avoid state race condition in this simple AI.
                    // Improving: We can peek the deck? No, cheating.
                    // Just Pass.

                    setTimeout(() => {
                        dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } });
                    }, 500);
                }

                processingRef.current = false;
            };

            playTurn();
        } else if (currentPlayer && !currentPlayer.isAI) {
            processingRef.current = false; // Reset lock when it's human turn (safety)
        }

    }, [currentPlayerIndex, status, players, discardPile, currentColor, dispatch, triggerAnimation]);
};
