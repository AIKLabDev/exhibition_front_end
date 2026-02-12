import React, { useState, useEffect, useRef } from 'react';
import './Game01.css';
import type { RpsChoice, RpsGameState, RpsResult, Game01Props } from './Game01.types';
import {
  getVisionWsService,
  type VisionWebSocketService,
} from '../../services/visionWebSocketService';
import HandDisplay from './HandDisplay';
import Fireworks from './Fireworks';

// --- 사용자에게 표시할 메시지 (쉽게 수정 가능) ---
const GAME01_MESSAGES = {
  /** 대기 화면 */
  idle: {
    hypeText: "READY?",
    aiComment: "Show me what you've got.",
  },
  /** Vision 서버 미연결 시 */
  visionNotConnected: "Vision server not connected. Please check the connection.",
  /** 카운트다운 문구 (가위 → 바위 → 보) */
  countdown: ["SCISSORS", "ROCK", "PAPER"] as const,
  /** 손 인식 중 */
  calculating: "Calculating...",
  /** 결과 - 승리 / 패배 / 무승부 */
  result: {
    win: { hypeText: "VICTORY!", aiComment: "You got me!" },
    lose: { hypeText: "DEFEAT!", aiComment: "Better luck next time!" },
    draw: { hypeText: "IT'S A DRAW!", aiComment: "Great minds think alike!" },
  },
  /** 인식 실패/오류 시 */
  error: {
    hypeText: "ERROR",
    aiCommentFallback: "Failed to detect gesture. Please try again.",
  },
  /** 다음 라운드 준비 */
  goAgain: {
    hypeText: "GO AGAIN!",
    aiComment: "I'll get you next time.",
  },
  /** UI 라벨 (스코어, 버튼 등) */
  ui: {
    human: "HUMAN",
    aiCore: "AI CORE",
    gameTitle: "ROCK PAPER SCISSORS",
    nextRound: "NEXT ROUND",
    startGame: "START GAME",
    connecting: "CONNECTING...",
  },
  /** Python에서 받은 gesture → 화면에 표시할 문자열 (HUMAN 영역) */
  gestureDisplay: {
    rock: "ROCK",
    paper: "PAPER",
    scissors: "SCISSORS",
    /** 아직 인식 전이거나 없을 때 */
    none: "-",
  },
} as const;

/** 감지 결과 gesture → RpsChoice (Game01 전용) */
function classNameToChoice(gesture: string): RpsChoice | null {
  const n = gesture.toLowerCase().trim();
  if (n === 'rock' || n === 'stone') return 'rock';
  if (n === 'paper') return 'paper';
  if (n === 'scissors' || n === 'scissor') return 'scissors';
  return null;
}

export interface Game01PropsWithTrigger extends Game01Props {
  /** 백엔드 GAME_START 수신 시 App이 증가시켜 전달. 0 → N 되면 버튼 없이 게임 시작 */
  triggerStartFromBackend?: number;
}

