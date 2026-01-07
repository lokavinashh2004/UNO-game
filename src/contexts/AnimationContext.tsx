import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type AnimationType = 'draw' | 'penalty' | 'play';

export interface AnimationEvent {
    id: string;
    type: AnimationType;
    payload: any;
    onComplete?: () => void;
}

interface AnimationContextType {
    triggerAnimation: (type: AnimationType, payload: any) => Promise<void>;
    isAnimating: boolean;
    activeAnimations: AnimationEvent[];
    removeAnimation: (id: string) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeAnimations, setActiveAnimations] = useState<AnimationEvent[]>([]);

    // Derived state: Is animating if there are items in the queue
    const isAnimating = activeAnimations.length > 0;

    const removeAnimation = useCallback((id: string) => {
        setActiveAnimations(prev => prev.filter(anim => anim.id !== id));
    }, []);

    const triggerAnimation = useCallback((type: AnimationType, payload: any): Promise<void> => {
        return new Promise((resolve) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newAnimation: AnimationEvent = {
                id,
                type,
                payload,
                onComplete: () => {
                    removeAnimation(id);
                    resolve();
                }
            };
            setActiveAnimations(prev => [...prev, newAnimation]);
        });
    }, [removeAnimation]);

    return (
        <AnimationContext.Provider value={{ triggerAnimation, isAnimating, activeAnimations, removeAnimation }}>
            {children}
        </AnimationContext.Provider>
    );
};

export const useAnimation = () => {
    const context = useContext(AnimationContext);
    if (!context) {
        throw new Error('useAnimation must be used within an AnimationProvider');
    }
    return context;
};
