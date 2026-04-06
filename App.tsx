
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SceneDefine, WSMessageV2, ConnectionStatus, UIEventName, BackendMessageName, Backend2MessageName, SceneData, ProgressData } from './types';
import type { BackendGameStartData } from './types';
import type { Backend2StyleSelectedData } from './types';
import { backendWsService } from './services/backendWebSocketService';
import { backend2WsService } from './services/backend2WebSocketService';
import { getVisionWsService } from './services/visionWebSocketService';
import logoUrl from './resources/AIK_logo_white.png';
import { DEBUG_MODE } from './appConstants';

// Scenes
import Welcome from './scenes/Welcome';
import Farewell from './scenes/Farewell';
import QR from './scenes/QR';
import SelectMinigame from './scenes/SelectMinigame';
import Game01 from './scenes/Game01';
import Game02 from './scenes/Game02';
import Game03 from './scenes/Game03';
import Game04 from './scenes/Game04';
import Game05 from './scenes/Game05';
import GameResult from './scenes/GameResult';
import GameComplete from './scenes/GameComplete';
import PickGift from './scenes/PickGift';
import LaserStyle from './scenes/LaserStyle';
import LaserProcess from './scenes/LaserProcess';
import Capture from './scenes/Capture';
import RefillGift from './scenes/RefillGift';

/** Exhibition 체인 모드에서만 순서대로 진행하는 미니게임 (씬 전환은 백엔드 SET_SCENE이 단일 소스) */
const MINIGAME_CHAIN_SCENES = [SceneDefine.GAME02, SceneDefine.GAME04, SceneDefine.GAME05] as const;

/** 체인 모드: 게임 종료 직후 다음 미니게임으로 넘기기 전, 현재 게임의 결과 화면을 보여줄 시간(ms) */
const MINIGAME_CHAIN_RESULT_HOLD_MS = 3000;

