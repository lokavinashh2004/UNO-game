import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import GameBoard from './components/GameBoard';
import Lobby from './components/Lobby';
import AnimationOverlay from './components/Effects/AnimationOverlay';
import './bg.css';

// Component to handle joining from URL
// The :code param is extracted by Lobby component from the URL
const RoomJoinHandler: React.FC = () => {
  return <Lobby />;
};

// Main game wrapper that switches between Lobby and GameBoard
const GameWrapper: React.FC = () => {
  const { gameState } = useSocket();

  // If we have a game state (game started), show the game board
  if (gameState && gameState.gamePhase !== 'waiting') {
    return (
      <GameProvider initialMultiplayerState={gameState}>
        <AnimationProvider>
          <div className="app-container">
            <GameBoard />
            <AnimationOverlay />
          </div>
        </AnimationProvider>
      </GameProvider>
    );
  }

  // Otherwise show the lobby
  return <Lobby />;
};

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<GameWrapper />} />
          <Route path="/room/:code" element={<RoomJoinHandler />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
