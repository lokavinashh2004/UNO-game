import React from 'react';
import type { CardColor } from '../../types/game';
import './ColorPicker.css';

interface ColorPickerProps {
    onSelect: (color: CardColor) => void;
    onCancel?: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onSelect, onCancel }) => {
    return (
        <div className="modal-overlay">
            <div className="color-picker-modal">
                <h2>Choose Color</h2>
                <div className="colors-grid">
                    <button className="color-btn red" onClick={() => onSelect('red')}></button>
                    <button className="color-btn blue" onClick={() => onSelect('blue')}></button>
                    <button className="color-btn green" onClick={() => onSelect('green')}></button>
                    <button className="color-btn yellow" onClick={() => onSelect('yellow')}></button>
                </div>
                {onCancel && <button className="btn-cancel" onClick={onCancel}>Cancel</button>}
            </div>
        </div>
    );
};

export default ColorPicker;
