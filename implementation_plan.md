# UNO Game Implementation Plan (React + TypeScript)

## 1. Project Structure
```text
/
├── src/
│   ├── assets/         # Images, sounds
│   ├── components/     # React Components
│   │   ├── Card.tsx
│   │   ├── Deck.tsx
│   │   ├── GameBoard.tsx
│   │   ├── Hand.tsx
│   │   ├── Player.tsx
│   │   └── UI/         # Reusable UI elements (Button, Modal, Toast)
│   ├── contexts/       # Game State Context
│   │   └── GameContext.tsx
│   ├── hooks/          # Custom Hooks
│   │   ├── useGameState.ts
│   │   ├── useAI.ts
│   │   └── useDeck.ts
│   ├── types/          # TypeScript Interfaces/Enums
│   │   └── game.ts
│   ├── utils/          # Helper functions
│   │   ├── deckLogic.ts
│   │   └── rules.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
└── index.html
```

## 2. Data Models (Types)

### `Card`
```typescript
interface Card {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'wild';
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
  value?: number; // 0-9 for number cards
}
```

### `Player`
```typescript
interface Player {
  id: string;
  name: string;
  hand: Card[];
  isAI: boolean;
  isUno?: boolean; // specialized flag for UI
}
```

### `GameState`
```typescript
interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counter-clockwise
  currentColor: string; // The active play color (important for wild cards)
  status: 'lobby' | 'playing' | 'game-over';
  winner: Player | null;
  drawStack: number; // For stacking draw penalties (optional but good structure)
}
```

## 3. Component Architecture

### `App`
- Main container, handles global layout and GameContext provider.

### `GameBoard`
- Visual representation of the table.
- Renders `OpponentHands` (top/sides) and `PlayerHand` (bottom).
- Renders `DiscardPile` and `DrawDeck` in the center.

### `Card` Component
- Visual rendering of a single UNO card.
- Props: `card: Card`, `onClick?: () => void`, `isPlayable?: boolean`.
- Uses CSS/SVG for rendering the specific design (color/number/icon).

### `Hand` Component
- Displays a list of `Card` components.
- Handles layout (fanning cards out).
- For local player: checks playability.
- For opponents: renders back of cards (count only or face-down logic).

### `GameContext` (The Brain)
- Stores `GameState`.
- Exposes actions: `playCard`, `drawCard`, `passTurn`, `setWildColor`.
- Handles side-effects:
  - Checking win conditions.
  - Enforcing turns.
  - Applying special card effects.

## 4. Game Logic & Rules Engine (`utils/rules.ts`)
- `isValidMove(card, topDiscard, currentColor)`: boolean
- `getNextPlayerIndex(currentIndex, direction, playerCount)`: number
- `generateDeck()`: returns shuffled `Card[]`

## 5. AI Logic (`hooks/useAI.ts`)
- Watch `currentPlayerIndex`. If current player is AI:
  - Wait a small delay (simulated thinking).
  - Scan hand for valid moves.
  - Strategy:
    - Priority 1: Play `+2` or `+4` if valid (aggressive).
    - Priority 2: Play matching color/number to minimize hand points.
    - Priority 3: Change color to one they have most of (if using Wild).
  - Execute move via Context actions.

## 6. Visuals & Polish
- **TailwindCSS** (via index.css/styles) or Styled Components. We will use vanilla CSS/SCSS modules or standard CSS for simplicity and control unless Tailwind is requested. *Plan: Standard CSS/Modules for custom premium look.*
- **Animations**: `Framer Motion` or playing with CSS Transitions for card drawing/playing.

## 7. Implementation Steps
1.  **Scaffold**: React + TypeScript + Vite.
2.  **Types**: Define standard UNO types.
3.  **Engine**: Implement `deckLogic.ts` and `rules.ts`.
4.  **State**: Build `GameContext` and reducer.
5.  **Components**: Build `Card` visual, `Hand`, `Board`.
6.  **Integration**: Connect State to UI.
7.  **AI**: Add AI hook.
8.  **Polish**: Add animations (dealing, playing cards), Color Picker modal, Win screen.