const App: React.FC = () => {
  const [currentScene, setCurrentScene] = useState<SceneDefine>(SceneDefine.WELCOME);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [progress, setProgress] = useState<{ value: number; label: string }>({ value: 0, label: '' });
  const [sceneText, setSceneText] = useState<string>('');
  const [gameResult, setGameResult] = useState<'WIN' | 'LOSE'>('WIN');
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!DEBUG_MODE) setIsDebugOpen(false);
  }, []);
  /** Python(Vision) WebSocket 연결 여부 - 디버그 UI 표시용 */
  const [pythonConnected, setPythonConnected] = useState(false);
  /** 백엔드 GAME_START 수신 시 증가 → Game01에 전달해 버튼 없이 시작 */
  const [gameStartTrigger, setGameStartTrigger] = useState(0);
  /** 백엔드 GAME_STOP 수신 시 증가 (필요 시 Game01 등에서 사용) */
  const [gameStopTrigger, setGameStopTrigger] = useState(0);
  /** GAME04 디버그용: 조준 입력 모드 (mouse | head) */
  const [game04InputMode, setGame04InputMode] = useState<'mouse' | 'head'>('head');
  /** GAME05 디버그용: 입력 모드 (mouse | vision). vision 시 Python GAME05_ATTACK 수신 시 공격 */
  const [game05InputMode, setGame05InputMode] = useState<'mouse' | 'vision'>('mouse');
  /** Welcome 씬에서 human detect 시 "환영합니다" 메시지 표시 여부 */
  const [showWelcomeGreeting, setShowWelcomeGreeting] = useState(false);
  /** 디버그: GAME_RESULT 메시지 전송 여부. 끄면 시퀀스(결과 씬 전환 등)가 진행되지 않음 */
  const [sendGameResultMessage, setSendGameResultMessage] = useState(true);
  /** Backend2 WebSocket 연결 상태 - 디버그 UI 표시용 */
  const [backend2Status, setBackend2Status] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  /** SKETCH_RESULT로 받은 4가지 스타일 이미지(Base64). LASER_STYLE 씬에 전달 */
  const [sketchImages, setSketchImages] = useState<string[]>([]);
  /** 체인 모드 UI(ref와 동기): 결과 화면에서 재시작 버튼 숨김 등에 사용 */
  const [minigameChainUi, setMinigameChainUi] = useState(false);
  /** 체인 세션 시작 시 GAME_START의 totalRounds(미지정·비정상 시 1로 간주) */
  const [chainSessionTotalRounds, setChainSessionTotalRounds] = useState(1);

  const currentSceneRef = useRef(currentScene);
  currentSceneRef.current = currentScene;

  /** Exhibition GAME_START mode=chain 시 true. 다음 게임은 백엔드 SET_SCENE, 끝나면 GAME_COMPLETE 전송 */
  const minigameChainActiveRef = useRef(false);
  const minigameChainAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** true면 이미 결과 유지 타이머가 잡혀 있음(중복 onGameResult 방지) */
  const minigameChainAdvancePendingRef = useRef(false);

  const clearMinigameChainAdvanceTimer = () => {
    if (minigameChainAdvanceTimerRef.current != null) {
      clearTimeout(minigameChainAdvanceTimerRef.current);
      minigameChainAdvanceTimerRef.current = null;
    }
    minigameChainAdvancePendingRef.current = false;
  };

  // Vision WS는 앱 시작 시 바로 연결 시도 (재연결 포함). 그래야 백엔드 SET_SCENE 수신 시 sendScene 가능
  useEffect(() => {
    getVisionWsService().connect().catch(() => { });
  }, []);

  // Python(Vision) 연결 상태 구독
  useEffect(() => {
    const vision = getVisionWsService();
    setPythonConnected(vision.isConnected());
    vision.onConnect(() => setPythonConnected(true));
    vision.onDisconnect(() => setPythonConnected(false));
  }, []);

  // Backend2 WebSocket 연결 상태 구독
  useEffect(() => {
    backend2WsService.setStatusCallback((newStatus) => setBackend2Status(newStatus as ConnectionStatus));
  }, []);

  useEffect(() => {
    backendWsService.setStatusCallback((newStatus) => setStatus(newStatus as ConnectionStatus));

    const unsubscribe = backendWsService.addMessageListener((msg: WSMessageV2) => {
      const { name } = msg.header;
      const data = msg.data;

      switch (name) {
        case 'SET_SCENE': {
          clearMinigameChainAdvanceTimer();
          const sceneData = data as SceneData;
          setCurrentScene(sceneData.scene);
          setSceneText(sceneData.text || '');
          if (sceneData.result) setGameResult(sceneData.result);
          if (!MINIGAME_CHAIN_SCENES.includes(sceneData.scene as (typeof MINIGAME_CHAIN_SCENES)[number])) {
            minigameChainActiveRef.current = false;
            setMinigameChainUi(false);
          }
          // Python 공통 모듈에 현재 씬 전달 (백엔드 SET_SCENE → 프론트가 중간다리, 체인 중 직접 sendScene 안 함)
          getVisionWsService().sendScene(sceneData);
          // 체인: GAME02는 보통 직후 GAME_START로 시작. GAME04/05는 체인 전환 시 백엔드 SET_SCENE만 오므로 Python game_start 동기화
          if (
            minigameChainActiveRef.current &&
            (sceneData.scene === SceneDefine.GAME04 || sceneData.scene === SceneDefine.GAME05)
          ) {
            getVisionWsService().sendGameStart();
            setGameStartTrigger((t) => t + 1);
          }
          break;
        }
        case 'PROGRESS_UPDATE':
          const progData = data as ProgressData;
          setProgress({ value: progData.value, label: progData.label || '' });
          break;
        case 'SYSTEM_ERROR':
          alert(`System Error: ${(data as { message?: string }).message ?? 'Unknown'}`);
          break;
        case 'GAME_START': {
          clearMinigameChainAdvanceTimer();
          const gd = data as BackendGameStartData;
          if (gd?.mode === 'chain') {
            minigameChainActiveRef.current = true;
            setMinigameChainUi(true);
            const raw = gd.totalRounds;
            const tr =
              typeof raw === 'number' && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
            setChainSessionTotalRounds(tr);
            console.log('[App] GAME_START chain mode', gd.games ?? MINIGAME_CHAIN_SCENES, 'totalRounds→UI', tr);
          } else {
            minigameChainActiveRef.current = false;
            setMinigameChainUi(false);
          }
          getVisionWsService().sendGameStart();
          setGameStartTrigger((t) => t + 1);
          break;
        }
        case 'GAME_STOP':
          getVisionWsService().sendGameStop();
          setGameStopTrigger((t) => t + 1);
          break;
        case BackendMessageName.LASER_WORK_STANDBY:
          backend2WsService.sendCommand(Backend2MessageName.LASER_WORK_STANDBY, data ?? {});
          console.log('[App] LASER_WORK_STANDBY from Exhibition → forwarded to Backend2 (laser)');
          break;
      }
    });

    // Ensure the cleanup function returns void as expected by useEffect.
    return () => {
      unsubscribe();
      if (minigameChainAdvanceTimerRef.current != null) {
        clearTimeout(minigameChainAdvanceTimerRef.current);
        minigameChainAdvanceTimerRef.current = null;
      }
    };
  }, []);

  // Welcome 씬에서 Python이 human 감지 시 → "환영합니다" 연출 후 백엔드에 HUMAN_DETECTED 전달
  // useRef로 연출 중 상태 추적 (state 변경 시 effect 재실행 방지)
  const greetingInProgressRef = useRef(false);

  useEffect(() => {
    const vision = getVisionWsService();

    const unsubscribe = vision.onHumanDetected((data) => {
      if (currentSceneRef.current !== SceneDefine.WELCOME) return;
      if (greetingInProgressRef.current) return; // 이미 연출 중이면 무시

      // 1) "환영합니다" 메시지 표시
      greetingInProgressRef.current = true;
      setShowWelcomeGreeting(true);

      // 2) 1초 후에 백엔드에 전달 (백엔드가 SET_SCENE QR 보내면 씬 전환)
      setTimeout(() => {
        backendWsService.sendCommand('HUMAN_DETECTED', data);
        setShowWelcomeGreeting(false);
        greetingInProgressRef.current = false;
      }, 1000);
    });

    return () => { unsubscribe(); };
  }, []);

  // Python(Vision) HUMAN_OUT 수신 → 백엔드(Exhibition)에 전달 (HumanOutCheck → KeyholderDetectCheck 트리거)
  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onHumanOut((data) => {
      backendWsService.sendCommand('HUMAN_OUT' as UIEventName, data ?? {});
      console.log('[App] HUMAN_OUT 수신 → 백엔드 전달');
    });
    return () => { unsubscribe(); };
  }, []);

  // Python SKETCH_RESULT 수신: Capture 씬에서 스케치 생성 완료 → LASER_STYLE로 전환
  useEffect(() => {
    const vision = getVisionWsService();
    const unsubscribe = vision.onSketchResult((data) => {
      setSketchImages(data.images.slice(0, 4));
      setCurrentScene(SceneDefine.LASER_STYLE);
      console.log('[App] SKETCH_RESULT 수신 → LASER_STYLE 전환, images:', data.images.length);
    });
    return () => { unsubscribe(); };
  }, []);

  // Exhibition_Drawing(8081, Backend2 WS) MACHINING_COMPLETE 수신 → 백엔드(Exhibition 8080)에 success 전달
  useEffect(() => {
    const unsubscribe = backend2WsService.addMessageListener((msg) => {
      if (msg.header?.name !== 'MACHINING_COMPLETE') return;
      const payload = msg.data as { success?: number } | undefined;
      const success = payload?.success !== undefined ? payload.success : 1;
      backendWsService.sendCommand('MACHINING_COMPLETE', { success });
      console.log('[App] MACHINING_COMPLETE from Backend2(8081) → Exhibition, success:', success);
    });
    return () => { unsubscribe(); };
  }, []);

  const handleUIEvent = useCallback((name: UIEventName, data?: any) => {
    backendWsService.sendCommand(name, data);
  }, []);

  /** 체인 세션일 때만 백엔드에 GAME02_CHAIN_ROUND_END (로봇 ref 이동용) */
  const notifyGame02ChainRoundEndIfNeeded = useCallback(() => {
    if (minigameChainActiveRef.current) {
      backendWsService.sendCommand('GAME02_CHAIN_ROUND_END' as UIEventName, {});
    }
  }, []);

  /** 체인 세션일 때만 백엔드에 GAME04_CHAIN_ROUND_END */
  const notifyGame04ChainRoundEndIfNeeded = useCallback(() => {
    if (minigameChainActiveRef.current) {
      backendWsService.sendCommand('GAME04_CHAIN_ROUND_END' as UIEventName, {});
    }
  }, []);

  /** 체인 모드에서 한 게임 종료 시 다음 씬으로 또는 마지막이면 GAME_COMPLETE. true면 GAME_RESULT 생략 */
  const tryAdvanceMinigameChain = useCallback((): boolean => {
    if (!minigameChainActiveRef.current) return false;
    if (minigameChainAdvancePendingRef.current) return true;

    const cur = currentSceneRef.current;
    const idx = MINIGAME_CHAIN_SCENES.indexOf(cur as (typeof MINIGAME_CHAIN_SCENES)[number]);
    if (idx === -1) return false;

    minigameChainAdvancePendingRef.current = true;
    const sceneWhenScheduled = cur;

    const runAdvance = () => {
      minigameChainAdvanceTimerRef.current = null;
      minigameChainAdvancePendingRef.current = false;

      if (!minigameChainActiveRef.current) return;
      if (currentSceneRef.current !== sceneWhenScheduled) return;

      const i = MINIGAME_CHAIN_SCENES.indexOf(
        currentSceneRef.current as (typeof MINIGAME_CHAIN_SCENES)[number]
      );
      if (i === -1) return;

      if (i < MINIGAME_CHAIN_SCENES.length - 1) {
        const next = MINIGAME_CHAIN_SCENES[i + 1];
        if (next === SceneDefine.GAME04) {
          backendWsService.sendCommand('GAME04_CHAIN_ROUND_START' as UIEventName, {});
        } else if (next === SceneDefine.GAME05) {
          backendWsService.sendCommand('GAME05_CHAIN_ROUND_START' as UIEventName, {});
        }
        console.log('[App] Minigame chain: backend request SET_SCENE →', next);
      } else {
        minigameChainActiveRef.current = false;
        setMinigameChainUi(false);
        backendWsService.sendCommand('GAME_COMPLETE' as UIEventName, {});
        console.log('[App] Minigame chain finished → GAME_COMPLETE');
      }
    };

    minigameChainAdvanceTimerRef.current = setTimeout(runAdvance, MINIGAME_CHAIN_RESULT_HOLD_MS);
    console.log('[App] Minigame chain: hold result', MINIGAME_CHAIN_RESULT_HOLD_MS, 'ms then advance/complete');
    return true;
  }, []);

  /** 게임 결과 전송. 디버그에서 끄면 백엔드로 보내지 않아 시퀀스가 진행되지 않음 */
  const sendGameResult = useCallback(
    (data: any) => {
      if (sendGameResultMessage) handleUIEvent('GAME_RESULT', data);
    },
    [sendGameResultMessage, handleUIEvent]
  );

  /** 체인 + 세션 라운드 1판: 다음 씬 자동 전환만 쓰므로 결과의 "다시 시작" 숨김 */
  const hideChainResultRestart = minigameChainUi && chainSessionTotalRounds <= 1;

  const renderScene = () => {
    switch (currentScene) {
      case SceneDefine.WELCOME:
        return <Welcome onStart={() => handleUIEvent('START')} text={sceneText} showGreeting={showWelcomeGreeting} />;
      case SceneDefine.FAREWELL:
        return <Farewell />;
      case SceneDefine.QR:
        return (
          <QR
            onCancel={() => handleUIEvent('CANCEL')}
            text={sceneText}
            onQRScannedComplete={(data) => backendWsService.sendCommand('QR_SCANNED', data)}
            visionOnline={pythonConnected}
          />
        );
      case SceneDefine.SELECT_MINIGAME:
        return (
          <SelectMinigame
            onComplete={(game) => {
              // 백엔드가 디버깅 등으로 씬 강제 전환한 경우, minigame select가 아닐 때는 전송하지 않음
              if (currentSceneRef.current !== SceneDefine.SELECT_MINIGAME) return;
              handleUIEvent('MINIGAME_SELECTED', { game });
            }}
          />
        );
      case SceneDefine.GAME01:
        return (
          <Game01
            onGameResult={(result, userChoice, aiChoice) => {
              if (tryAdvanceMinigameChain()) return;
              sendGameResult({ result, userChoice, aiChoice });
            }}
            triggerStartFromBackend={gameStartTrigger}
          />
        );
      case SceneDefine.GAME02:
        return (
          <Game02
            onGameResult={(result) => {
              if (tryAdvanceMinigameChain()) return;
              sendGameResult({ result });
            }}
            triggerStartFromBackend={gameStartTrigger}
            notifyChainRoundEndIfNeeded={notifyGame02ChainRoundEndIfNeeded}
          />
        );
      case SceneDefine.GAME03:
        return (
          <Game03
            onGameResult={(result) => {
              if (tryAdvanceMinigameChain()) return;
              sendGameResult({ result });
            }}
            triggerStartFromBackend={gameStartTrigger}
          />
        );
      case SceneDefine.GAME04:
        return (
          <Game04
            inputMode={game04InputMode}
            onGameResult={(result) => {
              if (tryAdvanceMinigameChain()) return;
              sendGameResult({ result });
            }}
            triggerStartFromBackend={gameStartTrigger}
            hideResultRestart={hideChainResultRestart}
            notifyChainRoundEndIfNeeded={notifyGame04ChainRoundEndIfNeeded}
          />
        );
      case SceneDefine.GAME05:
        return (
          <Game05
            inputMode={game05InputMode}
            onGameResult={(result) => {
              if (tryAdvanceMinigameChain()) return;
              sendGameResult({ result });
            }}
            triggerStartFromBackend={gameStartTrigger}
            hideResultRestart={hideChainResultRestart}
          />
        );
      case SceneDefine.GAME_RESULT:
        return <GameResult result={gameResult} text={sceneText} />;
      case SceneDefine.GAME_COMPLETE:
        return <GameComplete />;
      case SceneDefine.PICK_GIFT:
        return <PickGift progress={progress.value} label={progress.label} />;
      case SceneDefine.REFILL_GIFT:
        return <RefillGift text={sceneText} />;
      case SceneDefine.LASER_STYLE:
        return (
          <LaserStyle
            onSelect={(style, number) => {
              handleUIEvent('STYLE_SELECTED', { style, number });

              // Backend2에 선택된 스타일 + 해당 이미지(Base64)를 전송
              const selectedImage = sketchImages[number - 1] ?? '';
              const payload: Backend2StyleSelectedData = { style, number, image: selectedImage };
              backend2WsService.sendCommand(Backend2MessageName.STYLE_SELECTED, payload);
            }}
            images={sketchImages}
          />
        );
      case SceneDefine.LASER_PROCESS:
        return <LaserProcess progress={progress.value} label={progress.label} />;
      case SceneDefine.CAPTURE:
        return <Capture />;
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
        {DEBUG_MODE && (
          <button
            type="button"
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={`px-4 py-1 rounded-md text-xs font-bold border transition-colors ${isDebugOpen ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/10 opacity-30'}`}
          >
            DEBUG
          </button>
        )}
      </div>

      {/* Main Content - 전체 화면 사용 */}
      <main className="w-full h-full">
        {renderScene()}
      </main>

      {/* Debug Panel */}
      {DEBUG_MODE && isDebugOpen && (
        <div className="absolute top-24 left-16 z-[100] bg-slate-900/95 border border-white/10 rounded-3xl p-7 shadow-2xl backdrop-blur-xl w-[450px] max-h-[calc(100vh-6rem)] overflow-y-auto">
          {/* Connection Status(좌) + GAME_RESULT 전송 토글(우) - 한 줄에 배치해 UI 밀림 방지 */}
          <div className="mb-3 pb-3 border-b border-white/10 flex flex-row gap-3 items-start">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-12 shrink-0">cpp</span>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm flex-1 min-w-0 ${status === ConnectionStatus.CONNECTED ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-bold tracking-wider uppercase opacity-80 truncate">{status}</span>
                </div>
                {currentScene === SceneDefine.GAME04 && (
                  <div className="flex rounded-lg border border-white/20 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setGame04InputMode('mouse')}
                      className={`px-3 py-1.5 text-xs font-bold transition-colors ${game04InputMode === 'mouse' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      Mouse
                    </button>
                    <button
                      type="button"
                      onClick={() => setGame04InputMode('head')}
                      className={`px-3 py-1.5 text-xs font-bold transition-colors ${game04InputMode === 'head' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      Head
                    </button>
                  </div>
                )}
                {currentScene === SceneDefine.GAME05 && (
                  <div className="flex rounded-lg border border-white/20 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setGame05InputMode('mouse')}
                      className={`px-3 py-1.5 text-xs font-bold transition-colors ${game05InputMode === 'mouse' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      Mouse
                    </button>
                    <button
                      type="button"
                      onClick={() => setGame05InputMode('vision')}
                      className={`px-3 py-1.5 text-xs font-bold transition-colors ${game05InputMode === 'vision' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                    >
                      Vision
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-12 shrink-0">python</span>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm flex-1 min-w-0 ${pythonConnected ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${pythonConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-bold tracking-wider uppercase opacity-80 truncate">{pythonConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-12 shrink-0">cpp2</span>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm flex-1 min-w-0 ${backend2Status === ConnectionStatus.CONNECTED ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${backend2Status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-bold tracking-wider uppercase opacity-80 truncate">{backend2Status}</span>
                </div>
              </div>
            </div>
            {/* GAME_RESULT 전송 토글: 끄면 게임 결과를 백엔드로 보내지 않아 시퀀스(결과 씬 전환 등)가 진행되지 않음 */}
            <div className="flex flex-col gap-1 shrink-0 border-l border-white/10 pl-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">GAME_RESULT</span>
              <div className="flex rounded-lg border border-white/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSendGameResultMessage(true)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${sendGameResultMessage ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  전송
                </button>
                <button
                  type="button"
                  onClick={() => setSendGameResultMessage(false)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${!sendGameResultMessage ? 'bg-amber-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  미전송
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-blue-400 uppercase tracking-widest">Scene Lists</h3>
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
