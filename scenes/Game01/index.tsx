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
import Game01ScoreHeader from './Game01ScoreHeader';
import Game01IdleView from './Game01IdleView';
import Game01HypingView from './Game01HypingView';
import Game01ResultView from './Game01ResultView';
import Game01TutorialView from './Game01TutorialView';
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
  const [round, setRound] = useState(0); // 0=게임 시작 전, 1~3=현재 판. 게임 시작 시마다 증가, 씬 전환 시 초기화(언마운트)
  /** 씬 진입 시마다 튜토리얼 먼저. 참관객이 바뀌므로 매번 표시 */
  const [phase, setPhase] = useState<'tutorial' | 'game'>('tutorial');
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
    // 게임 시작할 때마다 라운드 증가 (1→2→3→1)
    setRound(prev => (prev >= GAME01_MESSAGES.totalRounds ? 1 : prev + 1));

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

  // 튜토리얼 중이거나 3/3 판일 때는 백엔드 GAME_START 무시
  useGameStartFromBackend(triggerStartFromBackend, startGame, {
    onlyWhen: () => phase === 'game' && round < GAME01_MESSAGES.totalRounds,
  });

  // 다음 라운드 (idle로 돌아감. 라운드 수는 startGame 시에만 증가)
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
      h-full w-full overflow-hidden transition-all duration-700
      ${triggerEffect === 'lose' ? 'shake-hit' : ''}
    `}>
      {/* Game01만 130% 비율: 씬 내부만 확대, 로고/DEBUG는 App에서 그대로 */}
      <div className={`
        absolute top-0 left-0 w-[76.92%] h-[76.92%] origin-top-left scale-[1.3] text-white font-sans
        flex flex-col items-center justify-center bg-grid-rps
        ${phase === 'tutorial' ? 'bg-slate-950' : game.status === 'idle' ? 'bg-slate-950' : 'bg-slate-950/90'}
      `}>
        {/* 씬 진입 시마다 튜토리얼 먼저 표시. 참관객이 바뀌므로 매번 보여줌 */}
        {phase === 'tutorial' && (
          <Game01TutorialView onStart={() => setPhase('game')} />
        )}

        {phase === 'game' && (
          <>
            {/* Visual Feedback Overlays */}
            {triggerEffect === 'lose' && <div className="fixed inset-0 pointer-events-none flash-red z-[60]" />}
            {triggerEffect === 'win' && <div className="fixed inset-0 pointer-events-none flash-green z-[60]" />}
            {triggerEffect === 'win' && <Fireworks />}

            <Game01ScoreHeader
              game={game}
              round={round}
              wsConnected={wsConnected}
              triggerEffect={triggerEffect}
              onStartGame={startGame}
              onNextRound={resetGame}
            />

            {/* Main Content: HandDisplay(공통) + state별 뷰 */}
            <main className="relative w-full max-w-5xl h-full z-20">
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <HandDisplay choice={game.aiChoice} status={game.status} lastResult={game.lastResult} />
              </div>

              {game.status === 'idle' && (
                <Game01IdleView hypeText={game.hypeText} hypeKey={hypeKey} />
              )}
              {game.status === 'hyping' && (
                <Game01HypingView hypeText={game.hypeText} hypeKey={hypeKey} />
              )}
              {game.status === 'result' && (
                <Game01ResultView game={game} hypeKey={hypeKey} />
              )}
            </main>

            {/* Decorative Borders */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default Game01;
