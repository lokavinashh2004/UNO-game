import React from 'react';
import type { Card as CardType } from '../types/game';
import Card from './Card';
import './Hand.css';

interface HandProps {
    cards: CardType[];
    isCurrentPlayer: boolean;
    onPlayCard?: (cardId: string) => void;
    playableCards?: Set<string>;
}

const Hand: React.FC<HandProps> = ({ cards, isCurrentPlayer, onPlayCard, playableCards }) => {
    return (
        <div className={`hand ${isCurrentPlayer ? 'player-hand' : 'opponent-hand'}`}>
            {cards.map((card, index) => {
                const isPlayable = isCurrentPlayer && playableCards?.has(card.id);

                const offset = (index - (cards.length - 1) / 2) * 30;
                const rotate = (index - (cards.length - 1) / 2) * 5;
                const translateY = Math.abs(index - (cards.length - 1) / 2) * 5;

                const style: React.CSSProperties = isCurrentPlayer
                    ? {
                        transform: `translateX(${offset}px) rotate(${rotate}deg) translateY(${translateY}px)`,
                        zIndex: index
                    }
                    : {
                        marginLeft: '-40px',
                        zIndex: index
                    };

                return (
                    <div key={card.id} className="hand-card-wrapper" style={isCurrentPlayer ? {} : { marginLeft: '-50px' }}>
                        <Card
                            card={card}
                            isPlayable={isPlayable}
                            onClick={() => isPlayable && onPlayCard && onPlayCard(card.id)}
                            isHidden={!isCurrentPlayer}
                            style={isCurrentPlayer ? style : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default Hand;
