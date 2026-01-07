import React from 'react';
import { createPortal } from 'react-dom';
import { useAnimation } from '../../contexts/AnimationContext';
import FlyingCard from './FlyingCard';
import PenaltyText from './PenaltyText';

const AnimationOverlay: React.FC = () => {
    const { activeAnimations } = useAnimation(); // removeAnimation used internally by components usually, or implicitly via onComplete map

    if (activeAnimations.length === 0) return null;

    // Helper to get coordinates safely
    const getRect = (selector: string): DOMRect | null => {
        const el = document.querySelector(selector);
        return el ? el.getBoundingClientRect() : null;
    };

    return createPortal(
        <>
            {activeAnimations.map((anim) => {
                if (anim.type === 'draw' || anim.type === 'penalty') {
                    const { count, targetSelector } = anim.payload;

                    // Default selectors if not provided
                    // Deck is usually fixed
                    const deckRect = getRect('.draw-pile');
                    // Fallback to active player if no selector
                    const targetRect = getRect(targetSelector || '.player-avatar.active');

                    if (!deckRect || !targetRect) return null;

                    const items = Array.from({ length: count }).map((_, i) => (
                        <FlyingCard
                            key={`${anim.id}-card-${i}`}
                            index={i}
                            startRect={deckRect}
                            targetRect={targetRect}
                            onComplete={i === count - 1 ? anim.onComplete! : () => { }}
                        />
                    ));

                    return (
                        <React.Fragment key={anim.id}>
                            {items}
                            {anim.type === 'penalty' && (
                                <PenaltyText
                                    x={targetRect.left + 50}
                                    y={targetRect.top}
                                    amount={count}
                                    onComplete={() => { }}
                                />
                            )}
                        </React.Fragment>
                    );
                }
                return null;
            })}
        </>,
        document.body
    );
};

export default AnimationOverlay;
