
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SceneDefine, WSMessageV2, ConnectionStatus, UIEventName, SceneData, ProgressData } from './types';
import { backendWsService } from './services/backendWebSocketService';
import { getVisionWsService } from './services/visionWebSocketService';
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
  const [currentScene, setCurrentScene] = useState<SceneDefine>(SceneDefine.WELCOME);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [progress, setProgress] = useState<{ value: number; label: string }>({ value: 0, label: '' });
  const [sceneText, setSceneText] = useState<string>('');
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE'>('WIN');
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  /** 백엔드 GAME_START 수신 시 증가 → Game01에 전달해 버튼 없이 시작 */
  const [gameStartTrigger, setGameStartTrigger] = useState(0);
  /** 백엔드 GAME_STOP 수신 시 증가 (필요 시 Game01 등에서 사용) */
  const [gameStopTrigger, setGameStopTrigger] = useState(0);

  const currentSceneRef = useRef(currentScene);
  currentSceneRef.current = currentScene;

  useEffect(() => {
    backendWsService.setStatusCallback((newStatus) => setStatus(newStatus as ConnectionStatus));

    const unsubscribe = backendWsService.addMessageListener((msg: WSMessageV2) => {
      const { name } = msg.header;
      const data = msg.data;

      switch (name) {
        case 'SET_SCENE': {
          const sceneData = data as SceneData;
          setCurrentScene(sceneData.scene);
          setSceneText(sceneData.text || '');
          if (sceneData.result) setGameResult(sceneData.result);
          // Python 공통 모듈에 현재 씬 전달 (프론트가 중간다리)
          getVisionWsService().sendScene(sceneData);
          break;
        }
        case 'PROGRESS_UPDATE':
          const progData = data as ProgressData;
          setProgress({ value: progData.value, label: progData.label || '' });
          break;
        case 'SYSTEM_ERROR':
          alert(`System Error: ${(data as { message?: string }).message ?? 'Unknown'}`);
          break;
        case 'GAME_START':
          getVisionWsService().sendGameStart();
          setGameStartTrigger((t) => t + 1);
          break;
        case 'GAME_STOP':
          getVisionWsService().sendGameStop();
          setGameStopTrigger((t) => t + 1);
          break;
      }
    });

    // Ensure the cleanup function returns void as expected by useEffect.
    return () => { unsubscribe(); };
  }, []);

  // Welcome 씬에서 Python이 human 감지 시 → 백엔드에 HUMAN_DETECTED 전달 → 백엔드가 SET_SCENE QR 보내면 씬 전환
  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onHumanDetected((data) => {
      if (currentSceneRef.current !== SceneDefine.WELCOME) return;
      backendWsService.sendCommand('HUMAN_DETECTED', data);
    });
    return () => { unsubscribe(); };
  }, []);

  const handleUIEvent = useCallback((name: UIEventName, data?: any) => {
    backendWsService.sendCommand(name, data);
  }, []);

  const renderScene = () => {
    switch (currentScene) {
      case SceneDefine.WELCOME:
        return <Welcome onStart={() => handleUIEvent('START')} text={sceneText} />;
      case SceneDefine.QR:
        return <QR onCancel={() => handleUIEvent('CANCEL')} text={sceneText} />;
      case SceneDefine.SELECT_MINIGAME:
        return <SelectMinigame onComplete={(game) => handleUIEvent('MINIGAME_SELECTED', { game })} />;
      case SceneDefine.GAME01:
        return (
          <Game01
            onGameResult={(result, userChoice, aiChoice) => {
              handleUIEvent('GAME_RESULT', { result, userChoice, aiChoice });
            }}
            triggerStartFromBackend={gameStartTrigger}
          />
        );
      case SceneDefine.GAME02:
        return (
          <Game02
            onGameResult={(result) => {
              handleUIEvent('GAME_RESULT', { result });
            }}
          />
        );
      case SceneDefine.GAME_RESULT:
        return <GameResult result={gameResult} text={sceneText} />;
      case SceneDefine.PICK_GIFT:
        return <PickGift progress={progress.value} label={progress.label} />;
      case SceneDefine.LASER_STYLE:
        return <LaserStyle onSelect={(style) => handleUIEvent('STYLE_SELECTED', { style })} />;
      case SceneDefine.LASER_PROCESS:
        return <LaserProcess progress={progress.value} label={progress.label} />;
      default:
        return <div className="text-4xl p-20">Scene Offline: {currentScene}</div>;
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent" />
      </div>

      {/* Logo Overlay - 투명 배경으로 레이어 위에 표시 */}
      <div className="absolute top-6 left-16 z-[60] flex items-center gap-4">
        <img src={logoUrl} alt="AIKOREA" className="h-12 w-auto object-contain object-left drop-shadow-lg" />
        <button
          onClick={() => setIsDebugOpen(!isDebugOpen)}
          className={`px-4 py-1 rounded-md text-xs font-bold border transition-colors ${isDebugOpen ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 opacity-30'}`}
        >
          DEBUG
        </button>
      </div>

      {/* Main Content - 전체 화면 사용 */}
      <main className="w-full h-full">
        {renderScene()}
      </main>

      {/* Debug Panel */}
      {isDebugOpen && (
        <div className="absolute bottom-24 left-16 z-[100] bg-slate-900/95 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl w-[450px]">
          {/* Connection Status - Debug용 */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-2xl font-black text-blue-400 uppercase tracking-widest">Scene Overrides</h3>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm ${status === ConnectionStatus.CONNECTED ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'
              }`}>
              <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
              <span className="font-bold tracking-wider uppercase opacity-80">{status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(SceneDefine).map((scene) => (
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
