import React from 'react';
import { HAND_EMOJIS } from './constants';
import type { RpsChoice, RpsGameStatus } from './Game01.types';

interface HandDisplayProps {
  choice: RpsChoice | null;
  status: RpsGameStatus;
}

const HandDisplay: React.FC<HandDisplayProps> = ({ choice, status }) => {
  const isHyping = status === 'hyping';
  const isResult = status === 'result';

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

      {/* Background energy glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[120px] transition-all duration-1000 ${isHyping ? 'bg-yellow-500/30' :
          isResult ? (choice === 'rock' ? 'bg-red-500/40' : choice === 'paper' ? 'bg-blue-500/40' : 'bg-green-500/40') :
            'bg-slate-900/10'
        }`} />

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
