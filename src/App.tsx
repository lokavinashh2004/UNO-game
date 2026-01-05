import { GameProvider } from './contexts/GameContext';
import GameBoard from './components/GameBoard';
import './bg.css'; // Background effects

function App() {
  return (
    <GameProvider>
      <div className="app-container">
        <GameBoard />
      </div>
    </GameProvider>
  );
}

export default App;
