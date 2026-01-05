import React from 'react';
import type { Card as CardType } from '../types/game';
import './Card.css';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    isPlayable?: boolean;
    isHidden?: boolean;
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ card, onClick, isPlayable, isHidden, style }) => {
    if (isHidden) {
        return (
            <div className="card back" style={style}>
                <div className="card-oval">
                    <span className="uno-text">UNO</span>
                </div>
            </div>
        );
    }

    const { color, type, value } = card;

    const renderContent = () => {
        if (type === 'number') return <span className="card-value large">{value}</span>;
        if (type === 'skip') return <span className="card-icon">⊘</span>;
        if (type === 'reverse') return <span className="card-icon">⇄</span>;
        if (type === 'draw2') return <span className="card-value large">+2</span>;
        if (type === 'wild') return <div className="wild-icon">🌈</div>;
        if (type === 'wild4') return <div className="wild-icon">+4</div>;
    };

    const miniContent = () => {
        if (type === 'number') return value;
        if (type === 'skip') return '⊘';
        if (type === 'reverse') return '⇄';
        if (type === 'draw2') return '+2';
        return '';
    }

    const colorClass = color === 'wild' ? 'black' : color;

    return (
        <div
            className={`card ${colorClass} ${isPlayable ? 'playable' : ''}`}
            onClick={isPlayable ? onClick : undefined}
            style={style}
        >
            <div className="card-inner">
                <span className="corner top-left">{miniContent()}</span>
                <div className="center-wrapper">
                    {renderContent()}
                </div>
                <span className="corner bottom-right">{miniContent()}</span>
            </div>
        </div>
    );
};

export default Card;
