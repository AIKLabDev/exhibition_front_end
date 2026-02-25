import React from 'react';
import type { RpsGameState, RpsResult } from './Game01.types';
import { GAME01_MESSAGES } from './constants';

export interface Game01ScoreHeaderProps {
  game: RpsGameState;
  round: number;
  wsConnected: boolean;
  triggerEffect: RpsResult | null;
  onStartGame: () => void;
  onNextRound: () => void;
}

/** 상단 스코어/라운드/버튼 영역. state에 따라 게임 시작 / 다음 라운드 버튼 표시 */
const Game01ScoreHeader: React.FC<Game01ScoreHeaderProps> = ({
  game,
  round,
  wsConnected,
  triggerEffect,
  onStartGame,
  onNextRound,
}) => (
  <div className="absolute top-2 left-0 right-0 w-full h-24 flex items-center font-scifi-kr z-50 px-16">
    {/* 좌측: 제스처 | HUMAN | 점수 */}
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

    {/* 중앙: 게임 시작 후에만 n/3 판 표시 (idle 시 숨김) */}
    {game.status !== 'idle' && round >= 1 && (
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10">
        <div className="px-10 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl">
          <p className="text-2xl font-bold text-white/95 tracking-tight">
            {round}/{GAME01_MESSAGES.totalRounds} 판
          </p>
        </div>
      </div>
    )}

    {/* 우측: 점수 | AI | (idle) 게임 시작 / (result) 다음 라운드 */}
    <div className="absolute left-[calc(50%+6rem)] right-16 flex items-center gap-6 justify-start min-w-0">
      <p className={`text-6xl font-bold text-glow-red shrink-0 ${triggerEffect === 'lose' ? 'animate-score-bounce' : ''}`}>
        {game.score.ai}
      </p>
      <p className="text-3xl font-semibold text-red-400 tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(248,113,113,0.6)] shrink-0">
        {GAME01_MESSAGES.ui.aiCore}
      </p>
      {game.status === 'idle' && (
        <button
          onClick={onStartGame}
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
          onClick={onNextRound}
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
);

export default Game01ScoreHeader;
