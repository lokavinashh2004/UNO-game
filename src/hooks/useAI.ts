import { useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { isValidPlay } from '../utils/rules';

export const useAI = () => {
    const { state, dispatch } = useGame();
    const { currentPlayerIndex, players, discardPile, currentColor, status } = state;

    useEffect(() => {
        if (status !== 'playing') return;

        const currentPlayer = players[currentPlayerIndex];

        if (currentPlayer && currentPlayer.isAI) {
            const timer = setTimeout(() => {
                // AI Logic
                // 1. Find all valid cards
                const topCard = discardPile[discardPile.length - 1];
                const validCards = currentPlayer.hand.filter(card =>
                    isValidPlay(card, topCard, currentColor)
                );

                if (validCards.length > 0) {
                    // Priority strategies can go here
                    const chosenCard = validCards[Math.floor(Math.random() * validCards.length)];

                    dispatch({
                        type: 'PLAY_CARD',
                        payload: { playerId: currentPlayer.id, cardId: chosenCard.id }
                    });
                } else {
                    // Must draw
                    dispatch({
                        type: 'DRAW_CARD',
                        payload: { playerId: currentPlayer.id }
                    });
                    // AI should pass if they drew and still can't play? 
                    // or if they drew and can play, they should play.
                    // For simplicity, AI just draws and passes for now. 
                    // (Actually in Context, DRAW_CARD doesn't auto-pass. AI needs to PASS_TURN explicitly if it doesn't play)
                    // Let's implement that:

                    // Wait a bit then pass? Or check if drawn card is playable?
                    // For now, let's just make AI pass immediately after draw to keep it simple and prevent loops.
                    // Or better: dispatch PASS_TURN
                    setTimeout(() => {
                        dispatch({ type: 'PASS_TURN', payload: { playerId: currentPlayer.id } });
                    }, 500);
                }

            }, 1500 + Math.random() * 1000);

            return () => clearTimeout(timer);
        }
    }, [currentPlayerIndex, status, players, discardPile, currentColor, dispatch]);
};
