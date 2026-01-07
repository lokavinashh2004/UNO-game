import React from 'react';
import { motion } from 'framer-motion';

interface PenaltyTextProps {
    x: number;
    y: number;
    amount: number;
    onComplete: () => void;
}

const PenaltyText: React.FC<PenaltyTextProps> = ({ x, y, amount, onComplete }) => {
    return (
        <motion.div
            initial={{
                position: 'fixed',
                left: x,
                top: y,
                opacity: 0,
                scale: 0.5,
                zIndex: 2000,
                color: '#ff4444',
                fontSize: '48px',
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
            }}
            animate={{
                opacity: [0, 1, 1, 0],
                y: y - 100, // Float up
                scale: [0.5, 1.2, 1],
            }}
            transition={{
                duration: 1.5,
                times: [0, 0.2, 0.8, 1],
                ease: "easeOut"
            }}
            onAnimationComplete={onComplete}
        >
            +{amount}
        </motion.div>
    );
};

export default PenaltyText;
