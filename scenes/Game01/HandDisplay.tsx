import React from 'react';
import { HAND_EMOJIS } from './constants';
import type { RpsChoice, RpsGameStatus, RpsResult } from './Game01.types';

interface HandDisplayProps {
  choice: RpsChoice | null;
  status: RpsGameStatus;
  /** 결과 화면일 때 이모지 배경 글로우 색: win=녹색, draw=파랑, lose=빨강 */
  lastResult?: RpsResult | null;
}

const HandDisplay: React.FC<HandDisplayProps> = ({ choice, status, lastResult }) => {
  const isHyping = status === 'hyping';
  const isResult = status === 'result';

  // 결과일 때 배경 글로우 = 게임 결과에 매칭 (win=green, draw=blue, lose=red)
  const resultGlowClass = isResult && lastResult
    ? lastResult === 'win'
      ? 'bg-green-500/40'
      : lastResult === 'draw'
        ? 'bg-blue-500/40'
        : 'bg-red-500/40'
    : 'bg-slate-900/10';

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-[50vh]">
      <div className={`
        relative text-[200px] md:text-[350px] transition-all duration-300 select-none z-10
        ${isHyping ? 'animate-rps-shake opacity-90' : ''}
        ${isResult ? 'animate-result-pop scale-125' : ''}
        ${!isHyping && !isResult ? 'opacity-20 grayscale scale-90' : ''}
      `}>
        {isHyping ? (
          <span className="drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]">✊</span>
        ) : (
          choice ? HAND_EMOJIS[choice] : '✊'
        )}
      </div>

      {/* Background energy glow - 결과 시 win=녹색, draw=파랑, lose=빨강 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[120px] transition-all duration-1000 ${isHyping ? 'bg-yellow-500/30' : isResult ? resultGlowClass : 'bg-slate-900/10'}`} />

      {/* Spark effect on result */}
      {isResult && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full bg-white/5 animate-pulse rounded-full blur-3xl"></div>
        </div>
      )}
    </div>
  );
};

export default HandDisplay;
