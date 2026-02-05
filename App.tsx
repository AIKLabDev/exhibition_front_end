
import React, { useState, useEffect, useCallback } from 'react';
import { Scene, WSMessageV2, ConnectionStatus, UIEventName, SceneData, ProgressData } from './types';
import { wsService } from './services/websocketService';
import logoUrl from './resources/AIK_logo_white.png';

// Scenes
import Welcome from './scenes/Welcome';
import QR from './scenes/QR';
import SelectMinigame from './scenes/SelectMinigame';
import Game01 from './scenes/Game01';
import Game02 from './scenes/Game02';
import GameResult from './scenes/GameResult';
import PickGift from './scenes/PickGift';
import LaserStyle from './scenes/LaserStyle';
import LaserProcess from './scenes/LaserProcess';

const App: React.FC = () => {
  const [currentScene, setCurrentScene] = useState<Scene>(Scene.WELCOME);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [progress, setProgress] = useState<{ value: number; label: string }>({ value: 0, label: '' });
  const [sceneText, setSceneText] = useState<string>('');
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE'>('WIN');
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  useEffect(() => {
    wsService.setStatusCallback((newStatus) => setStatus(newStatus as ConnectionStatus));

    const unsubscribe = wsService.addMessageListener((msg: WSMessageV2) => {
      const { name } = msg.header;
      const data = msg.data;

      switch (name) {
        case 'SET_SCENE':
          const sceneData = data as SceneData;
          setCurrentScene(sceneData.scene);
          setSceneText(sceneData.text || '');
          if (sceneData.result) setGameResult(sceneData.result);
          break;
        case 'PROGRESS_UPDATE':
          const progData = data as ProgressData;
          setProgress({ value: progData.value, label: progData.label || '' });
          break;
        case 'SYSTEM_ERROR':
          alert(`System Error: ${data.message}`);
          break;
      }
    });

    // Ensure the cleanup function returns void as expected by useEffect.
    return () => { unsubscribe(); };
  }, []);

  const handleUIEvent = useCallback((name: UIEventName, data?: any) => {
    wsService.sendCommand(name, data);
  }, []);

  const renderScene = () => {
    switch (currentScene) {
      case Scene.WELCOME:
        return <Welcome onStart={() => handleUIEvent('START')} text={sceneText} />;
      case Scene.QR:
        return <QR onCancel={() => handleUIEvent('CANCEL')} text={sceneText} />;
      case Scene.SELECT_MINIGAME:
        return <SelectMinigame onComplete={(game) => handleUIEvent('MINIGAME_SELECTED', { game })} />;
      case Scene.GAME01:
        return (
          <Game01
            onGameResult={(result, userChoice, aiChoice) => {
              handleUIEvent('GAME_RESULT', { result, userChoice, aiChoice });
            }}
          />
        );
      case Scene.GAME02:
        return (
          <Game02
            onGameResult={(result) => {
              handleUIEvent('GAME_RESULT', { result });
            }}
          />
        );
      case Scene.GAME_RESULT:
        return <GameResult result={gameResult} text={sceneText} />;
      case Scene.PICK_GIFT:
        return <PickGift progress={progress.value} label={progress.label} />;
      case Scene.LASER_STYLE:
        return <LaserStyle onSelect={(style) => handleUIEvent('STYLE_SELECTED', { style })} />;
      case Scene.LASER_PROCESS:
        return <LaserProcess progress={progress.value} label={progress.label} />;
      default:
        return <div className="text-4xl p-20">Scene Offline: {currentScene}</div>;
    }
  };

  return (
    <div className="relative w-[2560px] h-[720px] bg-black text-white overflow-hidden font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>

      <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-16 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="AIKOREA" className="h-12 w-auto object-contain object-left" />
          <button
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={`ml-4 px-4 py-1 rounded-md text-xs font-bold border transition-colors ${isDebugOpen ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 opacity-30'}`}
          >
            DEBUG
          </button>
        </div>
        <div className={`flex items-center gap-3 px-6 py-2 rounded-full border ${status === ConnectionStatus.CONNECTED ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'
          }`}>
          <div className={`w-3 h-3 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
          <span className="text-lg font-bold tracking-widest uppercase opacity-80">{status}</span>
        </div>
      </header>

      <main className="w-full h-full pt-20">
        {renderScene()}
      </main>

      {/* Debug Panel */}
      {isDebugOpen && (
        <div className="absolute bottom-24 left-16 z-[100] bg-slate-900/95 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl w-[450px]">
          <h3 className="text-2xl font-black text-blue-400 mb-6 uppercase tracking-widest border-b border-white/10 pb-4">Scene Overrides</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(Scene).map((scene) => (
              <button
                key={scene}
                onClick={() => setCurrentScene(scene)}
                className={`text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${currentScene === scene ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'
                  }`}
              >
                {scene}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
