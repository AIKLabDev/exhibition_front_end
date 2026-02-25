import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Game01.css';
import type { RpsChoice, RpsGameState, RpsResult, Game01Props } from './Game01.types';
import {
  getVisionWsService,
  type VisionWebSocketService,
} from '../../services/visionWebSocketService';
import { useGameStartFromBackend } from '../../hooks/useGameStartFromBackend';
import HandDisplay from './HandDisplay';
import Fireworks from './Fireworks';
import { GAME01_MESSAGES } from './constants';

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
  const [round, setRound] = useState(1); // 현재 라운드 (1~3, n/3 판 표시용)
  const wsRef = useRef<VisionWebSocketService | null>(null);

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

  // 게임 시작 (버튼 클릭 또는 백엔드 GAME_START 시 호출)
  const startGame = useCallback(async () => {
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
  }, [game.status, onGameResult]);

  useGameStartFromBackend(triggerStartFromBackend, startGame);

  // 다음 라운드 (다음 라운드 버튼 클릭 시: 라운드 1→2→3→1 반복)
  const resetGame = () => {
    setRound(prev => (prev >= GAME01_MESSAGES.totalRounds ? 1 : prev + 1));
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
      h-full w-full overflow-hidden transition-all duration-700
      ${triggerEffect === 'lose' ? 'shake-hit' : ''}
    `}>
      {/* Game01만 130% 비율: 씬 내부만 확대, 로고/DEBUG는 App에서 그대로 */}
      <div className={`
        absolute top-0 left-0 w-[76.92%] h-[76.92%] origin-top-left scale-[1.3] text-white font-sans
        flex flex-col items-center justify-center bg-grid-rps
        ${game.status === 'idle' ? 'bg-slate-950' : 'bg-slate-950/90'}
      `}>
        {/* Visual Feedback Overlays */}
        {triggerEffect === 'lose' && <div className="fixed inset-0 pointer-events-none flash-red z-[60]" />}
        {triggerEffect === 'win' && <div className="fixed inset-0 pointer-events-none flash-green z-[60]" />}
        {triggerEffect === 'win' && <Fireworks />}

        {/* Score Header - 상단에 더 가깝게. 1/3 판은 정중앙 고정 */}
        <div className="absolute top-2 left-0 right-0 w-full h-24 flex items-center font-scifi-kr z-50 px-16">
          {/* 좌측: 로고 영역 다음부터 중앙 전까지. 내용은 오른쪽 정렬 */}
          <div className="absolute right-[calc(50%+6rem)] left-20 flex items-center gap-6 justify-end min-w-0">
            <p className="text-lg text-slate-400 tracking-wider uppercase min-w-[3rem] shrink-0">
              {game.userChoice ? GAME01_MESSAGES.gestureDisplay[game.userChoice] : GAME01_MESSAGES.gestureDisplay.none}
            </p>
            <p className="text-3xl font-semibold text-blue-400 tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] shrink-0">
              {GAME01_MESSAGES.ui.human}
            </p>
            <p className={`text-6xl font-bold text-glow-blue shrink-0 ${triggerEffect === 'win' ? 'animate-score-bounce' : ''}`}>
              {game.score.user}
            </p>
          </div>

          {/* 중앙: 항상 화면 50%에 고정. 내용 변경에 영향받지 않음 */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10">
            <div className="px-10 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl">
              <p className="text-2xl font-bold text-white/95 tracking-tight">
                {round}/{GAME01_MESSAGES.totalRounds} 판
              </p>
            </div>
          </div>

          {/* 우측: 중앙 오른쪽부터. 점수 | AI | (대기 시) 게임 시작 버튼 */}
          <div className="absolute left-[calc(50%+6rem)] right-16 flex items-center gap-6 justify-start min-w-0">
            <p className={`text-6xl font-bold text-glow-red shrink-0 ${triggerEffect === 'lose' ? 'animate-score-bounce' : ''}`}>
              {game.score.ai}
            </p>
            <p className="text-3xl font-semibold text-red-400 tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(248,113,113,0.6)] shrink-0">
              {GAME01_MESSAGES.ui.aiCore}
            </p>
            {game.status === 'idle' && (
              <button
                onClick={startGame}
                disabled={!wsConnected}
                className={`
                ml-2 shrink-0 px-8 py-3 rounded-full border-2 font-scifi-kr text-base tracking-[0.2em]
                transition-all hover:scale-105 active:scale-95
                ${wsConnected
                    ? 'bg-green-600/20 border-green-500/50 hover:bg-green-600/40 shadow-[0_0_40px_rgba(34,197,94,0.3)] text-green-400'
                    : 'bg-gray-600/20 border-gray-500/50 text-gray-400 cursor-not-allowed opacity-50'}
              `}
              >
                {wsConnected ? GAME01_MESSAGES.ui.startGame : GAME01_MESSAGES.ui.connecting}
              </button>
            )}
            {game.status === 'result' && (
              <button
                onClick={resetGame}
                className={`
                ml-2 shrink-0 px-8 py-3 rounded-full border-2 font-scifi-kr text-base tracking-[0.2em]
                transition-all hover:scale-105 active:scale-95
                ${game.lastResult === 'win' ? 'bg-green-600/20 border-green-400/50 hover:bg-green-600/40 shadow-[0_0_40px_rgba(34,197,94,0.3)] text-green-400' :
                    game.lastResult === 'lose' ? 'bg-red-600/20 border-red-400/50 hover:bg-red-600/40 shadow-[0_0_40px_rgba(239,68,68,0.3)] text-red-400' :
                      'bg-white/10 border-white/30 hover:bg-white/20'}
              `}
              >
                {GAME01_MESSAGES.ui.nextRound}
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="relative w-full max-w-5xl h-full z-20">
          {/* 주먹 이모지: 화면 세로 정중앙에 고정 (absolute로 기준점 통일) */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <HandDisplay choice={game.aiChoice} status={game.status} lastResult={game.lastResult} />
          </div>

          {/* Floating Text Container */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
            <div
              key={hypeKey}
              className={`
              font-arcade-kr transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,1)] text-center
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

            {/* AI 코멘트("You got me!" 등): 아래쪽에 배치 */}
            <div className={`
            mt-28 font-scifi-kr text-lg italic text-white max-w-xl text-center px-10 transition-all duration-1000 delay-300
            ${game.status === 'result' ? 'opacity-100 translate-y-0 scale-110' : 'opacity-0 translate-y-10 scale-90'}
          `}>
              {game.status === 'result' && (
                <div className="bg-black/80 border border-white/20 px-8 py-4 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-white/30">
                  "{game.aiComment}"
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Decorative Borders */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
      </div>
    </div>
  );
};

export default Game01;