const Game01: React.FC<Game01PropsWithTrigger> = ({ onGameResult, triggerStartFromBackend = 0 }) => {
  const [game, setGame] = useState<RpsGameState>({
    userChoice: null,
    aiChoice: null,
    status: 'idle',
    score: { user: 0, ai: 0 },
    lastResult: null,
    hypeText: GAME01_MESSAGES.idle.hypeText,
    aiComment: GAME01_MESSAGES.idle.aiComment,
  });

  const [hypeKey, setHypeKey] = useState(0);
  const [triggerEffect, setTriggerEffect] = useState<RpsResult | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<VisionWebSocketService | null>(null);
  const handleStartGameRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize Vision WebSocket connection (공통 Python 모듈, game_id 로 라우팅)
  useEffect(() => {
    const ws = getVisionWsService();
    wsRef.current = ws;

    ws.onConnect(() => {
      console.log('[Game01] Vision WebSocket connected');
      setWsConnected(true);
    });

    ws.onDisconnect(() => {
      console.log('[Game01] Vision WebSocket disconnected');
      setWsConnected(false);
    });

    ws.onError((error) => {
      console.error('[Game01] Vision WebSocket error:', error);
      setWsConnected(false);
    });

    if (!ws.isConnected()) {
      ws.connect().catch((error) => {
        console.error('[Game01] Failed to connect Vision WebSocket:', error);
      });
    } else {
      setWsConnected(true);
    }

    return () => {
      wsRef.current = null;
    };
  }, []);

  // handleStartGame을 ref에 동기화
  useEffect(() => {
    handleStartGameRef.current = handleStartGame;
  });

  // 백엔드 GAME_START 수신 시 App이 triggerStartFromBackend 증가 → 버튼 없이 시작
  useEffect(() => {
    if (triggerStartFromBackend > 0) {
      handleStartGameRef.current?.();
    }
  }, [triggerStartFromBackend]);

  // 승패 판정
  const determineWinner = (user: RpsChoice, ai: RpsChoice): RpsResult => {
    if (user === ai) return 'draw';
    if (
      (user === 'rock' && ai === 'scissors') ||
      (user === 'paper' && ai === 'rock') ||
      (user === 'scissors' && ai === 'paper')
    ) return 'win';
    return 'lose';
  };

  // Vision 기반 게임 시작
  const handleStartGame = async () => {
    if (!wsRef.current || !wsRef.current.isConnected()) {
      console.error('[Game01] Vision WebSocket not connected');
      setGame(prev => ({
        ...prev,
        aiComment: GAME01_MESSAGES.visionNotConnected,
      }));
      return;
    }

    if (game.status === 'hyping') return;

    setTriggerEffect(null);

    // 카운트다운 시퀀스: "가위" -> "바위" -> "보"
    const sequence = GAME01_MESSAGES.countdown.map((text) => ({ text, delay: 500 }));

    setGame(prev => ({
      ...prev,
      userChoice: null,
      status: 'hyping',
      hypeText: sequence[0].text,
      lastResult: null,
      aiChoice: null,
      aiComment: GAME01_MESSAGES.calculating,
    }));
    setHypeKey(prev => prev + 1);

    // "보" 구간에서 detection 요청
    let handGesturePromise: ReturnType<VisionWebSocketService['requestHandGesture']> | null = null;
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(r => setTimeout(r, sequence[i].delay));
      if (i < sequence.length - 1) {
        setGame(prev => ({ ...prev, hypeText: sequence[i + 1].text }));
        setHypeKey(prev => prev + 1);
        if (i + 1 === sequence.length - 1) {
          handGesturePromise = wsRef.current!.requestHandGesture({ game_id: 'GAME01' });
        }
      }
    }

    try {
      const result = await (handGesturePromise ?? wsRef.current!.requestHandGesture({ game_id: 'GAME01' }));

      if (!result.success) {
        throw new Error(result.error_message || 'Detection failed');
      }

      const userChoice = classNameToChoice(result.data.gesture);

      if (!userChoice) {
        throw new Error(`Unknown gesture: ${result.data.gesture}`);
      }

      console.log('[Game01] Detected gesture:', userChoice);

      // AI 선택 (랜덤)
      const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
      const aiChoice = choices[Math.floor(Math.random() * choices.length)];
      const gameResult = determineWinner(userChoice, aiChoice);

      // 상태 업데이트
      setGame(prev => ({
        ...prev,
        userChoice,
        status: 'result',
        aiChoice,
        lastResult: gameResult,
        score: {
          user: gameResult === 'win' ? prev.score.user + 1 : prev.score.user,
          ai: gameResult === 'lose' ? prev.score.ai + 1 : prev.score.ai,
        },
        hypeText: gameResult === 'win' ? GAME01_MESSAGES.result.win.hypeText : gameResult === 'lose' ? GAME01_MESSAGES.result.lose.hypeText : GAME01_MESSAGES.result.draw.hypeText,
        aiComment: gameResult === 'win' ? GAME01_MESSAGES.result.win.aiComment : gameResult === 'lose' ? GAME01_MESSAGES.result.lose.aiComment : GAME01_MESSAGES.result.draw.aiComment,
      }));
      setHypeKey(prev => prev + 1);
      setTriggerEffect(gameResult);

      // C++ 백엔드에 결과 전송
      onGameResult(gameResult, userChoice, aiChoice);

    } catch (error) {
      console.error('[Game01] Detection error:', error);
      setGame(prev => ({
        ...prev,
        status: 'idle',
        hypeText: GAME01_MESSAGES.error.hypeText,
        aiComment: error instanceof Error ? error.message : GAME01_MESSAGES.error.aiCommentFallback,
      }));
      setHypeKey(prev => prev + 1);
    }
  };

  // 다음 라운드
  const resetGame = () => {
    setGame(prev => ({
      ...prev,
      status: 'idle',
      userChoice: null,
      aiChoice: null,
      lastResult: null,
      hypeText: GAME01_MESSAGES.goAgain.hypeText,
      aiComment: GAME01_MESSAGES.goAgain.aiComment,
    }));
    setTriggerEffect(null);
  };

  return (
    <div className={`
      h-full w-full flex flex-col items-center justify-center text-white font-sans overflow-hidden transition-all duration-700 bg-grid-rps
      ${triggerEffect === 'lose' ? 'shake-hit' : ''}
      ${game.status === 'idle' ? 'bg-slate-950' : 'bg-slate-950/90'}
    `}>
      {/* Visual Feedback Overlays */}
      {triggerEffect === 'lose' && <div className="fixed inset-0 pointer-events-none flash-red z-[60]" />}
      {triggerEffect === 'win' && <div className="fixed inset-0 pointer-events-none flash-green z-[60]" />}
      {triggerEffect === 'win' && <Fireworks />}

      {/* Score Header */}
      <div className="absolute top-24 w-full max-w-4xl flex justify-between items-center px-16 z-50 font-scifi">
        <div className="text-center">
          <p className="text-xs text-blue-400 tracking-[0.3em] uppercase opacity-70">{GAME01_MESSAGES.ui.human}</p>
          <p className={`text-6xl font-bold text-glow-blue ${triggerEffect === 'win' ? 'animate-score-bounce' : ''}`}>
            {game.score.user}
          </p>
          <p className="mt-2 text-sm text-slate-400 tracking-wider uppercase">
            {game.userChoice ? GAME01_MESSAGES.gestureDisplay[game.userChoice] : GAME01_MESSAGES.gestureDisplay.none}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="px-8 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl mb-2">
            <p className="text-sm text-slate-400 tracking-tighter uppercase font-bold">{GAME01_MESSAGES.ui.gameTitle}</p>
          </div>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        </div>

        <div className="text-center">
          <p className="text-xs text-red-400 tracking-[0.3em] uppercase opacity-70">{GAME01_MESSAGES.ui.aiCore}</p>
          <p className={`text-6xl font-bold text-glow-red ${triggerEffect === 'lose' ? 'animate-score-bounce' : ''}`}>
            {game.score.ai}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative flex flex-col items-center justify-center w-full max-w-5xl h-full z-20 pt-16">
        {/* AI Hand Display */}
        <div className="relative z-10">
          <HandDisplay choice={game.aiChoice} status={game.status} />
        </div>

        {/* Floating Text Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 pt-24">
          <div
            key={hypeKey}
            className={`
              font-arcade transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,1)] text-center
              ${game.status === 'hyping' ? 'text-7xl md:text-[12rem] text-yellow-400 animate-text-impact text-glow-yellow' : 'text-5xl md:text-8xl'}
              ${game.status === 'result' ? 'animate-result-pop' : ''}
              ${game.status === 'result' && game.lastResult === 'win' ? 'text-green-400 text-glow-green' : ''}
              ${game.status === 'result' && game.lastResult === 'lose' ? 'text-red-500 text-glow-red' : ''}
              ${game.status === 'result' && game.lastResult === 'draw' ? 'text-blue-400 text-glow-blue' : ''}
              ${game.status === 'idle' ? 'opacity-30 tracking-widest' : ''}
            `}
          >
            {game.hypeText}
          </div>

          <div className={`
            mt-10 font-scifi text-lg italic text-white max-w-xl text-center px-10 transition-all duration-1000 delay-300
            ${game.status === 'result' ? 'opacity-100 translate-y-0 scale-110' : 'opacity-0 translate-y-10 scale-90'}
          `}>
            {game.status === 'result' && (
              <div className="bg-black/80 border border-white/20 px-8 py-4 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-white/30">
                "{game.aiComment}"
              </div>
            )}
          </div>

          {game.status === 'result' && (
            <button
              onClick={resetGame}
              className={`
                mt-12 px-16 py-5 rounded-full border-2 font-scifi text-sm tracking-[0.5em] transition-all hover:scale-110 active:scale-95 pointer-events-auto
                ${game.lastResult === 'win' ? 'bg-green-600/30 border-green-400/50 hover:bg-green-600/50 shadow-[0_0_40px_rgba(34,197,94,0.4)]' :
                  game.lastResult === 'lose' ? 'bg-red-600/30 border-red-400/50 hover:bg-red-600/50 shadow-[0_0_40px_rgba(239,68,68,0.4)]' :
                    'bg-white/10 border-white/30 hover:bg-white/20 shadow-[0_0_40px_rgba(255,255,255,0.2)]'}
              `}
            >
              {GAME01_MESSAGES.ui.nextRound}
            </button>
          )}
        </div>
      </main>

      {/* Start Button */}
      {game.status === 'idle' && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleStartGame}
            disabled={!wsConnected}
            className={`
              px-14 py-6 rounded-full border-2 font-scifi text-xl tracking-[0.3em] 
              transition-all hover:scale-110 active:scale-95
              ${wsConnected
                ? 'bg-green-600/20 border-green-500/50 hover:bg-green-600/40 shadow-[0_0_40px_rgba(34,197,94,0.3)] text-green-400'
                : 'bg-gray-600/20 border-gray-500/50 text-gray-400 cursor-not-allowed opacity-50'}
            `}
          >
            {wsConnected ? GAME01_MESSAGES.ui.startGame : GAME01_MESSAGES.ui.connecting}
          </button>
        </div>
      )}

      {/* Decorative Borders */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
    </div>
  );
};

export default Game01;
