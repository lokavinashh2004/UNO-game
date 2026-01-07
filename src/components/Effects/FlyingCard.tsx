import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '../Card';
import type { Card as CardType } from '../../types/game';

interface FlyingCardProps {
    startRect: DOMRect;
    targetRect: DOMRect;
    audioSrc?: string;
    onComplete: () => void;
    index: number; // For staggering
}

const FlyingCard: React.FC<FlyingCardProps> = ({ startRect, targetRect, onComplete, index, audioSrc }) => {
    // We render a dummy card visual. Since it's flying face down usually (draw), or specific card (play).
    // For Draw: Face down.
    // For simplicity, let's assume Draw = Face Down (Wild back).
    const dummyCard: CardType = { id: 'flying', type: 'wild', color: 'wild' };

    useEffect(() => {
        // Optional Audio trigger
        if (audioSrc) {
            const audio = new Audio(audioSrc);
            audio.play().catch(() => { }); // Ignore interaction errors
        }
    }, [audioSrc]);

    // Calculate delta
    const deltaX = targetRect.left - startRect.left;
    const deltaY = targetRect.top - startRect.top;

    return (
        <motion.div
            initial={{
                position: 'fixed',
                left: startRect.left,
                top: startRect.top,
                width: startRect.width,
                height: startRect.height,
                scale: 1,
                opacity: 1,
                zIndex: 1000 + index
            }}
            animate={{
                x: deltaX,
                y: deltaY,
                scale: 0.8, // Slight shrink as it enters hand? Or keep 1.
                rotate: Math.random() * 10 - 5, // Subtle rotation
            }}
            transition={{
                duration: 0.6,
                ease: "easeInOut",
                delay: index * 0.1 // Stagger
            }}
            onAnimationComplete={onComplete}
            style={{ pointerEvents: 'none' }}
        >
            <Card card={dummyCard} isHidden={true} style={{ width: '100%', height: '100%' }} />
        </motion.div>
    );
};

export default FlyingCard;
